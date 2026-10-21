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

export interface RecommendationResult {
  recommendation: string
  matchReasons: string[]
}

export async function generateRecommendation(
  query: string,
  novels: Novel[]
): Promise<RecommendationResult> {
  if (novels.length === 0) {
    return {
      recommendation: '条件に合致する小説が見つかりませんでした。別のキーワードでお試しください。',
      matchReasons: [],
    }
  }

  const context = novels
    .map(
      (novel, i) => `
【候補 ${i + 1}】
タイトル: ${novel.title}
著者: ${novel.author}
ジャンル: ${novel.genre}
あらすじ: ${novel.description}
`.trim()
    )
    .join('\n\n---\n\n')

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(`あなたは小説推薦の専門家です。ユーザーの要望に基づいて、各小説がなぜその検索条件に合っているかを説明してください。

以下のJSON形式のみで回答してください（マークダウン・コードブロック不使用）:
{
  "recommendation": "全体的な推薦コメント（1〜2文）",
  "matchReasons": [
    "候補1がこの検索条件に合う理由（1〜2文、あらすじを根拠にする）",
    "候補2がこの検索条件に合う理由（1〜2文、あらすじを根拠にする）"
  ]
}

matchReasonsの要素数は候補数（${novels.length}個）と同じにしてください。
あらすじに根拠がない場合は「あらすじから確認できる範囲では〜」と明記してください。

ユーザーの要望:
「${query}」

ベクトル検索でヒットした小説:
${context}`)

  const text = result.response.text().trim()

  try {
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(jsonText)
    return {
      recommendation: parsed.recommendation ?? '',
      matchReasons: Array.isArray(parsed.matchReasons) ? parsed.matchReasons : [],
    }
  } catch {
    return {
      recommendation: text,
      matchReasons: novels.map(() => ''),
    }
  }
}
