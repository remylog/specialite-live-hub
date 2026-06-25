import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';

const DEFAULT_GROUPS = ['1期生', '2期生', '3期生', 'ゲーマーズ', '運営'];

export async function GET() {
  try {
    let groups = await prisma.group.findMany({
      orderBy: { createdAt: 'asc' }
    });

    // データベースが空の場合は、初期データとしてデフォルトグループを自動登録します
    if (groups.length === 0) {
      await prisma.group.createMany({
        data: DEFAULT_GROUPS.map(name => ({ name }))
      });
      
      groups = await prisma.group.findMany({
        orderBy: { createdAt: 'asc' }
      });
    }

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'グループ情報の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'グループ名は必須です。' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // 重複チェック
    const existing = await prisma.group.findUnique({
      where: { name: trimmedName }
    });

    if (existing) {
      return NextResponse.json({ error: 'そのグループ名は既に存在しています。' }, { status: 400 });
    }

    const created = await prisma.group.create({
      data: { name: trimmedName }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'グループの追加に失敗しました。' },
      { status: 500 }
    );
  }
}
