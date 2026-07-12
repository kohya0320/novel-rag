import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createEmbedding, buildNovelText } from '@/lib/embeddings'
import novelsData from '@/data/novels.json'

/**
 * POST /api/seed
 * novels.json のダミーデータをベクトル化して Supabase に投入する
 * 開発時に一度だけ実行する
 */
export async function POST() {
  try {
    const results = []

    for (const novel of novelsData) {
      // 既存データの確認（タイトルで重複チェック）
      const { data: existing } = await supabase
        .from('novels')
        .select('id')
        .eq('title', novel.title)
        .single()

      if (existing) {
        results.push({ title: novel.title, status: 'skipped (already exists)' })
        continue
      }

      // 小説テキストをベクトル化
      const text = buildNovelText(novel)
      const embedding = await createEmbedding(text)

      // Supabase に保存
      const { error } = await supabase.from('novels').insert({
        title: novel.title,
        author: novel.author,
        genre: novel.genre,
        description: novel.description,
        reviews: novel.reviews,
        embedding,
      })

      if (error) {
        results.push({ title: novel.title, status: `error: ${error.message}` })
      } else {
        results.push({ title: novel.title, status: 'inserted' })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'シードデータの投入に失敗しました' },
      { status: 500 }
    )
  }
}
