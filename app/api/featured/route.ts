import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase.rpc('get_featured_novels')

  if (error) {
    return NextResponse.json({ error: 'フィーチャー小説の取得に失敗しました' }, { status: 500 })
  }

  const GENRE_LABELS: Record<string, string> = {
    'ミステリー・サスペンス': 'ミステリー・サスペンス',
    'SF・ホラー': 'SF・ホラー',
    'ロマンス': 'ロマンス',
    '海外小説': '海外小説',
  }

  const grouped: Record<string, typeof data> = {}
  for (const novel of data ?? []) {
    const label = GENRE_LABELS[novel.genre] ?? '日本小説'
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(novel)
  }

  return NextResponse.json({ genres: grouped })
}
