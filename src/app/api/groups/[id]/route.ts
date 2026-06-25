import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // 存在確認を行います
    const existing = await prisma.group.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: '削除対象のグループが見つかりません。' }, { status: 404 });
    }

    await prisma.group.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'グループを削除しました。' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'グループの削除に失敗しました。' },
      { status: 500 }
    );
  }
}
