import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '削除対象のIDリストが必要です。' }, { status: 400 });
    }

    // Prismaで一括削除を実行します（Cascadeにより関連ビデオも削除されます）
    const result = await prisma.channel.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    return NextResponse.json({
      success: true,
      message: `${result.count}件のタレントを削除しました。`,
      count: result.count
    });
  } catch (error) {
    console.error('Error in bulk-delete talents:', error);
    return NextResponse.json(
      { error: 'タレントの一括削除に失敗しました。' },
      { status: 500 }
    );
  }
}
