import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { sendLiveNotification } from '@/utils/discord';

const HOLODEX_BASE_URL = 'https://holodex.net/api/v2';

export async function POST() {
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

    // 配信中(live)で、登録済みタレントのものだけを対象にします
    // （コラボ相手や未登録メンバーのライブはスキップ）
    const liveVideos = videos.filter(
      (v) => v.status === 'live' && v.id && v.channel?.id && registeredChannelIds.has(v.channel.id)
    );

    // 既存の動画ステータスをまとめて取得します（1本ずつ問い合わせない）
    const existingVideos = await prisma.video.findMany({
      where: { id: { in: liveVideos.map((v) => v.id) } },
      select: { id: true, status: true },
    });
    const existingStatus = new Map(existingVideos.map((v) => [v.id, v.status]));

    let notifiedCount = 0;

    for (const video of liveVideos) {
      try {
        // 新規配信開始の検知条件: DBに無い、もしくは 'upcoming' だった
        const prevStatus = existingStatus.get(video.id);
        const isNewLive = prevStatus === undefined || prevStatus === 'upcoming';

        // タレントのプロフィールは管理画面での編集値を守るため、ここでは上書きしません
        const data = {
          title: video.title,
          status: video.status,
          liveViewers: video.live_viewers || null,
          startScheduled: video.start_scheduled ? new Date(video.start_scheduled) : null,
          startActual: video.start_actual ? new Date(video.start_actual) : null,
          duration: video.duration || null,
          topicId: video.topic_id || null,
          type: video.type,
          cachedAt: new Date(),
        };
        await prisma.video.upsert({
          where: { id: video.id },
          update: data,
          create: { id: video.id, channelId: video.channel.id, ...data },
        });

        if (isNewLive) {
          await sendLiveNotification({
            id: video.id,
            title: video.title,
            channel: { name: video.channel.name, photo: video.channel.photo },
          });
          notifiedCount++;
        }
      } catch (err) {
        // 1本の失敗で残りの配信の処理を止めない
        console.error(`Error processing live video ${video.id}:`, err);
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
