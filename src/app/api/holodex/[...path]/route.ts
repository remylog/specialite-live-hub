import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/utils/db';
import { mapPrismaToHolodex } from '@/utils/mappers';

const HOLODEX_BASE_URL = 'https://holodex.net/api/v2';

// 中継を許可するHolodex APIのパス（それ以外は404）
const CHANNEL_ID_PATTERN = '[A-Za-z0-9_-]{1,64}';
const ALLOWED_PATHS: RegExp[] = [
  /^live$/,
  /^videos$/,
  new RegExp(`^channels/${CHANNEL_ID_PATTERN}$`),
  new RegExp(`^channels/${CHANNEL_ID_PATTERN}/videos$`),
];

// 中継を許可するクエリパラメータ（apiKey などクライアント指定の認証情報は受け付けない）
const ALLOWED_PARAMS = new Set(['org', 'limit', 'offset', 'status', 'type', 'channel_id', 'include', 'lang', 'max_upcoming_hours']);
// Holodex API の limit 上限は 50
const MAX_LIMIT = 50;

// DBキャッシュの有効期限。短くして新着アーカイブの反映遅れを抑える
const CACHE_TTL_MS = 30 * 60 * 1000;

interface HolodexVideo {
  id?: string;
  title: string;
  status: string;
  type: string;
  live_viewers?: number;
  start_scheduled?: string;
  start_actual?: string;
  duration?: number;
  topic_id?: string;
  channel?: { id?: string };
}

// 外部APIから取得した過去動画データをDBにまとめてキャッシュ保存する
// （プロフィール情報は管理画面で編集された値を守るため上書きしない）
async function cacheVideosToDb(videos: HolodexVideo[]) {
  try {
    const candidates = videos.filter(
      (v): v is HolodexVideo & { id: string; channel: { id: string } } => !!v?.id && !!v?.channel?.id
    );
    if (candidates.length === 0) return;

    // 登録されているタレントの動画のみ対象にする
    const registered = await prisma.channel.findMany({
      where: { id: { in: [...new Set(candidates.map((v) => v.channel.id))] } },
      select: { id: true },
    });
    const registeredIds = new Set(registered.map((c) => c.id));
    const targets = candidates.filter((v) => registeredIds.has(v.channel.id));
    if (targets.length === 0) return;

    const now = new Date();
    await prisma.$transaction(
      targets.map((video) => {
        const data = {
          title: video.title,
          channelId: video.channel.id,
          status: video.status,
          liveViewers: video.live_viewers || null,
          startScheduled: video.start_scheduled ? new Date(video.start_scheduled) : null,
          startActual: video.start_actual ? new Date(video.start_actual) : null,
          duration: video.duration || null,
          topicId: video.topic_id || null,
          type: video.type,
          cachedAt: now,
        };
        return prisma.video.upsert({
          where: { id: video.id },
          update: data,
          create: { id: video.id, ...data },
        });
      })
    );
    console.log(`[Cache Sync] Successfully cached ${targets.length} videos into database.`);
  } catch (error) {
    console.error('Error caching videos to DB:', error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const apiPath = resolvedParams.path.join('/');
    const { searchParams } = new URL(request.url);

    if (!ALLOWED_PATHS.some((pattern) => pattern.test(apiPath))) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    // 許可されたパラメータだけを引き継ぐ。limit は上限を設ける
    const holodexParams = new URLSearchParams();
    for (const [key, value] of searchParams) {
      if (ALLOWED_PARAMS.has(key)) holodexParams.append(key, value);
    }
    const limitParam = holodexParams.get('limit');
    if (limitParam !== null) {
      const limit = Math.min(Math.max(parseInt(limitParam, 10) || 0, 1), MAX_LIMIT);
      holodexParams.set('limit', String(limit));
    }

    // --- DBキャッシュ処理 ---
    const isPastStatus = holodexParams.get('status') === 'past';
    const channelVideosMatch = apiPath.match(/^channels\/([^/]+)\/videos$/);
    const isVideosPath = apiPath === 'videos';

    if (isPastStatus && (isVideosPath || channelVideosMatch)) {
      try {
        const channelId = channelVideosMatch ? channelVideosMatch[1] : holodexParams.get('channel_id') || undefined;
        const limit = Math.min(Math.max(parseInt(holodexParams.get('limit') || '12', 10) || 12, 1), MAX_LIMIT);
        const offset = Math.max(parseInt(holodexParams.get('offset') || '0', 10) || 0, 0);

        const cacheThreshold = new Date(Date.now() - CACHE_TTL_MS);
        const whereClause: Prisma.VideoWhereInput = {
          status: 'past',
          cachedAt: { gte: cacheThreshold },
        };

        if (channelId) {
          whereClause.channelId = channelId;
        }
        // channelId 指定が無い場合も、DB上の動画は必ず登録済みタレントのもの

        const cachedVideos = await prisma.video.findMany({
          where: whereClause,
          include: { channel: true },
          orderBy: { startActual: 'desc' },
          take: limit,
          skip: offset,
        });

        // 要求件数ぶんが新鮮なキャッシュで揃っている場合のみDBから返却する
        // （不足時は外部APIから取得し、新着アーカイブの取りこぼしを防ぐ）
        if (cachedVideos.length >= limit) {
          console.log(`[Cache Hit] Serving ${cachedVideos.length} videos from database for path: ${apiPath}`);
          return NextResponse.json(cachedVideos.map(mapPrismaToHolodex));
        }
      } catch (dbError) {
        console.error('Database read error, falling back to direct API fetch:', dbError);
      }
    }
    // -----------------------

    const holodexUrl = `${HOLODEX_BASE_URL}/${apiPath}${
      holodexParams.toString() ? `?${holodexParams.toString()}` : ''
    }`;

    const headers: Record<string, string> = {
      'User-Agent': 'SpecialiteLiveHub/1.0',
    };
    // 認証キーはサーバーの環境変数のみを使用する
    const apiKey = process.env.HOLODEX_API_KEY || '';
    if (apiKey) {
      headers['X-APIKEY'] = apiKey;
    }

    const res = await fetch(holodexUrl, {
      headers,
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Holodex API responded with status ${res.status}: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // 取得したデータが過去アーカイブ一覧（past）の場合、バックグラウンドでDBに保存する
    if (isPastStatus && Array.isArray(data) && data.length > 0) {
      void cacheVideosToDb(data);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Holodex proxy:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
