import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groups, talents } = body;

    if (!Array.isArray(groups) || !Array.isArray(talents)) {
      return NextResponse.json(
        { error: '無効なデータ形式です。groupsとtalentsの配列が必要です。' },
        { status: 400 }
      );
    }

    // 途中で失敗しても中途半端な状態にならないよう、1つのトランザクションで反映する
    const clean = (v: unknown) => (typeof v === 'string' ? v.trim() || null : null);
    const operations = [];

    for (const g of groups) {
      const name = clean(g?.name);
      if (!name) continue;
      operations.push(
        prisma.group.upsert({ where: { name }, update: {}, create: { name } })
      );
    }

    for (const t of talents) {
      const id = clean(t?.id);
      const name = clean(t?.name);
      if (!id || !name) continue;

      const data = {
        name,
        englishName: clean(t.english_name),
        photo: clean(t.photo),
        twitter: clean(t.twitter),
        group: clean(t.group),
        description: clean(t.description),
      };
      operations.push(
        prisma.channel.upsert({ where: { id }, update: data, create: { id, ...data } })
      );
    }

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, message: 'インポートが完了しました。' });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'データのインポートに失敗しました。無効なJSONファイルの可能性があります。' },
      { status: 500 }
    );
  }
}
