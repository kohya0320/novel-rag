import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

/**
 * テキストをベクトル化する
 * モデル: gemini-embedding-001 (768次元に指定)
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })
  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    outputDimensionality: 768,
  } as Parameters<typeof model.embedContent>[0])
  return result.embedding.values
}

/**
 * 小説データをベクトル化用のテキストに変換する
 */
export function buildNovelText(novel: {
  title: string
  author: string
  genre: string
  description: string
  reviews: string[]
}): string {
  return [
    `タイトル: ${novel.title}`,
    `著者: ${novel.author}`,
    `ジャンル: ${novel.genre}`,
    `あらすじ: ${novel.description}`,
    `レビュー: ${novel.reviews.join(' ')}`,
  ].join('\n')
}
