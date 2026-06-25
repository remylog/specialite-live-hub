import { NextResponse } from 'next/server';
import { getNictTime } from '@/utils/time';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const nictTime = await getNictTime();
    return NextResponse.json({
      time: nictTime.toISOString(),
      timestamp: nictTime.getTime()
    });
  } catch (error) {
    console.error('Failed to get time from NICT NTP:', error);
    // エラー時はフォールバックとしてローカルのサーバー時刻を返します
    const localTime = new Date();
    return NextResponse.json({
      time: localTime.toISOString(),
      timestamp: localTime.getTime(),
      error: error instanceof Error ? error.message : 'NTP error'
    });
  }
}
