import prisma from './db';

// Gemini API のエンドポイントとモデル設定
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface RecommendedVideoResult {
  videoId: string;
  comment: string;
}

export async function generateYesterdayRecommendations(): Promise<{ success: boolean; count: number }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Gemini Sync] GEMINI_API_KEY is not defined. Skipping AI recommendation generation.');
      return { success: false, count: 0 };
    }

    // 1日前（過去24時間〜48時間前）のアーカイブ動画をDBから抽出します
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // 日時フィールドがない過去動画のためのフォールバック処理を含めたクエリ
    const candidateVideos = await prisma.video.findMany({
      where: {
        status: 'past',
        OR: [
          {
            startActual: {
              gte: twoDaysAgo,
              lte: oneDayAgo,
            },
          },
          {
            startScheduled: {
              gte: twoDaysAgo,
              lte: oneDayAgo,
            },
          },
          // 開始時間情報がない場合は cachedAt もしくは制限を少し緩めて直近の動画を抽出対象にします
          {
            startActual: null,
            startScheduled: null,
            cachedAt: {
              gte: twoDaysAgo,
            },
          },
        ],
      },
      include: {
        channel: true,
      },
      orderBy: {
        cachedAt: 'desc',
      },
      take: 15,
    });


    if (candidateVideos.length === 0) {
      console.log('[Gemini Sync] No candidate videos found from yesterday.');
      return { success: true, count: 0 };
    }

    // AIへ送る配信用テキストリストを作成
    const videoListString = candidateVideos
      .map((v, i) => `[Index: ${i}] ID: ${v.id}, Title: "${v.title}", Streamer: "${v.channel.name}"`)
      .join('\n');

    const prompt = `
あなたは配信視聴プラットフォームの魅力的なAIナビゲーターです。
昨日のアーカイブ配信動画リストから、視聴者に特におすすめしたい動画を「最大3つ」選んでください。
選定にあたっては、様々なライバーが選ばれるように配慮し、かつタイトルから面白そうな企画や雑談、記念配信などを優先してください。

各動画に対して、その動画を見たくなるような魅力的なキャッチコピー・見どころ紹介（日本語で50文字程度。で強調を意味する記号は絶対に使わないこと）を添えてください。

出力フォーマットは必ず以下のJSON形式にしてください。余計なマークダウン解説や\`\`\`jsonブロックなどは一切含めず、純粋なJSON文字列のみを返却してください。

[
  {
    "videoId": "動画のID",
    "comment": "魅力的な紹介文（50文字程度。太字などの装飾記号は含まないこと）"
  }
]

動画リスト:
${videoListString}
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API responded with status ${response.status}: ${errorText}`);
    }

    const resJson = await response.json();
    const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Gemini API returned an empty response.');
    }

    // JSONのパース
    const recommendations: RecommendedVideoResult[] = JSON.parse(responseText.trim());

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      console.warn('[Gemini Sync] Gemini returned no recommendations or invalid format.');
      return { success: false, count: 0 };
    }

    // 既存のおすすめキャッシュを一旦全削除
    await prisma.recommendation.deleteMany({});

    // 抽出されたおすすめ動画をDBへ登録
    let registeredCount = 0;
    for (const rec of recommendations) {
      // 該当動画が本当に存在するかチェック
      const videoExists = await prisma.video.findUnique({
        where: { id: rec.videoId },
      });

      if (videoExists) {
        await prisma.recommendation.create({
          data: {
            videoId: rec.videoId,
            comment: rec.comment,
          },
        });
        registeredCount++;
      } else {
        console.warn(`[Gemini Sync] Video ID ${rec.videoId} selected by Gemini does not exist in DB.`);
      }
    }

    console.log(`[Gemini Sync] Generated and saved ${registeredCount} recommendations.`);
    return { success: true, count: registeredCount };
  } catch (error) {
    console.error('Error generating recommendations via Gemini:', error);
    return { success: false, count: 0 };
  }
}
