import { NextRequest, NextResponse } from 'next/server';

// 認証が必要な管理系エンドポイントのパスパターン
const PROTECTED_PATHS: { method: string; pattern: RegExp }[] = [
  { method: 'POST', pattern: /^\/api\/talents\/sync$/ },
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
];

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

  // ADMIN_SECRET_KEY が未設定の場合は警告ログを出すが通す（開発環境の利便性）
  if (!adminKey) {
    console.warn(
      `[Auth Proxy] ADMIN_SECRET_KEY is not set. Allowing request to ${method} ${pathname} without auth. Set this env var in production.`
    );
    return NextResponse.next();
  }

  // ヘッダーからAPIキーを取得して照合
  const providedKey = request.headers.get('x-admin-key');

  if (!providedKey || providedKey !== adminKey) {
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
