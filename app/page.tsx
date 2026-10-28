import { supabase } from '@/lib/supabase'
import SearchSection from './components/SearchSection'

const RAKUTEN_AFFILIATE_ID = '56a2ff10.56251984.56a2ff11.ca76b269'
const AMAZON_TRACKING_ID = 'kohya0320-22'

const GENRE_DESCRIPTIONS: Record<string, string> = {
  'ミステリー・サスペンス': '謎と緊張感に満ちた物語。予測不能な展開と巧みなトリックで読者を引き込む作品を集めました。',
  'SF・ホラー': '未知の科学技術や宇宙、そして恐怖を描いた作品。想像力を刺激するSFから背筋が凍るホラーまで。',
  'ロマンス': '心揺さぶる恋愛を描いた作品。ときめきと感動、切なさが詰まったロマンス小説を厳選しました。',
  '海外小説': '世界各国の名作・話題作。異文化の視点から描かれた多様な物語をお届けします。',
  '日本小説': '日本の作家による幅広い作品。現代文学から歴史小説まで、日本語の豊かな表現を楽しめます。',
}

const rakutenLink = (title: string) => {
  const encoded = encodeURIComponent(`https://books.rakuten.co.jp/search/?sitem=${encodeURIComponent(title)}`)
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}`
}

const amazonLink = (title: string) =>
  `https://www.amazon.co.jp/s?k=${encodeURIComponent(title)}&tag=${AMAZON_TRACKING_ID}`

async function getFeaturedNovels() {
  const { data } = await supabase.rpc('get_featured_novels')

  const GENRE_LABELS: Record<string, string> = {
    'ミステリー・サスペンス': 'ミステリー・サスペンス',
    'SF・ホラー': 'SF・ホラー',
    'ロマンス': 'ロマンス',
    '海外小説': '海外小説',
  }

  type FeaturedNovel = NonNullable<typeof data>[number]
  const grouped: Record<string, FeaturedNovel[]> = {}
  for (const novel of data ?? []) {
    const label = GENRE_LABELS[novel.genre] ?? '日本小説'
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(novel)
  }
  return grouped
}

export default async function Home() {
  const featuredGenres = await getFeaturedNovels()

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-12 max-w-3xl">

        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 tracking-tight">小説検索 AI</h1>
          <p className="text-slate-400 text-base">
            読みたい小説の雰囲気・要素を入力すると、AIがぴったりの作品を探します
          </p>
        </div>

        {/* サービス説明 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8 text-sm text-slate-300 leading-relaxed space-y-2">
          <p className="font-semibold text-white text-base">📚 小説検索AIとは？</p>
          <p>28,000冊以上の小説データベースをAIが解析し、あなたが読みたい本をぴったり見つけるサービスです。</p>
          <p>「主人公が天才だが隠して生活する話」「孤島で起きるミステリー」など、思い浮かんだ雰囲気やキャラクター・テーマを自由に入力するだけで、AIがデータベースから最も近い作品を提案します。</p>
          <p>ミステリー・SF・ロマンス・日本小説・海外小説など幅広いジャンルに対応しています。</p>
        </div>

        {/* 検索（クライアントコンポーネント） */}
        <SearchSection featuredGenres={featuredGenres} />

        {/* ジャンル別おすすめ（サーバーサイドレンダリング） */}
        {Object.keys(featuredGenres).length > 0 && (
          <div className="space-y-10 mt-10" id="featured-section">
            <h2 className="text-lg font-bold text-white">ジャンル別おすすめ</h2>
            {Object.entries(featuredGenres).map(([genre, novels]) => (
              <div key={genre}>
                <h3 className="text-base font-bold text-white mb-1">{genre}</h3>
                <p className="text-slate-400 text-xs mb-3">{GENRE_DESCRIPTIONS[genre] ?? ''}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {(novels ?? []).map((novel) => (
                    <div key={novel.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex gap-3">
                      {novel.image_url ? (
                        <img
                          src={novel.image_url}
                          alt={novel.title}
                          className="w-16 h-24 object-cover rounded shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-slate-700 rounded shrink-0 flex items-center justify-center text-slate-500 text-xs text-center leading-tight px-1">
                          表紙<br />なし
                        </div>
                      )}
                      <div className="flex flex-col flex-1 min-w-0">
                        <p className="text-white text-sm font-bold leading-snug mb-1 line-clamp-2">{novel.title}</p>
                        <p className="text-slate-400 text-xs mb-1">{novel.author}</p>
                        {novel.review_average != null && novel.review_average > 0 && (
                          <p className="text-yellow-400 text-xs mb-1">
                            {'★'.repeat(Math.round(novel.review_average))}{'☆'.repeat(5 - Math.round(novel.review_average))}
                            <span className="text-slate-400 ml-1">{novel.review_average.toFixed(1)}</span>
                          </p>
                        )}
                        <p className="text-slate-300 text-xs leading-relaxed mb-2 line-clamp-3">{novel.description}</p>
                        <div className="mt-auto flex flex-col gap-1">
                          <a
                            href={rakutenLink(novel.title)}
                            target="_blank"
                            rel="nofollow sponsored noopener noreferrer"
                            className="text-center bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full transition-colors"
                          >
                            楽天ブックスで確認する
                          </a>
                          <a
                            href={amazonLink(novel.title)}
                            target="_blank"
                            rel="nofollow sponsored noopener noreferrer"
                            className="text-center bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xs font-semibold px-2 py-1 rounded-full transition-colors"
                          >
                            Amazonで確認する
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
      <footer className="text-center pb-8 text-slate-500 text-xs">
        <a href="/privacy" className="hover:text-slate-300 transition">プライバシーポリシー</a>
      </footer>
    </main>
  )
}
