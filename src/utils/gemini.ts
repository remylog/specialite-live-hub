import prisma from './db';

// Gemini API のエンドポイントとモデル設定
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface RecommendedVideoResult {
  videoId: string;
  comment: string;
}

async function saveLog(status: 'success' | 'failed', message: string, count: number = 0) {
  try {
    await prisma.geminiLog.create({
      data: { status, message, count },
    });
  } catch (error) {
    console.error('Failed to save Gemini log to DB:', error);
  }
}

export async function generateYesterdayRecommendations(): Promise<{ success: boolean; count: number }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const msg = 'GEMINI_API_KEYが設定されていません。AIおすすめ生成処理をスキップしました。';
      console.warn(`[Gemini Sync] ${msg}`);
      await saveLog('failed', msg, 0);
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
      const msg = '候補となる昨日の配信動画が見つかりませんでした。';
      console.log(`[Gemini Sync] ${msg}`);
      await saveLog('success', msg, 0);
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

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // URLに載せるとログやエラー文に残るため、ヘッダーで渡す
        'x-goog-api-key': apiKey,
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
      const msg = 'Geminiの返却したおすすめデータが空、または無効なフォーマットです。';
      console.warn(`[Gemini Sync] ${msg}`);
      await saveLog('failed', msg, 0);
      return { success: false, count: 0 };
    }

    // 実在する動画のみに絞り込む
    const videoIds = recommendations.map((rec) => rec.videoId);
    const existing = await prisma.video.findMany({
      where: { id: { in: videoIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((v) => v.id));
    const seen = new Set<string>();
    const validRecs = recommendations.filter((rec) => {
      if (!existingIds.has(rec.videoId) || seen.has(rec.videoId)) {
        console.warn(`[Gemini Sync] Video ID ${rec.videoId} selected by Gemini is not usable (missing in DB or duplicated).`);
        return false;
      }
      seen.add(rec.videoId);
      return true;
    });

    if (validRecs.length === 0) {
      const msg = 'Geminiが選んだ動画がDBに存在しないため、既存のおすすめを維持しました。';
      console.warn(`[Gemini Sync] ${msg}`);
      await saveLog('failed', msg, 0);
      return { success: false, count: 0 };
    }

    // 入れ替えはトランザクションで行い、途中失敗時に既存のおすすめが消えないようにする
    await prisma.$transaction([
      prisma.recommendation.deleteMany({}),
      prisma.recommendation.createMany({
        data: validRecs.map((rec) => ({ videoId: rec.videoId, comment: rec.comment })),
      }),
    ]);
    const registeredCount = validRecs.length;

    const msg = `おすすめアーカイブを生成しました。件数: ${registeredCount}`;
    console.log(`[Gemini Sync] ${msg}`);
    await saveLog('success', msg, registeredCount);
    return { success: true, count: registeredCount };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '予期せぬエラーが発生しました。';
    console.error('Error generating recommendations via Gemini:', error);
    await saveLog('failed', `エラーが発生しました: ${errorMsg}`, 0);
    return { success: false, count: 0 };
  }
}

