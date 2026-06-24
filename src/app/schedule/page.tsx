'use client';

import { useEffect, useState } from 'react';
import { getLiveAndUpcoming, getPastVideos } from '@/utils/holodex';
import { Video } from '@/types';
import VideoCard from '@/components/VideoCard';
import VideoModal from '@/components/VideoModal';
import styles from './schedule.module.css';

export default function Schedule() {
  const [timelineVideos, setTimelineVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      // 今日の日付範囲を計算 (0:00:00 〜 23:59:59)
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // 1. ライブ配信中 & スケジュールデータを取得
      const liveData = await getLiveAndUpcoming();
      let liveList = liveData.live;
      let upcomingList = liveData.upcoming;

      // 2. 過去のアーカイブ動画を取得
      let pastList = await getPastVideos({ limit: 50 });

      // 3. 今日の日付の範囲に収まる動画のみをフィルタリング
      const filterToday = (v: Video) => {
        const timeStr = v.start_actual || v.start_scheduled;
        if (!timeStr) return false;
        const time = new Date(timeStr).getTime();
        return time >= startOfToday.getTime() && time <= endOfToday.getTime();
      };

      const todayLive = liveList.filter(filterToday);
      const todayUpcoming = upcomingList.filter(filterToday);
      const todayPast = pastList.filter(filterToday);

      // 4. すべてマージ (現在時刻表示用のダミーオブジェクトも挿入する)
      const nowVideo: Video = {
        id: 'now-indicator',
        title: 'NOW',
        status: 'live',
        type: 'stream',
        channel: { id: 'now', name: '', english_name: '', photo: '' },
        start_actual: now.toISOString()
      };

      const merged = [...todayLive, ...todayUpcoming, ...todayPast, nowVideo];

      // 重複排除
      const uniqueMap = new Map<string, Video>();
      merged.forEach((v) => uniqueMap.set(v.id, v));
      const uniqueList = Array.from(uniqueMap.values());

      // 5. 時間順にソート (開始時刻の早い順)
      uniqueList.sort((a, b) => {
        const timeA = new Date(a.start_actual || a.start_scheduled || '').getTime();
        const timeB = new Date(b.start_actual || b.start_scheduled || '').getTime();
        return timeA - timeB;
      });

      setTimelineVideos(uniqueList);

    } catch (err) {
      setError('スケジュール情報の取得に失敗しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
  };

  // 時刻文字列の抽出 (HH:MM)
  const extractTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    const d = new Date(dateString);
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-container">
      <div className="page-title">
        <span><span>📅</span> 今日のスケジュール</span>
        <button className="btn btn-secondary" onClick={fetchSchedule} style={{ fontSize: '0.85rem' }}>
          更新する
        </button>
      </div>

      {error && <div className={styles.errorCard}>{error}</div>}

      {loading ? (
        <div className={styles.skeletonContainer}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={styles.skeletonRow}>
              <div className={styles.skeletonTime}></div>
              <div className={styles.skeletonCard}></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {timelineVideos.length <= 1 ? ( // ダミーインジケーターのみ、またはデータ無しのとき
            <div className={`glass-panel ${styles.emptyBox}`}>
              本日のスケジュールはまだ登録されていません。
            </div>
          ) : (
            <div className={styles.timelineWrapper}>
              {/* タイムラインの縦線 */}
              <div className={styles.timelineLine}></div>

              {/* タイムラインアイテムリスト */}
              <div className={styles.timelineItems}>
                {timelineVideos.map((video) => {
                  // 現在時刻ラインを描画
                  if (video.id === 'now-indicator') {
                    const timeStr = extractTime(video.start_actual);
                    return (
                      <div key={video.id} className={styles.nowLineItem}>
                        <div className={styles.nowTimeSection}>
                          <div className={styles.nowCircle}></div>
                          <span className={styles.nowTimeText}>{timeStr}</span>
                        </div>
                        <div className={styles.nowLineSection}>
                          <div className={styles.nowLine}></div>
                          <span className={styles.nowLabel}>NOW</span>
                        </div>
                      </div>
                    );
                  }

                  const timeStr = extractTime(video.start_actual || video.start_scheduled);
                  const isLive = video.status === 'live';
                  const isUpcoming = video.status === 'upcoming';
                  
                  return (
                    <div
                      key={video.id}
                      className={`${styles.timelineItem} ${
                        isLive ? styles.itemLive : isUpcoming ? styles.itemUpcoming : ''
                      }`}
                    >
                      {/* 時刻表示 */}
                      <div className={styles.timeSection}>
                        <div className={styles.timeCircle}></div>
                        <span className={styles.timeText}>{timeStr}</span>
                      </div>

                      {/* 配信カード */}
                      <div className={styles.cardSection}>
                        <VideoCard video={video} onClick={handleVideoClick} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* 動画再生モーダル */}
      <VideoModal video={selectedVideo} onClose={handleCloseModal} />
    </div>
  );
}
