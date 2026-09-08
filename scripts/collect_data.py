"""
小説データ収集スクリプト
- 楽天ブックスAPIで書籍情報取得
- Geminiでベクトル化してSupabaseに保存
- リトライ機能・進捗保存対応（途中から再開可能）
"""

import os
import time
import json
import requests
from supabase import create_client
from google import genai
from google.genai import types

# === 設定 ===
RAKUTEN_APP_ID = "70e62509-14b8-4750-8f95-7cf7d8d9cd71"
RAKUTEN_ACCESS_KEY = os.environ.get("RAKUTEN_ACCESS_KEY", "pk_PCPHFwAjt3es7Q6gZfHurJeQYdGn4P72cfjRhIkNaYl")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://zcutecgacodfjkgjkjpd.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "progress.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer": "https://novel-rag.vercel.app/",
    "Origin": "https://novel-rag.vercel.app",
}

GENRE_LIST = [
    # 既存ジャンル
    ("001004001", "ミステリー・サスペンス"),
    ("001004002", "SF・ホラー"),
    ("001004009", "海外小説"),
    ("001004016", "ロマンス"),
    # 日本の小説（著者名別サブジャンル）
    ("001004008001", "日本小説・あ行"),
    ("001004008002", "日本小説・か行"),
    ("001004008003", "日本小説・さ行"),
    ("001004008004", "日本小説・た行"),
    ("001004008005", "日本小説・な行"),
    ("001004008006", "日本小説・は行"),
    ("001004008007", "日本小説・ま行"),
    ("001004008008", "日本小説・やらわ行"),
    ("001004008009", "日本小説・その他"),
]


def retry(max_attempts=4, base_wait=2):
    """指数バックオフ付きリトライデコレータ"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    wait = base_wait * (2 ** attempt)
                    print(f"    リトライ {attempt + 1}/{max_attempts - 1}: {e} ({wait}秒後)")
                    time.sleep(wait)
        return wrapper
    return decorator


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"genre_index": 0, "page": 1}


def save_progress(genre_index, page):
    with open(PROGRESS_FILE, "w") as f:
        json.dump({"genre_index": genre_index, "page": page}, f)


@retry(max_attempts=4, base_wait=2)
def get_rakuten_books(page: int, genre_id: str) -> list[dict]:
    url = "https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404"
    params = {
        "applicationId": RAKUTEN_APP_ID,
        "accessKey": RAKUTEN_ACCESS_KEY,
        "booksGenreId": genre_id,
        "hits": 30,
        "page": page,
        "formatVersion": 2,
    }
    res = requests.get(url, params=params, headers=HEADERS, timeout=15)
    if res.status_code != 200:
        raise Exception(f"APIエラー: {res.status_code}")
    return res.json().get("Items", [])


@retry(max_attempts=4, base_wait=3)
def create_embedding(client: genai.Client, text: str) -> list[float]:
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=768),
    )
    return result.embeddings[0].values


@retry(max_attempts=3, base_wait=2)
def generate_reviews(client: genai.Client, title: str, description: str) -> list[str]:
    prompt = (
        f"以下の小説について、実際の読者が書きそうな短い感想を2つ生成してください。\n"
        f"タイトル: {title}\nあらすじ: {description}\n\n"
        f"各感想は30〜60文字程度で、リアルな読者目線で書いてください。\n"
        f"出力形式: 感想を改行で区切って2行のみ出力（番号・記号不要）"
    )
    result = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
    lines = [line.strip() for line in result.text.strip().split("\n") if line.strip()]
    return lines[:2]


def build_text(book: dict, reviews: list[str]) -> str:
    return "\n".join([
        f"タイトル: {book['title']}",
        f"著者: {book['author']}",
        f"ジャンル: {book['genre']}",
        f"あらすじ: {book['description']}",
        f"レビュー: {' '.join(reviews)}",
    ])


def save_to_supabase(supabase, book: dict, embedding: list[float]) -> str:
    existing = supabase.table("novels").select("id").eq("title", book["title"]).execute()
    if existing.data:
        return "skipped"
    supabase.table("novels").insert({
        "title": book["title"],
        "author": book["author"],
        "genre": book["genre"],
        "description": book["description"],
        "reviews": book["reviews"],
        "image_url": book.get("image_url", ""),
        "embedding": embedding,
    }).execute()
    return "inserted"


def main():
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    progress = load_progress()
    start_genre = progress["genre_index"]
    start_page = progress["page"]

    total_inserted = 0
    total_skipped = 0

    for genre_index, (genre_id, genre_name) in enumerate(GENRE_LIST):
        if genre_index < start_genre:
            continue

        print(f"\n=== {genre_name} (ID: {genre_id}) ===")

        for page in range(start_page if genre_index == start_genre else 1, 100):
            print(f"  ページ {page}...")
            save_progress(genre_index, page)

            try:
                items = get_rakuten_books(page, genre_id)
            except Exception as e:
                print(f"  ページ取得失敗、スキップ: {e}")
                break

            if not items:
                break

            for item in items:
                title = item.get("title", "").strip()
                author = item.get("author", "").strip()
                description = item.get("itemCaption", "").strip()

                if not title or not description:
                    continue

                print(f"  処理中: {title}")

                image_url = item.get("largeImageUrl", "") or item.get("mediumImageUrl", "")

                reviews = generate_reviews(gemini_client, title, description[:500])

                book = {
                    "title": title,
                    "author": author,
                    "genre": genre_name,
                    "description": description[:500],
                    "reviews": reviews,
                    "image_url": image_url,
                }

                try:
                    text = build_text(book, reviews)
                    embedding = create_embedding(gemini_client, text)
                except Exception as e:
                    print(f"    埋め込みエラー（スキップ）: {e}")
                    continue

                try:
                    status = save_to_supabase(supabase, book, embedding)
                except Exception as e:
                    print(f"    保存エラー（スキップ）: {e}")
                    continue

                if status == "inserted":
                    total_inserted += 1
                    print(f"    ✓ 保存")
                else:
                    total_skipped += 1
                    print(f"    スキップ（既存）")

                time.sleep(0.3)

            time.sleep(1)

        # ジャンル完了 → 次ジャンルの先頭から
        save_progress(genre_index + 1, 1)

    # 完了したら進捗ファイル削除
    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)

    print(f"\n完了: {total_inserted}件追加、{total_skipped}件スキップ")


if __name__ == "__main__":
    main()
