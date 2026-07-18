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
  const result = await model.generateContent(`あなたは小説推薦の専門家です。ユーザーの要望に基づいて、検索結果の小説をおすすめ順に紹介してください。

以下のフォーマットで各小説を紹介してください（マークダウン記法は一切使わないこと）:

【タイトル】
著者名
（この要望に合っている理由と魅力を2〜3文で簡潔に）

ユーザーの要望:
「${query}」

ベクトル検索でヒットした小説:
${context}`)

  return result.response.text()
}
