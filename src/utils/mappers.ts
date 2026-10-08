import type { Channel, Video } from '@prisma/client';

type VideoWithChannel = Video & { channel: Channel };

// データベースから取得したオブジェクトをHolodex APIのJSON形式にマッピングする
export function mapPrismaToHolodex(video: VideoWithChannel) {
  return {
    id: video.id,
    title: video.title,
    status: video.status,
    live_viewers: video.liveViewers,
    start_scheduled: video.startScheduled ? video.startScheduled.toISOString() : null,
    start_actual: video.startActual ? video.startActual.toISOString() : null,
    duration: video.duration,
    topic_id: video.topicId,
    type: video.type,
    channel: {
      id: video.channel.id,
      name: video.channel.name,
      english_name: video.channel.englishName,
      photo: video.channel.photo,
      twitter: video.channel.twitter,
      youtube_handle: video.channel.youtubeHandle,
      group: video.channel.group,
      description: video.channel.description,
    },
  };
}
