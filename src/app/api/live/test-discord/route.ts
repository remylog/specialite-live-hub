import { NextResponse } from 'next/server';
import { sendLiveNotification } from '@/utils/discord';

export async function POST() {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'DISCORD_WEBHOOK_URL が設定されていません。.envファイルの設定を確認してください。' },
        { status: 400 }
      );
    }

    // ダミーのテスト配信用データを作成して通知を送信します
    await sendLiveNotification({
      id: 'dQw4w9WgXcQ', // テスト動画ID (Never Gonna Give You Up)
      title: '【テスト配信】Discord Webhook 連携テスト中！【すぺしゃりてライブハブ】',
      channel: {
        name: 'すぺしゃりて運営',
        photo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      }
    });

    return NextResponse.json({
      success: true,
      message: 'テスト通知を送信しました。Discordを確認してください！',
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'テスト送信中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
