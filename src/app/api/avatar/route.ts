import { NextRequest, NextResponse } from 'next/server';

// 中継を許可するホスト(任意URLの中継=オープンプロキシ化を防ぐ)
const ALLOWED_HOSTS = new Set(['yt3.ggpht.com', 'yt3.googleusercontent.com']);
const MAX_BYTES = 2 * 1024 * 1024;
const ONE_DAY = 60 * 60 * 24;
// 配信を許可する画像サイズ(px)。元画像は800pxあり、一覧では重すぎるため縮小版を使う
const ALLOWED_SIZES = [96, 160, 256, 400];

// YouTubeの画像サーバーは直リンクだと制限がかかり、表示されたりされなかったりする。
// サーバー側で取得してキャッシュし、ブラウザには自サーバーから配信する
export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('u');
  if (!target) return NextResponse.json({ error: 'u is required' }, { status: 400 });

  const requested = Number(request.nextUrl.searchParams.get('s'));
  const size = ALLOWED_SIZES.includes(requested) ? requested : 160;

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 400 });
  }

  // YouTubeの画像URLは末尾の「=s800-...」でサイズを指定できる
  url.pathname = url.pathname.replace(/=s\d+/, `=s${size}`);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SpecialiteLiveHub/1.0' },
      next: { revalidate: ONE_DAY },
      signal: AbortSignal.timeout(8000),
    });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/')) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }
    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Too large' }, { status: 502 });
    }
    return new NextResponse(body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': `public, max-age=${ONE_DAY}, stale-while-revalidate=${ONE_DAY * 7}`,
      },
    });
  } catch (error) {
    console.error('Avatar proxy error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
