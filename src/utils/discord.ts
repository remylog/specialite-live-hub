export async function sendLiveNotification(video: {
  id: string;
  title: string;
  channel: {
    name: string;
    photo?: string | null;
  };
}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[Discord Notification] DISCORD_WEBHOOK_URL is not set. Skipping notification.');
    return;
  }

  const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
  
  // DiscordのEmbedsオブジェクトを構築します
  const payload = {
    embeds: [
      {
        title: video.title,
        description: `${video.channel.name} さんが配信を開始しました！`,
        url: videoUrl,
        color: 16748451, // ピンク #ff8fa3
        thumbnail: video.channel.photo ? { url: video.channel.photo } : undefined,
        image: {
          url: thumbnailUrl,
        },
        fields: [
          {
            name: '配信タレント',
            value: video.channel.name,
            inline: true,
          },
          {
            name: '配信リンク',
            value: `[YouTubeで視聴する](${videoUrl})`,
            inline: true,
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'すぺしゃりてライブハブ',
        }
      }
    ]
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Discord Notification] Failed to send notification: ${res.status} ${errorText}`);
    } else {
      console.log(`[Discord Notification] Successfully sent live notification for ${video.id}`);
    }
  } catch (error) {
    console.error('[Discord Notification] Error sending notification:', error);
  }
}
