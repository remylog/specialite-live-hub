import { NextRequest, NextResponse } from 'next/server';
import type { Channel } from '@prisma/client';
import prisma from '@/utils/db';

// DBのChannelモデルからフロントエンド向け（Holodex Channel互換）にマッピング
function mapDbChannelToResponse(c: Channel) {
  return {
    id: c.id,
    name: c.name,
    english_name: c.englishName || '',
    photo: c.photo || '',
    twitter: c.twitter || undefined,
    group: c.group || undefined,
    description: c.description || undefined,
  };
}

export async function GET() {
  try {
    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' }
    });

    const formatted = channels.map(mapDbChannelToResponse);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching talents from database:', error);
    return NextResponse.json(
      { error: 'データベースからのタレント情報取得に失敗しました。' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, english_name, photo, twitter, group, description } = body;

    if (!id || !id.trim()) {
      return NextResponse.json({ error: 'チャンネルIDは必須です。' }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '名前は必須です。' }, { status: 400 });
    }

    // 重複チェック（保存時と同じくトリムしたIDで確認する）
    const existing = await prisma.channel.findUnique({
      where: { id: id.trim() }
    });

    if (existing) {
      return NextResponse.json({ error: '指定されたチャンネルIDは既に存在しています。' }, { status: 400 });
    }

    const created = await prisma.channel.create({
      data: {
        id: id.trim(),
        name: name.trim(),
        englishName: english_name?.trim() || null,
        photo: photo?.trim() || null,
        twitter: twitter?.trim() || null,
        group: group?.trim() || null,
        description: description?.trim() || null,
      }
    });

    return NextResponse.json(mapDbChannelToResponse(created), { status: 201 });
  } catch (error) {
    console.error('Error creating talent:', error);
    return NextResponse.json(
      { error: 'タレントの登録に失敗しました。' },
      { status: 500 }
    );
  }
}
