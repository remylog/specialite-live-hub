import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 管理画面の表示切り替え用。キーの有無だけを返し、値は返さない
export async function GET() {
  return NextResponse.json({
    gemini: !!process.env.GEMINI_API_KEY,
    discord: !!process.env.DISCORD_WEBHOOK_URL,
  });
}
