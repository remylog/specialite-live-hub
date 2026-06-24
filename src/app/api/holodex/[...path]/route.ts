import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';

const HOLODEX_BASE_URL = 'https://holodex.net/api/v2';

// データベースから取得したオブジェクトをHolodex APIのJSON形式にマッピングするヘルパー
function mapPrismaToHolodex(video: any) {
  return {
    id: video.id,
    title: video.title,
    status: video.status,
    live_viewers: video.liveViewers,
    start_scheduled: video.startScheduled ? video.startScheduled.toISOString() : null,
    start_actual: video.startActual ? video.startActual.toISOString() : null,
    duration: video.duration,
    topic_id: video.topicId,
    type: video.type,
    channel: {
      id: video.channel.id,
      name: video.channel.name,
      english_name: video.channel.englishName,
      photo: video.channel.photo,
      twitter: video.channel.twitter,
      youtube_handle: video.channel.youtubeHandle,
      group: video.channel.group,
      description: video.channel.description,
    }
  };
}

// 外部APIから取得した過去動画データをDBに非同期でキャッシュ保存するヘルパー
async function cacheVideosToDb(videos: any[]) {
  try {
    for (const video of videos) {
      if (!video.id || !video.channel || !video.channel.id) continue;
      
      // 1. チャンネルのUPSERT
      await prisma.channel.upsert({
        where: { id: video.channel.id },
        update: {
          name: video.channel.name,
          englishName: video.channel.english_name || null,
          photo: video.channel.photo || null,
          twitter: video.channel.twitter || null,
          youtubeHandle: video.channel.youtube_handle || null,
          group: video.channel.group || null,
          description: video.channel.description || null,
        },
        create: {
          id: video.channel.id,
          name: video.channel.name,
          englishName: video.channel.english_name || null,
          photo: video.channel.photo || null,
          twitter: video.channel.twitter || null,
          youtubeHandle: video.channel.youtube_handle || null,
          group: video.channel.group || null,
          description: video.channel.description || null,
        }
      });

      // 2. 動画のUPSERT
      await prisma.video.upsert({
        where: { id: video.id },
        update: {
          title: video.title,
          channelId: video.channel.id,
          status: video.status,
          liveViewers: video.live_viewers || null,
          startScheduled: video.start_scheduled ? new Date(video.start_scheduled) : null,
          startActual: video.start_actual ? new Date(video.start_actual) : null,
          duration: video.duration || null,
          topicId: video.topic_id || null,
          type: video.type,
          cachedAt: new Date()
        },
        create: {
          id: video.id,
          title: video.title,
          channelId: video.channel.id,
          status: video.status,
          liveViewers: video.live_viewers || null,
          startScheduled: video.start_scheduled ? new Date(video.start_scheduled) : null,
          startActual: video.start_actual ? new Date(video.start_actual) : null,
          duration: video.duration || null,
          topicId: video.topic_id || null,
          type: video.type,
          cachedAt: new Date()
        }
      });
    }
    console.log(`[Cache Sync] Successfully cached ${videos.length} videos into database.`);
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

    // クライアントからのAPIキーを取得（ヘッダー x-apikey または クエリから）
    let apiKey = request.headers.get('x-apikey') || '';
    if (!apiKey) {
      apiKey = searchParams.get('apiKey') || '';
    }

    // クライアントから提供されず、サーバーの環境変数にある場合はそれを使う
    if (!apiKey) {
      apiKey = process.env.HOLODEX_API_KEY || '';
    }

    // Holodex API のパラメータから apiKey は除く
    const holodexParams = new URLSearchParams(searchParams);
    holodexParams.delete('apiKey');

    // --- DBキャッシュ処理 ---
    const isPastStatus = searchParams.get('status') === 'past';
    const channelVideosMatch = apiPath.match(/^channels\/([^/]+)\/videos$/);
    const isVideosPath = apiPath === 'videos';

    if (isPastStatus && (isVideosPath || channelVideosMatch)) {
      try {
        const channelId = channelVideosMatch ? channelVideosMatch[1] : searchParams.get('channel_id') || undefined;
        const org = searchParams.get('org') || undefined;
        const limit = parseInt(searchParams.get('limit') || '12', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        // キャッシュ有効期限（12時間）
        const cacheThreshold = new Date(Date.now() - 12 * 60 * 60 * 1000);

        const whereClause: any = {
          status: 'past',
          cachedAt: { gte: cacheThreshold }
        };

        if (channelId) {
          whereClause.channelId = channelId;
        } else if (org === 'Specialite') {
          // DBに保存されているSpecialiteメンバーの動画のみ抽出
          const channels = await prisma.channel.findMany({
            where: {
              OR: [
                { group: { contains: '期生' } },
                { id: { startsWith: 'UC' } }
              ]
            },
            select: { id: true }
          });
          const channelIds = channels.map(c => c.id);
          if (channelIds.length > 0) {
            whereClause.channelId = { in: channelIds };
          }
        }

        const cachedVideos = await prisma.video.findMany({
          where: whereClause,
          include: { channel: true },
          orderBy: { startActual: 'desc' },
          take: limit,
          skip: offset
        });

        // キャッシュデータが存在する場合はDBから返却
        if (cachedVideos.length > 0) {
          const formattedData = cachedVideos.map(mapPrismaToHolodex);
          console.log(`[Cache Hit] Serving ${cachedVideos.length} videos from database for path: ${apiPath}`);
          return NextResponse.json(formattedData);
        }
      } catch (dbError) {
        console.error('Database read error, falling back to direct API fetch:', dbError);
      }
    }
    // -----------------------

    // キャッシュがない、またはキャッシュ無効の場合は通常通り外部APIから取得
    const holodexUrl = `${HOLODEX_BASE_URL}/${apiPath}${
      holodexParams.toString() ? `?${holodexParams.toString()}` : ''
    }`;

    const headers: Record<string, string> = {
      'User-Agent': 'SpecialiteLiveHub/1.0',
    };

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
      // 応答速度向上のため、awaitせずに非同期で保存処理を実行
      cacheVideosToDb(data);
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
