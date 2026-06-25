import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, group } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '更新対象のIDリストが必要です。' }, { status: 400 });
    }

    // Prismaで一括所属変更を実行します
    const result = await prisma.channel.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        group: group?.trim() || null
      }
    });

    return NextResponse.json({
      success: true,
      message: `${result.count}件のタレントの所属グループを変更しました。`,
      count: result.count
    });
  } catch (error) {
    console.error('Error in bulk-group update talents:', error);
    return NextResponse.json(
      { error: 'タレントの一括グループ変更に失敗しました。' },
      { status: 500 }
    );
  }
}
