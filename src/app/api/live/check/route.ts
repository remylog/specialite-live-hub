import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { sendLiveNotification } from '@/utils/discord';

const HOLODEX_BASE_URL = 'https://holodex.net/api/v2';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.HOLODEX_API_KEY || '';
    const headers: Record<string, string> = {
      'User-Agent': 'SpecialiteLiveHub/1.0',
    };
    if (apiKey) {
      headers['X-APIKEY'] = apiKey;
    }

    // すぺしゃりての配信中・配信予定データをHolodexから取得します
    const holodexUrl = `${HOLODEX_BASE_URL}/live?org=Specialite&limit=50`;
    const res = await fetch(holodexUrl, { headers, next: { revalidate: 0 } });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Holodex API responded with status ${res.status}: ${errorText}` },
        { status: res.status }
      );
    }

    const videos = await res.json();
    if (!Array.isArray(videos)) {
      return NextResponse.json({ error: 'Holodexから取得したデータが不正です。' }, { status: 500 });
    }

    // 登録済みのチャンネルID一覧をDBから取得します
    const dbChannels = await prisma.channel.findMany({
      select: { id: true }
    });
    const registeredChannelIds = new Set(dbChannels.map(c => c.id));

    // 配信中(live)のものだけを対象にします
    const liveVideos = videos.filter(v => v.status === 'live');
    let notifiedCount = 0;

    for (const video of liveVideos) {
      if (!video.id || !video.channel || !video.channel.id) continue;

      // 登録されていないチャンネルのライブはスキップします（コラボ相手や未登録メンバーなど）
      if (!registeredChannelIds.has(video.channel.id)) {
        continue;
      }

      // データベース上のステータスを確認します
      const existingVideo = await prisma.video.findUnique({
        where: { id: video.id }
      });

      // 新規配信開始の検知条件:
      // - データベースに存在しない
      // - もしくは、存在するがステータスが 'upcoming' である
      const isNewLive = !existingVideo || existingVideo.status === 'upcoming';

      // チャンネル情報の更新（最新のプロフィール情報などを上書き）
      await prisma.channel.update({
        where: { id: video.channel.id },
        data: {
          name: video.channel.name,
          englishName: video.channel.english_name || null,
          photo: video.channel.photo || null,
          twitter: video.channel.twitter || null,
          youtubeHandle: video.channel.yt_handle || video.channel.youtube_handle || null,
          group: video.channel.group || null,
        }
      });

      // 動画情報のUPSERT
      await prisma.video.upsert({
        where: { id: video.id },
        update: {
          title: video.title,
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

      // 新しく開始された配信であればDiscord通知を送信します
      if (isNewLive) {
        await sendLiveNotification({
          id: video.id,
          title: video.title,
          channel: {
            name: video.channel.name,
            photo: video.channel.photo
          }
        });
        notifiedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: liveVideos.length,
      notifiedCount
    });
  } catch (error) {
    console.error('Error checking live streams:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '監視処理中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
