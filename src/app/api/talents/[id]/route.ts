import { NextRequest, NextResponse } from 'next/server';
import type { Channel } from '@prisma/client';
import prisma from '@/utils/db';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const channel = await prisma.channel.findUnique({
      where: { id }
    });

    if (!channel) {
      return NextResponse.json({ error: 'タレントが見つかりませんでした。' }, { status: 404 });
    }

    return NextResponse.json(mapDbChannelToResponse(channel));
  } catch (error) {
    console.error('Error fetching talent detail:', error);
    return NextResponse.json(
      { error: 'タレント情報の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const body = await request.json();
    const { name, english_name, photo, twitter, group, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '名前は必須です。' }, { status: 400 });
    }

    // 存在確認
    const existing = await prisma.channel.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: '更新対象のタレントが見つかりません。' }, { status: 404 });
    }

    const updated = await prisma.channel.update({
      where: { id },
      data: {
        name: name.trim(),
        englishName: english_name?.trim() || null,
        photo: photo?.trim() || null,
        twitter: twitter?.trim() || null,
        group: group?.trim() || null,
        description: description?.trim() || null,
      }
    });

    return NextResponse.json(mapDbChannelToResponse(updated));
  } catch (error) {
    console.error('Error updating talent:', error);
    return NextResponse.json(
      { error: 'タレント情報の更新に失敗しました。' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // 存在確認
    const existing = await prisma.channel.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: '削除対象のタレントが見つかりません。' }, { status: 404 });
    }

    // 削除（Cascadeにより関連Videoも消える）
    await prisma.channel.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'タレントを削除しました。' });
  } catch (error) {
    console.error('Error deleting talent:', error);
    return NextResponse.json(
      { error: 'タレントの削除に失敗しました。' },
      { status: 500 }
    );
  }
}
