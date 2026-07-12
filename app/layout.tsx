import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '小説検索AI',
  description: '読みたい小説の雰囲気や要素を入力すると、AIがぴったりの小説を探します',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
