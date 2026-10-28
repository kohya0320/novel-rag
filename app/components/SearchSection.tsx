'use client'

import { useState, useRef } from 'react'

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

interface FeaturedNovel {
  id: number
  title: string
  author: string
  genre: string
  description: string
  image_url?: string
  review_average?: number
  review_count?: number
}

interface SearchResult {
  novels: Novel[]
  recommendation: string
  matchReasons?: string[]
}

const EXAMPLE_QUERIES = [
  '主人公が才能を隠して学園生活を送る小説',
  '最初は弱い主人公が努力して最強になる物語',
  '伏線回収がすごくて最後に驚くミステリー',
  '読後に感動できる、余韻の残る小説',
  '仲間との成長や友情を楽しめるファンタジー',
]

const RAKUTEN_AFFILIATE_ID = '56a2ff10.56251984.56a2ff11.ca76b269'
const AMAZON_TRACKING_ID = 'kohya0320-22'

const rakutenLink = (title: string) => {
  const encoded = encodeURIComponent(`https://books.rakuten.co.jp/search/?sitem=${encodeURIComponent(title)}`)
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}`
}

const amazonLink = (title: string) =>
  `https://www.amazon.co.jp/s?k=${encodeURIComponent(title)}&tag=${AMAZON_TRACKING_ID}`

const trackEvent = (name: string, params: Record<string, string | number>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, params)
  }
}

function StarRating({ average, count }: { average: number; count?: number }) {
  const rounded = Math.round(average)
  return (
    <span className="text-xs text-slate-400">
      <span className="text-yellow-400">{'★'.repeat(rounded)}{'☆'.repeat(5 - rounded)}</span>
      {' '}{average.toFixed(1)}{count != null ? ` (${count}件)` : ''}
    </span>
  )
}

function NovelCard({ novel, index, matchReason }: { novel: Novel; index: number; matchReason?: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = novel.description.length > 100

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex gap-3">
        {/* 表紙画像 */}
        <div className="shrink-0">
          {novel.image_url ? (
            <img
              src={novel.image_url}
              alt={novel.title}
              className="w-16 h-24 object-cover rounded"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-24 bg-slate-700 rounded flex items-center justify-center text-slate-500 text-xs text-center leading-tight px-1">
              表紙<br />なし
            </div>
          )}
        </div>

        {/* 作品情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <span className="text-slate-400 text-xs mr-1">#{index + 1}</span>
              <span className="text-white font-bold text-sm leading-snug">{novel.title}</span>
              <p className="text-slate-400 text-xs mt-0.5">{novel.author} · {novel.genre}</p>
            </div>
            <span className="shrink-0 bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
              類似度 {(novel.similarity * 100).toFixed(0)}%
            </span>
          </div>

          {novel.review_average != null && novel.review_average > 0 && (
            <div className="mb-1">
              <StarRating average={novel.review_average} count={novel.review_count} />
            </div>
          )}

          {/* あらすじ */}
          <p className={`text-slate-300 text-xs leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
            {novel.description}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-400 text-xs mt-0.5 hover:text-blue-300 transition"
            >
              {expanded ? '閉じる ▲' : 'あらすじをもっと読む ▼'}
            </button>
          )}

          {/* おすすめ理由 */}
          {matchReason && (
            <div className="mt-2 bg-blue-950/60 border border-blue-800/50 rounded-lg px-3 py-2">
              <p className="text-blue-300 text-xs leading-relaxed">
                <span className="font-semibold">おすすめ理由：</span>{matchReason}
              </p>
            </div>
          )}

          {/* 購入ボタン */}
          <div className="mt-3 flex gap-2 flex-wrap">
            <a
              href={rakutenLink(novel.title)}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              onClick={() => trackEvent('rakuten_click', { event_category: 'affiliate', event_label: novel.title, value: index + 1 })}
              className="inline-block bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
            >
              楽天ブックスで確認する
            </a>
            <a
              href={amazonLink(novel.title)}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              onClick={() => trackEvent('amazon_click', { event_category: 'affiliate', event_label: novel.title, value: index + 1 })}
              className="inline-block bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
            >
              Amazonで確認する
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SearchSection({
  featuredGenres,
}: {
  featuredGenres: Record<string, FeaturedNovel[]>
}) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const avgDurationRef = useRef<number>(12)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setElapsed(null)
    setRemaining(null)
    const start = Date.now()
    const estimate = avgDurationRef.current

    trackEvent('search', { event_category: 'search', event_label: query.slice(0, 100) })

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

      if (data.novels?.length === 0) {
        trackEvent('zero_results', { event_category: 'search', event_label: query.slice(0, 100) })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      setLoading(false)
      setRemaining(null)
    }
  }

  return (
    <>
      {/* 検索フォーム */}
      <div className="bg-slate-800 rounded-2xl p-6 shadow-xl mb-6 border border-slate-700">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSearch()
          }}
          placeholder="読みたい小説の特徴を自由に入力してください"
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
          {result.novels.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
              <p className="text-slate-300 text-sm mb-2">条件に合う小説が見つかりませんでした。</p>
              <p className="text-slate-400 text-xs">別のキーワードや表現を試してみてください。</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {EXAMPLE_QUERIES.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuery(q)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-full transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-3">
                  検索結果 — {result.novels.length} 件
                </h2>
                <div className="space-y-4">
                  {result.novels.map((novel, index) => (
                    <NovelCard
                      key={novel.id}
                      novel={novel}
                      index={index}
                      matchReason={result.matchReasons?.[index]}
                    />
                  ))}
                </div>
              </div>

              {result.recommendation && (
                <div className="bg-blue-950/60 border border-blue-700 rounded-2xl p-6">
                  <h2 className="text-base font-semibold mb-3 text-blue-300">AI のおすすめコメント</h2>
                  <p className="text-slate-200 whitespace-pre-wrap leading-relaxed text-sm">
                    {result.recommendation}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
