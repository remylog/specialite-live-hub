import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { generateYesterdayRecommendations } from '@/utils/gemini';
import { mapPrismaToHolodex } from '@/utils/mappers';

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
