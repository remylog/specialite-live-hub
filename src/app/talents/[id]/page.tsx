'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getTalentDetail, getTalentVideos, getFavorites, toggleFavorite } from '@/utils/holodex';
import { Channel, Video } from '@/types';
import VideoCard from '@/components/VideoCard';
import VideoModal from '@/components/VideoModal';
import styles from './detail.module.css';

interface TalentDetailProps {
  params: Promise<{ id: string }>;
}

export default function TalentDetail({ params }: TalentDetailProps) {
  const resolvedParams = use(params);
  const talentId = resolvedParams.id;

  const [talent, setTalent] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<{ live: Video[]; upcoming: Video[]; past: Video[] }>({
    live: [],
    upcoming: [],
    past: [],
  });
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'archives'>('schedule');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTalentData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [talentData, videosData] = await Promise.all([
          getTalentDetail(talentId),
          getTalentVideos(talentId)
        ]);

        if (!talentData) {
          setError('タレントが見つかりませんでした。');
          return;
        }

        setTalent(talentData);
        setVideos(videosData);
        setIsFavorite(getFavorites().includes(talentId));
      } catch (err) {
        setError('タレント情報の取得に失敗しました。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTalentData();
  }, [talentId]);

  const handleToggleFavorite = () => {
    const updated = toggleFavorite(talentId);
    setIsFavorite(updated.includes(talentId));
    
    // Navbar等の他コンポーネントに通知
    window.dispatchEvent(new Event('favoritesChange'));
  };

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonAvatar}></div>
          <div className={styles.skeletonMeta}>
            <div className={styles.skeletonName}></div>
            <div className={styles.skeletonText}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !talent) {
    return (
      <div className="app-container">
        <Link href="/talents" className={`btn btn-secondary ${styles.backBtn}`}>
          ← タレント一覧に戻る
        </Link>
        <div className={styles.errorCard}>{error || 'タレントが見つかりませんでした。'}</div>
      </div>
    );
  }

  const hasLiveOrUpcoming = videos.live.length > 0 || videos.upcoming.length > 0;

  return (
    <div className="app-container">
      {/* 戻るボタン */}
      <Link href="/talents" className={`btn btn-secondary ${styles.backBtn}`}>
        ← タレント一覧に戻る
      </Link>

      {/* プロフィールヘッダー */}
      <section className={`glass-panel ${styles.profileHeader}`}>
        <div className={styles.profileMain}>
          <img src={talent.photo} alt={talent.name} className={styles.avatar} />
          
          <div className={styles.profileMeta}>
            <div className={styles.nameRow}>
              <h1 className={styles.name}>{talent.name}</h1>
              {talent.group && <span className={styles.groupBadge}>{talent.group}</span>}
            </div>
            
            <p className={styles.englishName}>{talent.english_name}</p>
            
            <p className={styles.description}>
              {talent.description || 'すぺしゃりて所属の公式タレントです。毎日ゲーム実況や雑談などの楽しい配信を届けています。'}
            </p>

            <div className={styles.actionRow}>
              {/* お気に入りボタン */}
              <button
                className={`btn ${isFavorite ? styles.favBtnActive : styles.favBtn}`}
                onClick={handleToggleFavorite}
              >
                <span className={styles.starIcon}>{isFavorite ? '★' : '☆'}</span>
                {isFavorite ? 'お気に入り中' : 'お気に入りに追加'}
              </button>

              {/* SNSリンク */}
              <div className={styles.snsLinks}>
                {talent.youtube_handle && (
                  <a
                    href={`https://www.youtube.com/${talent.youtube_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.snsLink}
                    title="YouTube"
                  >
                    YouTube
                  </a>
                )}
                {talent.twitter && (
                  <a
                    href={`https://twitter.com/${talent.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.snsLink}
                    title="X (Twitter)"
                  >
                    X (Twitter)
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 動画セクション */}
      <section className={styles.videoSection}>
        {/* タブ */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'schedule' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            配信予定 & ライブ
            {hasLiveOrUpcoming && <span className={styles.tabDot}></span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'archives' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('archives')}
          >
            過去アーカイブ
          </button>
        </div>

        {/* コンテンツ */}
        {activeTab === 'schedule' ? (
          <div>
            {videos.live.length === 0 && videos.upcoming.length === 0 ? (
              <div className={`glass-panel ${styles.emptyBox}`}>
                現在予定されている配信はありません。
              </div>
            ) : (
              <div className={styles.grid}>
                {videos.live.map((video) => (
                  <VideoCard key={video.id} video={video} onClick={handleVideoClick} />
                ))}
                {videos.upcoming.map((video) => (
                  <VideoCard key={video.id} video={video} onClick={handleVideoClick} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {videos.past.length === 0 ? (
              <div className={`glass-panel ${styles.emptyBox}`}>
                過去のアーカイブ動画が見つかりませんでした。
              </div>
            ) : (
              <div className={styles.grid}>
                {videos.past.map((video) => (
                  <VideoCard key={video.id} video={video} onClick={handleVideoClick} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 動画再生モーダル */}
      <VideoModal video={selectedVideo} onClose={handleCloseModal} />
    </div>
  );
}
