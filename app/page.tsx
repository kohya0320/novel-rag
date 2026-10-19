import { supabase } from '@/lib/supabase'
import SearchSection from './components/SearchSection'

const RAKUTEN_AFFILIATE_ID = '56a2ff10.56251984.56a2ff11.ca76b269'

const rakutenLink = (title: string) => {
  const encoded = encodeURIComponent(`https://books.rakuten.co.jp/search/?sitem=${encodeURIComponent(title)}`)
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}`
}

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
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2 tracking-tight">小説検索 AI</h1>
          <p className="text-slate-400 text-base">
            読みたい小説の雰囲気・要素を入力すると、AIがぴったりの作品を探します
          </p>
        </div>

        {/* 検索（クライアントコンポーネント） */}
        <SearchSection featuredGenres={featuredGenres} />

        {/* ジャンル別おすすめ（サーバーサイドレンダリング） */}
        {Object.keys(featuredGenres).length > 0 && (
          <div className="space-y-10 mt-10" id="featured-section">
            <h2 className="text-sm font-semibold text-slate-400">ジャンル別おすすめ</h2>
            {Object.entries(featuredGenres).map(([genre, novels]) => (
              <div key={genre}>
                <h3 className="text-base font-bold text-white mb-3">{genre}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(novels ?? []).map((novel) => (
                    <div key={novel.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex flex-col">
                      {novel.image_url && (
                        <img
                          src={novel.image_url}
                          alt={novel.title}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      <p className="text-white text-xs font-bold leading-snug mb-1 line-clamp-2">{novel.title}</p>
                      <p className="text-slate-400 text-xs mb-1">{novel.author}</p>
                      {novel.review_average != null && novel.review_average > 0 && (
                        <p className="text-yellow-400 text-xs mb-2">
                          {'★'.repeat(Math.round(novel.review_average))}{'☆'.repeat(5 - Math.round(novel.review_average))}
                          <span className="text-slate-400 ml-1">{novel.review_average.toFixed(1)}</span>
                        </p>
                      )}
                      <a
                        href={rakutenLink(novel.title)}
                        target="_blank"
                        rel="nofollow sponsored noopener noreferrer"
                        className="mt-auto text-center bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full transition-colors"
                      >
                        楽天で購入
                      </a>
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
