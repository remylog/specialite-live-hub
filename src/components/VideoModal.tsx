'use client';

import { useEffect } from 'react';
import { Video } from '@/types';
import Avatar from './Avatar';
import styles from './VideoModal.module.css';

interface VideoModalProps {
  video: Video | null;
  onClose: () => void;
}

export default function VideoModal({ video, onClose }: VideoModalProps) {
  // Escキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (video) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // 背後のスクロールを防止
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [video, onClose]);

  if (!video) return null;

  // YouTube埋め込み用URL (自動再生付き)
  const embedUrl = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        role="dialog"
        aria-modal="true"
        aria-label={video.title}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button className={styles.closeBtn} onClick={onClose} aria-label="閉じる">
          <svg viewBox="0 0 24 24" className={styles.closeIcon}>
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>

        {/* 動画プレイヤー枠 */}
        <div className={styles.playerWrapper}>
          <iframe
            src={embedUrl}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className={styles.iframe}
          ></iframe>
        </div>

        {/* 動画情報 */}
        <div className={styles.infoSection}>
          <div className={styles.headerRow}>
            {video.status === 'live' && <span className="badge badge-live">LIVE配信中</span>}
            {video.status === 'upcoming' && <span className="badge badge-upcoming">配信予定（予約枠）</span>}
            {video.status === 'past' && <span className="badge badge-past">アーカイブ</span>}
            <span className={styles.channelName}>{video.channel.name}</span>
          </div>
          
          <h2 className={styles.title}>{video.title}</h2>
          
          <div className={styles.metaRow}>
            <Avatar photo={video.channel.photo} name={video.channel.name} className={styles.avatar} size={96} />
            <div className={styles.channelMeta}>
              <span className={styles.channelEnglishName}>{video.channel.english_name}</span>
              <p className={styles.description}>{video.channel.description || 'すぺしゃりて所属タレントの配信です。'}</p>
            </div>
            
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn-secondary ${styles.youtubeBtn}`}
            >
              YouTubeで見る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
