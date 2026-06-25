import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { generateYesterdayRecommendations } from '@/utils/gemini';

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

// GET: 保存されている昨日のおすすめ動画リストを返却する
export async function GET() {
  try {
    const recommendations = await prisma.recommendation.findMany({
      include: {
        video: {
          include: {
            channel: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formatted = recommendations.map((rec) => ({
      comment: rec.comment,
      video: mapPrismaToHolodex(rec.video),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'おすすめ動画の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// POST: 手動またはCron処理によるおすすめ情報の生成とDB更新
export async function POST() {
  try {
    const result = await generateYesterdayRecommendations();
    if (!result.success) {
      return NextResponse.json(
        { error: 'おすすめ動画の生成処理に失敗しました。APIキーまたは昨日の動画データの有無を確認してください。' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      message: `おすすめアーカイブを生成しました。件数: ${result.count}`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error in recommendation API POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'おすすめ生成処理中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
