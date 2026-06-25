import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/db';

const HOLODEX_BASE_URL = 'https://holodex.net/api/v2';

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      addedCount: 0,
      updatedCount: 0,
      totalCount: 0,
      message: '自動同期システムは廃止されました。'
    });
  } catch (error) {
    console.error('Error in dummy sync:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました。' },
      { status: 500 }
    );
  }
}
