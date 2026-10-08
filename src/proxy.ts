import { NextRequest, NextResponse } from 'next/server';

// 認証が必要な管理系エンドポイントのパスパターン
const PROTECTED_PATHS: { method: string; pattern: RegExp }[] = [
  { method: 'POST', pattern: /^\/api\/talents\/bulk-delete$/ },
  { method: 'PUT',  pattern: /^\/api\/talents\/bulk-group$/ },
  { method: 'POST', pattern: /^\/api\/talents$/ },
  { method: 'PUT',  pattern: /^\/api\/talents\/[^/]+$/ },
  { method: 'DELETE', pattern: /^\/api\/talents\/[^/]+$/ },
  { method: 'GET',  pattern: /^\/api\/talents\/export$/ },
  { method: 'POST', pattern: /^\/api\/talents\/import$/ },
  { method: 'POST', pattern: /^\/api\/groups$/ },
  { method: 'DELETE', pattern: /^\/api\/groups\/[^/]+$/ },
  { method: 'POST', pattern: /^\/api\/recommend$/ },
  { method: 'GET', pattern: /^\/api\/recommend\/logs$/ },
  { method: 'DELETE', pattern: /^\/api\/recommend\/logs$/ },
  { method: 'POST', pattern: /^\/api\/live\/test-discord$/ },
  { method: 'POST', pattern: /^\/api\/live\/check$/ },
];

// 文字列の定数時間比較（タイミング攻撃対策）
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 保護対象エンドポイントか確認
  const isProtected = PROTECTED_PATHS.some(
    (p) => p.method === method && p.pattern.test(pathname)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // 環境変数によって管理者キー認証をスキップ（無効化）する場合はパス
  if (
    process.env.BYPASS_ADMIN_AUTH === 'true' ||
    process.env.NEXT_PUBLIC_BYPASS_ADMIN_AUTH === 'true'
  ) {
    return NextResponse.next();
  }

  const adminKey = process.env.ADMIN_SECRET_KEY;

  // ADMIN_SECRET_KEY が未設定の場合は拒否する（フェイルクローズ）
  // 認証を無効にしたい場合は BYPASS_ADMIN_AUTH=true を明示的に設定すること
  if (!adminKey) {
    console.error(
      `[Auth Proxy] ADMIN_SECRET_KEY is not set. Rejecting ${method} ${pathname}. Set ADMIN_SECRET_KEY, or BYPASS_ADMIN_AUTH=true if protected by an upstream proxy.`
    );
    return NextResponse.json(
      { error: 'サーバー側で ADMIN_SECRET_KEY が設定されていません。' },
      { status: 503 }
    );
  }

  // ヘッダーからAPIキーを取得して照合
  const providedKey = request.headers.get('x-admin-key');

  if (!providedKey || !safeEqual(providedKey, adminKey)) {
    return NextResponse.json(
      { error: '認証が必要です。x-admin-key ヘッダーに正しいキーを指定してください。' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
