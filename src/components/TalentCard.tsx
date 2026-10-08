'use client';

import { useRouter } from 'next/navigation';
import { Channel } from '@/types';
import Avatar from './Avatar';
import styles from './TalentCard.module.css';

interface TalentCardProps {
  talent: Channel;
  isFavorite: boolean;
  onToggleFavorite: (channelId: string) => void;
}

export default function TalentCard({ talent, isFavorite, onToggleFavorite }: TalentCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/talents/${talent.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(talent.id);
  };

  const handleSnsClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 詳細ページへの遷移を防ぐ
  };

  return (
    <div onClick={handleCardClick} className={`glass-panel ${styles.card}`}>
      {/* お気に入りボタン */}
      <button
        type="button"
        className={`${styles.favoriteBtn} ${isFavorite ? styles.favorited : ''}`}
        onClick={handleFavoriteClick}
        aria-label="お気に入り登録"
      >
        <svg viewBox="0 0 24 24" className={styles.starIcon}>
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      </button>

      {/* タレント画像 */}
      <div className={styles.photoContainer}>
        <Avatar photo={talent.photo} name={talent.name} className={styles.photo} size={256} />
      </div>

      {/* タレント詳細情報 */}
      <div className={styles.info}>
        {talent.group && (
          <span className={styles.groupBadge}>
            {talent.group}
          </span>
        )}
        
        <h3 className={styles.name}>{talent.name}</h3>
        <p className={styles.englishName}>{talent.english_name}</p>

        {/* SNS・外部リンク */}
        <div className={styles.links}>
            <a
              href={`https://www.youtube.com/channel/${talent.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkIcon}
              onClick={handleSnsClick}
              title="YouTube チャンネル"
            >
              <svg className={styles.svgIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.163c-.272-1.022-1.074-1.826-2.099-2.099C19.548 3.5 12 3.5 12 3.5s-7.548 0-9.4.564C1.776 4.337.974 5.14.702 6.163.14 8.02.14 11.97.14 11.97s0 3.95.562 5.807c.272 1.022 1.074 1.826 2.099 2.099 1.852.564 9.4.564 9.4.564s7.548 0 9.4-.564c1.025-.273 1.827-1.077 2.099-2.099.562-1.857.562-5.807.562-5.807s0-3.95-.562-5.807zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          {talent.twitter && (
            <a
              href={`https://twitter.com/${talent.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkIcon}
              onClick={handleSnsClick}
              title="公式 X (Twitter)"
            >
              <svg className={styles.svgIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
