'use client';

import { useEffect, useState, useMemo } from 'react';
import { getLiveAndUpcoming, getPastVideos } from '@/utils/holodex';
import { Video } from '@/types';
import VideoCard from '@/components/VideoCard';
import VideoModal from '@/components/VideoModal';
import styles from './schedule.module.css';

export default function Schedule() {
  const [rawVideos, setRawVideos] = useState<Video[]>([]);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [now, setNow] = useState<Date>(new Date());
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      // 今日の日付範囲を計算 (0:00:00 〜 23:59:59)
      const currentNow = new Date(Date.now() + timeOffset);
      const startOfToday = new Date(currentNow.getFullYear(), currentNow.getMonth(), currentNow.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(currentNow.getFullYear(), currentNow.getMonth(), currentNow.getDate(), 23, 59, 59, 999);

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

      // 4. すべてマージ
      const merged = [...todayLive, ...todayUpcoming, ...todayPast];

      // 重複排除
      const uniqueMap = new Map<string, Video>();
      merged.forEach((v) => uniqueMap.set(v.id, v));
      const uniqueList = Array.from(uniqueMap.values());

      setRawVideos(uniqueList);

    } catch (err) {
      setError('スケジュール情報の取得に失敗しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();

    // NICT NTP時刻による補正のロード
    const syncTime = async () => {
      try {
        const start = Date.now();
        const res = await fetch('/api/time');
        const latency = Date.now() - start;
        
        if (res.ok) {
          const data = await res.json();
          const nictTime = data.timestamp;
          // ネットワーク遅延の半分を考慮して補正
          const estimatedNictNow = nictTime + (latency / 2);
          const offset = estimatedNictNow - Date.now();
          setTimeOffset(offset);
          setNow(new Date(Date.now() + offset));
        }
      } catch (err) {
        console.error('Failed to sync time with NTP:', err);
      }
    };
    
    syncTime();
  }, []);

  useEffect(() => {
    // 補正した現在時刻を1分ごとに更新
    const updateTime = () => {
      setNow(new Date(Date.now() + timeOffset));
    };

    updateTime();

    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [timeOffset]);

  // 時刻文字列の抽出 (HH:MM)
  const extractTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    const d = new Date(dateString);
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };


  // 同一開始時間でグループ化するロジック
  const timelineGroups = useMemo(() => {

    // まず時間順にソートした動画リストを作成
    const sorted = [...rawVideos].sort((a, b) => {
      const timeA = new Date(a.start_actual || a.start_scheduled || '').getTime();
      const timeB = new Date(b.start_actual || b.start_scheduled || '').getTime();
      return timeA - timeB;
    });

    const groups: {
      type: 'now' | 'videos';
      timeKey: string;
      timestamp: number;
      videos?: Video[];
    }[] = [];

    // 各動画をグループに分類
    sorted.forEach((video) => {
      const timeStr = extractTime(video.start_actual || video.start_scheduled);
      const timestamp = new Date(video.start_actual || video.start_scheduled || '').getTime();
      
      const existing = groups.find((g) => g.type === 'videos' && g.timeKey === timeStr);
      if (existing) {
        existing.videos?.push(video);
      } else {
        groups.push({
          type: 'videos',
          timeKey: timeStr,
          timestamp,
          videos: [video],
        });
      }
    });

    // NOWインジケーターを挿入
    const nowTimeKey = extractTime(now.toISOString());
    const nowTimestamp = now.getTime();
    
    // 適切なタイミング（時系列順）でNOW位置を見つけて挿入
    let inserted = false;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].timestamp > nowTimestamp) {
        groups.splice(i, 0, {
          type: 'now',
          timeKey: nowTimeKey,
          timestamp: nowTimestamp,
        });
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      groups.push({
        type: 'now',
        timeKey: nowTimeKey,
        timestamp: nowTimestamp,
      });
    }

    return groups;
  }, [rawVideos, now]);

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleCloseModal = () => {
    setSelectedVideo(null);
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
          {rawVideos.length === 0 ? (
            <div className={`glass-panel ${styles.emptyBox}`}>
              本日のスケジュールはまだ登録されていません。
            </div>
          ) : (
            <div className={styles.timelineWrapper}>
              {/* タイムラインの縦線 */}
              <div className={styles.timelineLine}></div>

              {/* タイムラインアイテムリスト */}
              <div className={styles.timelineItems}>
                {timelineGroups.map((group, groupIdx) => {
                  // 現在時刻ラインを描画
                  if (group.type === 'now') {
                    return (
                      <div key={`now-${groupIdx}`} className={styles.nowLineItem}>
                        <div className={styles.nowTimeSection}>
                          <div className={styles.nowCircle}></div>
                          <span className={styles.nowTimeText}>{group.timeKey}</span>
                        </div>
                        <div className={styles.nowLineSection}>
                          <div className={styles.nowLine}></div>
                          <span className={styles.nowLabel}>NOW</span>
                        </div>
                      </div>
                    );
                  }

                  const videos = group.videos || [];
                  if (videos.length === 0) return null;

                  const firstVideo = videos[0];
                  const isLive = videos.some((v) => v.status === 'live');
                  const isUpcoming = videos.some((v) => v.status === 'upcoming');
                  
                  return (
                    <div
                      key={`group-${group.timeKey}-${groupIdx}`}
                      className={`${styles.timelineItem} ${
                        isLive ? styles.itemLive : isUpcoming ? styles.itemUpcoming : ''
                      }`}
                    >
                      {/* 時刻表示 */}
                      <div className={styles.timeSection}>
                        <div className={styles.timeCircle}></div>
                        <span className={styles.timeText}>{group.timeKey}</span>
                      </div>

                      {/* 配信カードグループ（横並び） */}
                      <div className={styles.cardGroupSection}>
                        {videos.map((video) => (
                          <div key={video.id} className={styles.cardWrapper}>
                            <VideoCard video={video} onClick={handleVideoClick} />
                          </div>
                        ))}
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

