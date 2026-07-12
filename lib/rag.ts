import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface Novel {
  id: number
  title: string
  author: string
  genre: string
  description: string
  reviews: string[]
  similarity: number
}

/**
 * 検索でヒットした小説情報をコンテキストにして、
 * Gemini がユーザーの要望に合ったおすすめを生成する
 */
export async function generateRecommendation(
  query: string,
  novels: Novel[]
): Promise<string> {
  if (novels.length === 0) {
    return '条件に合致する小説が見つかりませんでした。別のキーワードでお試しください。'
  }

  const context = novels
    .map(
      (novel, i) => `
【候補 ${i + 1}】
タイトル: ${novel.title}
著者: ${novel.author}
ジャンル: ${novel.genre}
あらすじ: ${novel.description}
レビュー抜粋:
${novel.reviews.slice(0, 2).map((r) => `・${r}`).join('\n')}
類似度スコア: ${(novel.similarity * 100).toFixed(1)}%
`.trim()
    )
    .join('\n\n---\n\n')

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(`あなたは小説推薦の専門家です。ユーザーの要望に基づいて、検索結果の小説を分析し、おすすめを日本語で説明してください。

ユーザーの要望:
「${query}」

ベクトル検索でヒットした小説:
${context}

上記の小説について、ユーザーの要望にどう合致しているか説明しながら、おすすめ順に紹介してください。各小説の魅力と、なぜこの要望に合っているかを簡潔に添えてください。`)

  return result.response.text()
}
