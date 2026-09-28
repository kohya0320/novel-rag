export default function Privacy() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. 基本方針</h2>
            <p>
              小説検索AI（以下「当サイト」）は、ユーザーの個人情報の保護を重要と考え、適切な管理・保護に努めます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. 収集する情報</h2>
            <p>当サイトでは、以下の情報を収集する場合があります。</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>検索クエリ（入力テキスト）</li>
              <li>アクセスログ（IPアドレス、ブラウザ情報、参照元URLなど）</li>
              <li>Cookieによる情報</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Google AdSense について</h2>
            <p>
              当サイトはGoogle AdSenseを利用しています。GoogleはCookieを使用して、ユーザーの興味に基づいた広告を配信します。
              Googleによる広告Cookieの使用はGoogleのプライバシーポリシーに基づきます。
              ユーザーはGoogleの広告設定ページでパーソナライズ広告を無効にできます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. アフィリエイトについて</h2>
            <p>
              当サイトは楽天アフィリエイト・Amazonアソシエイトに参加しています。
              リンク経由で商品をご購入いただいた場合、当サイトに紹介料が支払われることがあります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Cookieについて</h2>
            <p>
              当サイトはCookieを使用しています。Cookieはブラウザの設定から無効にすることができますが、
              一部のサービスが正常に動作しなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. 第三者への提供</h2>
            <p>
              当サイトは法令に基づく場合を除き、収集した情報を第三者に提供することはありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. プライバシーポリシーの変更</h2>
            <p>
              当サイトは必要に応じて本ポリシーを変更することがあります。変更後のポリシーはこのページに掲載します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. お問い合わせ</h2>
            <p>
              プライバシーポリシーに関するお問い合わせは、サイト運営者までご連絡ください。
            </p>
          </section>
        </div>

        <div className="mt-10">
          <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">← トップページに戻る</a>
        </div>
      </div>
    </main>
  )
}
