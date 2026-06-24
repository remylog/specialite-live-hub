import { Channel, Video } from '@/types';

// LocalStorageのキー
const FAVORITES_STORAGE_KEY = 'specialite_hub_favorites';

// お気に入りタレントの管理
export function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function toggleFavorite(channelId: string): string[] {
  if (typeof window === 'undefined') return [];
  const favorites = getFavorites();
  const index = favorites.indexOf(channelId);
  if (index === -1) {
    favorites.push(channelId);
  } else {
    favorites.splice(index, 1);
  }
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  return favorites;
}

// API共通呼び出し関数
async function fetchFromProxy<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const url = `/api/holodex/${path}${query ? `?${query}` : ''}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// タレント一覧を取得
export async function getTalents(): Promise<Channel[]> {
  try {
    const res = await fetch('/api/talents');
    if (!res.ok) {
      throw new Error(`Failed to fetch from local API: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch talents from local API', error);
    return [];
  }
}

// 配信中・配信予定の動画を取得
export async function getLiveAndUpcoming(): Promise<{ live: Video[]; upcoming: Video[] }> {
  try {
    // status: live, upcoming を取得
    const videos = await fetchFromProxy<Video[]>('live', {
      org: 'Specialite',
      limit: '50'
    });

    const live = videos.filter(v => v.status === 'live');
    const upcoming = videos.filter(v => v.status === 'upcoming');

    // 近い順にソート
    upcoming.sort((a, b) => {
      const timeA = new Date(a.start_scheduled || '').getTime();
      const timeB = new Date(b.start_scheduled || '').getTime();
      return timeA - timeB;
    });

    return { live, upcoming };
  } catch (error) {
    console.error('Failed to fetch live/upcoming from Holodex API', error);
    return { live: [], upcoming: [] };
  }
}

// 過去のアーカイブ動画を取得
export async function getPastVideos(options: { channelId?: string; limit?: number; offset?: number } = {}): Promise<Video[]> {
  try {
    const params: Record<string, string> = {
      limit: String(options.limit || 12),
      offset: String(options.offset || 0),
      status: 'past',
      type: 'stream'
    };

    if (options.channelId) {
      params.channel_id = options.channelId;
    } else {
      params.org = 'Specialite';
    }

    const videos = await fetchFromProxy<Video[]>('videos', params);
    return videos;
  } catch (error) {
    console.error('Failed to fetch archives from Holodex API', error);
    return [];
  }
}

// タレント詳細を取得
export async function getTalentDetail(channelId: string): Promise<Channel | null> {
  try {
    const res = await fetch(`/api/talents/${channelId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch from local API: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`Failed to fetch channel detail for ${channelId} from local API`, error);
    return null;
  }
}

// タレントの個別動画リスト（配信中、予定、過去すべて）を取得
export async function getTalentVideos(channelId: string): Promise<{ live: Video[]; upcoming: Video[]; past: Video[] }> {
  try {
    // ライブ・予定
    const liveAndUpcoming = await fetchFromProxy<Video[]>('live', {
      channel_id: channelId
    });
    const live = liveAndUpcoming.filter(v => v.status === 'live');
    const upcoming = liveAndUpcoming.filter(v => v.status === 'upcoming');
    upcoming.sort((a, b) => {
      const timeA = new Date(a.start_scheduled || '').getTime();
      const timeB = new Date(b.start_scheduled || '').getTime();
      return timeA - timeB;
    });

    // 過去動画
    const past = await fetchFromProxy<Video[]>(`channels/${channelId}/videos`, {
      limit: '20',
      status: 'past',
      type: 'stream'
    });

    return { live, upcoming, past };
  } catch (error) {
    console.error(`Failed to fetch channel videos for ${channelId}`, error);
    return { live: [], upcoming: [], past: [] };
  }
}
