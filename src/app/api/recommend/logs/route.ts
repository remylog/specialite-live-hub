import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET() {
  try {
    const logs = await prisma.geminiLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching gemini logs:', error);
    return NextResponse.json(
      { error: 'ログの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await prisma.geminiLog.deleteMany({});
    return NextResponse.json({ success: true, message: 'ログをクリアしました。' });
  } catch (error) {
    console.error('Error deleting gemini logs:', error);
    return NextResponse.json(
      { error: 'ログの削除に失敗しました。' },
      { status: 500 }
    );
  }
}
