"""
既存データに image_url / review_average / review_count を追加するスクリプト
楽天ブックスAPIでタイトル検索して情報を取得し、Supabaseを更新する
"""

import os
import time
import requests
from supabase import create_client

RAKUTEN_APP_ID = "70e62509-14b8-4750-8f95-7cf7d8d9cd71"
RAKUTEN_ACCESS_KEY = os.environ.get("RAKUTEN_ACCESS_KEY", "pk_PCPHFwAjt3es7Q6gZfHurJeQYdGn4P72cfjRhIkNaYl")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://zcutecgacodfjkgjkjpd.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")


def search_rakuten(title: str) -> dict | None:
    url = "https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404"
    params = {
        "applicationId": RAKUTEN_APP_ID,
        "accessKey": RAKUTEN_ACCESS_KEY,
        "title": title,
        "hits": 1,
        "formatVersion": 2,
    }
    try:
        res = requests.get(url, params=params, timeout=10)
        if res.status_code != 200:
            return None
        items = res.json().get("Items", [])
        return items[0] if items else None
    except Exception:
        return None


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # image_urlがNULLのレコードのみ対象
    response = supabase.table("novels").select("id, title").is_("image_url", "null").execute()
    novels = response.data
    print(f"更新対象: {len(novels)}件")

    updated = 0
    for i, novel in enumerate(novels):
        item = search_rakuten(novel["title"])
        if item:
            image_url = item.get("largeImageUrl", "") or item.get("mediumImageUrl", "")
            review_average = float(item.get("reviewAverage", 0) or 0)
            review_count = int(item.get("reviewCount", 0) or 0)
            supabase.table("novels").update({
                "image_url": image_url,
                "review_average": review_average,
                "review_count": review_count,
            }).eq("id", novel["id"]).execute()
            updated += 1

        if (i + 1) % 100 == 0:
            print(f"  {i + 1}/{len(novels)}件処理済み")

        time.sleep(0.5)

    print(f"完了: {updated}件更新")


if __name__ == "__main__":
    main()
