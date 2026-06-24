'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPastVideos, getTalents } from '@/utils/holodex';
import { Channel, Video } from '@/types';
import VideoCard from '@/components/VideoCard';
import VideoModal from '@/components/VideoModal';
import styles from './archives.module.css';

export default function Archives() {
  const [talents, setTalents] = useState<Channel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedTalentId, setSelectedTalentId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const LIMIT = 12;

  // 初期データおよびタレント一覧の取得
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [talentsData, videosData] = await Promise.all([
          getTalents(),
          getPastVideos({ limit: LIMIT, offset: 0 })
        ]);
        
        setTalents(talentsData);
        setVideos(videosData);
        setHasMore(videosData.length === LIMIT);
        setOffset(LIMIT);
      } catch (err) {
        setError('アーカイブの取得に失敗しました。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // フィルター変更時の動画再取得
  const handleFilterChange = async (talentId: string) => {
    setSelectedTalentId(talentId);
    try {
      setLoading(true);
      setError(null);
      
      const params: { limit: number; offset: number; channelId?: string } = {
        limit: LIMIT,
        offset: 0
      };
      
      if (talentId !== 'all') {
        params.channelId = talentId;
      }
      
      const data = await getPastVideos(params);
      setVideos(data);
      setHasMore(data.length === LIMIT);
      setOffset(LIMIT);
    } catch (err) {
      setError('アーカイブの絞り込みに失敗しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // もっと読み込む
  const handleLoadMore = async () => {
    if (loadingMore) return;
    try {
      setLoadingMore(true);
      
      const params: { limit: number; offset: number; channelId?: string } = {
        limit: LIMIT,
        offset: offset
      };
      
      if (selectedTalentId !== 'all') {
        params.channelId = selectedTalentId;
      }
      
      const newData = await getPastVideos(params);
      
      if (newData.length < LIMIT) {
        setHasMore(false);
      }
      
      setVideos(prev => [...prev, ...newData]);
      setOffset(prev => prev + LIMIT);
    } catch (err) {
      console.error('Failed to load more videos:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
  };

  // クライアントサイドでの簡易検索フィルタリング
  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-container">
      <div className="page-title">
        <span><span>🎬</span> アーカイブ一覧</span>
      </div>

      {/* フィルター・検索セクション */}
      <section className={`glass-panel ${styles.filterSection}`}>
        <div className={styles.filterGroup}>
          <label htmlFor="talent-select" className={styles.label}>メンバーで絞り込む</label>
          <select
            id="talent-select"
            className={styles.select}
            value={selectedTalentId}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="all">全員</option>
            {talents.map((talent) => (
              <option key={talent.id} value={talent.id}>
                {talent.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.searchGroup}>
          <label htmlFor="search-input" className={styles.label}>キーワードで検索</label>
          <div className={styles.searchInputWrapper}>
            <input
              id="search-input"
              type="text"
              className={styles.searchInput}
              placeholder="タイトルを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.clearBtn} onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </div>
        </div>
      </section>

      {error && <div className={styles.errorCard}>{error}</div>}

      {/* 動画グリッド */}
      {loading ? (
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className={styles.skeletonCard}>
              <div className={styles.skeletonThumb}></div>
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine}></div>
                <div className={styles.skeletonLineShort}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {filteredVideos.length === 0 ? (
            <div className={`glass-panel ${styles.noResults}`}>
              該当するアーカイブが見つかりませんでした。
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {filteredVideos.map((video) => (
                  <VideoCard key={video.id} video={video} onClick={handleVideoClick} />
                ))}
              </div>

              {hasMore && !searchQuery && (
                <div className={styles.loadMoreContainer}>
                  <button
                    className={`btn btn-secondary ${styles.loadMoreBtn}`}
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? '読み込み中...' : 'もっと読み込む'}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* 動画再生モーダル */}
      <VideoModal video={selectedVideo} onClose={handleCloseModal} />
    </div>
  );
}
