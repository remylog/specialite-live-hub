'use client';

import { Video } from '@/types';
import Avatar from './Avatar';
import styles from './VideoCard.module.css';

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

export default function VideoCard({ video, onClick }: VideoCardProps) {
  // YouTubeサムネイルURL
  const thumbnailUrl = `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;

  // 日付のフォーマット
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 配信時間のフォーマット (秒 -> H:MM:SS)
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 視聴者数のフォーマット
  const formatViewers = (viewers?: number) => {
    if (viewers === undefined) return '';
    if (viewers >= 1000) {
      return `${(viewers / 1000).toFixed(1)}k`;
    }
    return String(viewers);
  };

  return (
    <div
      className={`glass-panel ${styles.card}`}
      role="button"
      tabIndex={0}
      aria-label={`${video.channel.name}: ${video.title}`}
      onClick={() => onClick(video)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(video);
        }
      }}
    >
      <div className={styles.thumbnailContainer}>
        <img src={thumbnailUrl} alt={video.title} className={styles.thumbnail} loading="lazy" />
        
        {/* 左上：ステータスバッジ */}
        <div className={styles.statusBadgeOverlay}>
          {video.status === 'live' && (
            <span className="badge badge-live">
              LIVE
            </span>
          )}
          {video.status === 'upcoming' && (
            <span className="badge badge-upcoming">
              予定
            </span>
          )}
          {video.status === 'past' && (
            <span className="badge badge-past">
              {video.type === 'clip' ? '切り抜き' : 'アーカイブ'}
            </span>
          )}
        </div>

        {/* 右下：詳細情報バッジ */}
        <div className={styles.infoBadgeOverlay}>
          {video.status === 'live' && video.live_viewers !== undefined && (
            <span className={styles.infoBadge}>
              {formatViewers(video.live_viewers)}人視聴中
            </span>
          )}
          {video.status === 'upcoming' && (
            <span className={styles.infoBadge}>
              {formatDateTime(video.start_scheduled)}〜
            </span>
          )}
          {video.status === 'past' && video.duration !== undefined && (
            <span className={styles.infoBadge}>
              {formatDuration(video.duration)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title} title={video.title}>
          {video.title}
        </h3>
        
        <div className={styles.channelInfo}>
          <Avatar photo={video.channel.photo} name={video.channel.name} className={styles.channelPhoto} size={96} />
          <div className={styles.channelTexts}>
            <span className={styles.channelName}>{video.channel.name}</span>
            <span className={styles.timeInfo}>
              {video.status === 'past' && `${formatDateTime(video.start_actual || video.start_scheduled)}`}
              {video.status === 'live' && '配信中'}
              {video.status === 'upcoming' && '配信予定'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
