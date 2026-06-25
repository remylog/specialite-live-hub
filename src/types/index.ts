export interface SubscriberHistory {
  id: string;
  channelId: string;
  subscriberCount: number;
  date: string;
}

export interface Channel {
  id: string;
  name: string;
  english_name: string;
  photo: string;
  twitter?: string;
  youtube_handle?: string;
  group?: string;
  description?: string;
  subscriber_count?: number;
  subscriber_histories?: SubscriberHistory[];
}

export interface Video {
  id: string;
  title: string;
  channel: Channel;
  status: 'live' | 'upcoming' | 'past';
  live_viewers?: number;
  start_scheduled?: string;
  start_actual?: string;
  duration?: number; // 秒単位
  topic_id?: string;
  type: 'stream' | 'clip';
}
