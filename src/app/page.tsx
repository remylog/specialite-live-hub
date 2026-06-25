'use client';

import { useEffect, useState } from 'react';
import { getLiveAndUpcoming, getFavorites } from '@/utils/holodex';
import { Video } from '@/types';
import VideoCard from '@/components/VideoCard';
import VideoModal from '@/components/VideoModal';
import styles from './page.module.css';

export default function Home() {
  const [liveStreams, setLiveStreams] = useState<Video[]>([]);
  const [upcomingStreams, setUpcomingStreams] = useState<Video[]>([]);
  const [recommendations, setRecommendations] = useState<{ comment: string; video: Video }[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [streamsData, recsRes] = await Promise.all([
        getLiveAndUpcoming(),
        fetch('/api/recommend').then(r => r.ok ? r.json() : [])
      ]);
      
      setLiveStreams(streamsData.live);
      setUpcomingStreams(streamsData.upcoming);
      setRecommendations(recsRes || []);
      setFavoriteIds(getFavorites());
    } catch (err) {
      setError('データの取得に失敗しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // お気に入りの変更をリッスンするためのイベント
    const handleStorageChange = () => {
      setFavoriteIds(getFavorites());
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('favoritesChange', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('favoritesChange', handleStorageChange);
    };
  }, []);

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
  };

  // お気に入りタレントの配信と予定
  const favLive = liveStreams.filter((v) => favoriteIds.includes(v.channel.id));
  const favUpcoming = upcomingStreams.filter((v) => favoriteIds.includes(v.channel.id));

  // お気に入り以外の配信と予定
  const normalLive = liveStreams.filter((v) => !favoriteIds.includes(v.channel.id));
  const normalUpcoming = upcomingStreams.filter((v) => !favoriteIds.includes(v.channel.id));

  return (
    <div className="app-container">
      {/* ヒーローヘッダー */}
      <section className={styles.hero}>
        <div className={styles.heroBg}></div>
        <h1 className={`${styles.heroTitle} gradient-text animate-float`}>Specialite Live Hub</h1>
        <p className={styles.heroText}>
          すぺしゃりて所属タレントの配信スケジュールやライブ配信、過去のアーカイブ情報をまとめてお届けします。
        </p>
      </section>

      {error && <div className={styles.errorCard}>{error}</div>}

      {loading ? (
        <div className={styles.skeletonContainer}>
          <div className={styles.skeletonSection}>
            <div className={styles.skeletonTitle}></div>
            <div className={styles.skeletonGrid}>
              {[1, 2, 3].map((n) => (
                <div key={n} className={styles.skeletonCard}>
                  <div className={styles.skeletonThumb}></div>
                  <div className={styles.skeletonBody}>
                    <div className={styles.skeletonLine}></div>
                    <div className={styles.skeletonLineShort}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Gemini AI おすすめアーカイブ */}
          {recommendations.length > 0 && (
            <section className={styles.aiSection}>
              <div className={styles.aiHeader}>
                <h2 className={styles.aiTitle}>
                  🤖 Gemini AIが選ぶ昨日のイチオシ配信
                </h2>
                <span className={styles.aiBadge}>AI PICKUP</span>
              </div>
              <div className={styles.aiGrid}>
                {recommendations.map(({ comment, video }) => (
                  <div key={video.id} className={styles.aiCard} onClick={() => handleVideoClick(video)}>
                    <div className={styles.aiCommentBox}>
                      <span className={styles.aiCommentIcon}>✨</span>
                      <span>{comment}</span>
                    </div>
                    <div className={styles.aiCardInner}>
                      <VideoCard video={video} onClick={handleVideoClick} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* お気に入りメンバーの配信状況 */}
          {favoriteIds.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.favStar}>★</span> お気に入りタレントの配信
              </h2>
              {favLive.length === 0 && favUpcoming.length === 0 ? (
                <div className={`glass-panel ${styles.emptyBox}`}>
                  お気に入り登録されたタレントは現在配信中・配信予定はありません。
                </div>
              ) : (
                <div className={styles.grid}>
                  {favLive.map((video) => (
                    <VideoCard key={video.id} video={video} onClick={handleVideoClick} />
                  ))}
                  {favUpcoming.map((video) => (
                    <VideoCard key={video.id} video={video} onClick={handleVideoClick} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ライブ配信中 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.liveIndicator}></span> 配信中 (Live Now)
            </h2>
            {normalLive.length === 0 && favLive.length === 0 ? (
              <div className={`glass-panel ${styles.emptyBox}`}>
                現在配信中のタレントはいません。
              </div>
            ) : (
              <div className={styles.grid}>
                {normalLive.map((video) => (
                  <VideoCard key={video.id} video={video} onClick={handleVideoClick} />
                ))}
              </div>
            )}
          </section>

          {/* 配信予定スケジュール */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.scheduleIcon}>📅</span> 配信予定 (Upcoming)
            </h2>
            {normalUpcoming.length === 0 && favUpcoming.length === 0 ? (
              <div className={`glass-panel ${styles.emptyBox}`}>
                予定されている配信はありません。
              </div>
            ) : (
              <div className={styles.grid}>
                {normalUpcoming.map((video) => (
                  <VideoCard key={video.id} video={video} onClick={handleVideoClick} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* 動画再生モーダル */}
      <VideoModal video={selectedVideo} onClose={handleCloseModal} />
    </div>
  );
}
