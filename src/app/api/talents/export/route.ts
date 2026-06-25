import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      orderBy: { name: 'asc' },
    });

    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // フロントエンドやインポートで扱いやすい形式でマッピング
    const formattedChannels = channels.map((c) => ({
      id: c.id,
      name: c.name,
      english_name: c.englishName || '',
      photo: c.photo || '',
      twitter: c.twitter || '',
      youtube_handle: c.youtubeHandle || '',
      group: c.group || '',
      description: c.description || '',
    }));

    const formattedGroups = groups.map((g) => ({
      id: g.id,
      name: g.name,
    }));

    return NextResponse.json({
      groups: formattedGroups,
      talents: formattedChannels,
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'データのエクスポートに失敗しました。' },
      { status: 500 }
    );
  }
}
