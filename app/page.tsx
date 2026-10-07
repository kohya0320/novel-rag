'use client'

import { useState, useEffect, useRef } from 'react'

interface Novel {
  id: number
  title: string
  author: string
  genre: string
  description: string
  image_url?: string
  review_average?: number
  review_count?: number
  similarity: number
}

interface FeaturedGenres {
  [genre: string]: Omit<Novel, 'similarity'>[]
}

interface SearchResult {
  novels: Novel[]
  recommendation: string
}

const EXAMPLE_QUERIES = [
  '主人公が天才だが隠して生活する小説',
  '閉鎖的な孤島で起きる密室殺人ミステリー',
  'タイムリープを繰り返して恋人を救おうとするSF',
  '努力と才能の葛藤を描いた青春スポーツ小説',
]

const RAKUTEN_AFFILIATE_ID = '56a2ff10.56251984.56a2ff11.ca76b269'

const rakutenLink = (title: string) => {
  const encoded = encodeURIComponent(`https://books.rakuten.co.jp/search/?sitem=${encodeURIComponent(title)}`)
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}`
}

const stripMarkdown = (text: string) =>
  text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\s*:\s*/gm, '')

export default function Home() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [featured, setFeatured] = useState<FeaturedGenres | null>(null)
  const avgDurationRef = useRef<number>(12)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/featured')
      .then(r => r.json())
      .then(d => setFeatured(d.genres))
      .catch(() => {})
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setElapsed(null)
    setRemaining(null)
    const start = Date.now()
    const estimate = avgDurationRef.current

    timerRef.current = setInterval(() => {
      const passed = (Date.now() - start) / 1000
      const rem = Math.max(0, estimate - passed)
      setRemaining(rem)
    }, 200)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '検索に失敗しました')
      const actual = (Date.now() - start) / 1000
      avgDurationRef.current = actual
      setResult(data)
      setElapsed(actual)
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      setLoading(false)
      setRemaining(null)
    }
  }

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

        {/* 検索フォーム */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl mb-6 border border-slate-700">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSearch()
            }}
            placeholder="例：主人公が天才だが隠して生活する小説"
            className="w-full bg-slate-700 text-white rounded-xl p-4 text-base resize-none h-24 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <div className="flex gap-2 mt-3 flex-wrap">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-full transition"
              >
                {q}
              </button>
            ))}
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-base"
          >
            {loading
              ? remaining !== null && remaining > 0
                ? `検索中... 残り約${Math.ceil(remaining)}秒`
                : '検索中... もうすぐ完了'
              : '小説を探す (Cmd+Enter)'}
          </button>
          {elapsed !== null && (
            <p className="text-slate-500 text-xs text-right mt-2">検索時間: {elapsed.toFixed(1)}秒</p>
          )}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 mb-6 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* 検索結果 */}
        {result && (
          <div className="space-y-6">
            {/* 小説カード一覧 */}
            <div>
              <h2 className="text-sm font-semibold text-slate-400 mb-3">
                検索結果 — {result.novels.length} 件
              </h2>
              <div className="space-y-4">
                {result.novels.map((novel, index) => (
                  <div
                    key={novel.id}
                    className="bg-slate-800 rounded-xl p-5 border border-slate-700"
                  >
                    <div className="flex gap-4 mb-3">
                      {novel.image_url && (
                        <img
                          src={novel.image_url}
                          alt={novel.title}
                          className="w-16 h-24 object-cover rounded shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <span className="text-slate-400 text-xs mr-2">#{index + 1}</span>
                            <span className="text-lg font-bold text-white">{novel.title}</span>
                            <p className="text-slate-300 text-sm mt-0.5">
                              {novel.author}・{novel.genre}
                            </p>
                          </div>
                          <span className="shrink-0 bg-blue-600/80 text-xs px-2.5 py-1 rounded-full font-medium">
                            {(novel.similarity * 100).toFixed(0)}% 一致
                          </span>
                        </div>
                        <p className="text-slate-100 text-sm leading-relaxed">
                          {novel.description}
                        </p>
                      </div>
                    </div>
                    {novel.review_average != null && novel.review_average > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-400 text-sm">
                          {'★'.repeat(Math.round(novel.review_average))}{'☆'.repeat(5 - Math.round(novel.review_average))}
                        </span>
                        <span className="text-slate-300 text-xs">
                          {novel.review_average.toFixed(1)}
                          {novel.review_count != null && ` (${novel.review_count}件)`}
                        </span>
                      </div>
                    )}
                    <a
                      href={rakutenLink(novel.title)}
                      target="_blank"
                      rel="nofollow sponsored noopener noreferrer"
                      className="mt-2 inline-block bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
                    >
                      楽天ブックスで購入
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* AI推薦文 */}
            <div className="bg-blue-950/60 border border-blue-700 rounded-2xl p-6">
              <h2 className="text-base font-semibold mb-3 text-blue-300">AI のおすすめコメント</h2>
              <p className="text-slate-200 whitespace-pre-wrap leading-relaxed text-sm">
                {stripMarkdown(result.recommendation)}
              </p>
            </div>
          </div>
        )}
      </div>
        {/* ジャンル別おすすめ */}
        {!result && featured && (
          <div className="space-y-10 mt-4">
            <h2 className="text-sm font-semibold text-slate-400">ジャンル別おすすめ</h2>
            {Object.entries(featured).map(([genre, novels]) => (
              <div key={genre}>
                <h3 className="text-base font-bold text-white mb-3">{genre}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {novels.map((novel) => (
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
