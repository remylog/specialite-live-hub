export interface Channel {
  id: string;
  name: string;
  english_name: string;
  photo: string;
  twitter?: string;
  group?: string;
  description?: string;
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
