import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createEmbedding } from '@/lib/embeddings'
import { generateRecommendation, Novel } from '@/lib/rag'

/**
 * POST /api/search
 * body: { query: string }
 * ユーザーの入力をベクトル化 → Supabase でベクトル検索 → Claude で推薦文生成
 */
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: '検索クエリを入力してください' },
        { status: 400 }
      )
    }

    // 1. クエリをベクトル化
    const queryEmbedding = await createEmbedding(query.trim())

    console.log('Embedding dimension:', queryEmbedding.length)

    // 2. Supabase でベクトル類似検索
    const { data: novels, error } = await supabase.rpc('match_novels', {
      query_embedding: queryEmbedding,
      match_threshold: 0.0,
      match_count: 5,
    })

    console.log('RPC result:', { novels, error })
    if (error) {
      console.error('Vector search error:', error)
      return NextResponse.json(
        { error: 'ベクトル検索に失敗しました' },
        { status: 500 }
      )
    }

    const novelResults = (novels ?? []) as Novel[]

    // 3. Claude で推薦文を生成（RAG）
    const recommendation = await generateRecommendation(query, novelResults)

    return NextResponse.json({
      novels: novelResults,
      recommendation,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: '検索中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
