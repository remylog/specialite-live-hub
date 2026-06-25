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

    // 1. 所属グループのインポート (upsert)
    for (const g of groups) {
      if (!g.name || !g.name.trim()) continue;
      const nameCleaned = g.name.trim();
      await prisma.group.upsert({
        where: { name: nameCleaned },
        update: {},
        create: { name: nameCleaned },
      });
    }

    // 2. タレント情報のインポート (upsert)
    for (const t of talents) {
      if (!t.id || !t.id.trim() || !t.name || !t.name.trim()) continue;
      const idCleaned = t.id.trim();
      const nameCleaned = t.name.trim();

      await prisma.channel.upsert({
        where: { id: idCleaned },
        update: {
          name: nameCleaned,
          englishName: t.english_name?.trim() || null,
          photo: t.photo?.trim() || null,
          twitter: t.twitter?.trim() || null,
          youtubeHandle: t.youtube_handle?.trim() || null,
          group: t.group?.trim() || null,
          description: t.description?.trim() || null,
        },
        create: {
          id: idCleaned,
          name: nameCleaned,
          englishName: t.english_name?.trim() || null,
          photo: t.photo?.trim() || null,
          twitter: t.twitter?.trim() || null,
          youtubeHandle: t.youtube_handle?.trim() || null,
          group: t.group?.trim() || null,
          description: t.description?.trim() || null,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'インポートが完了しました。' });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'データのインポートに失敗しました。無効なJSONファイルの可能性があります。' },
      { status: 500 }
    );
  }
}
