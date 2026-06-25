'use client';

import { useState, useEffect } from 'react';
import { getTalents } from '@/utils/holodex';
import { Channel } from '@/types';
import styles from './mypage.module.css';

interface ParsedHistoryItem {
  header?: string;
  title: string;
  titleUrl?: string;
  subtitles?: { name: string; url?: string }[];
  time: string;
  products?: string[];
  details?: { name: string }[];
}

interface TalentStat {
  talent: Channel;
  count: number;
}

interface GroupStat {
  name: string;
  count: number;
}

interface CollabStat {
  memberA: Channel;
  memberB: Channel;
  count: number;
}

export default function MyPage() {
  const [talents, setTalents] = useState<Channel[]>([]);
  const [loadingTalents, setLoadingTalents] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 解析結果の保持
  const [hasData, setHasData] = useState(false);
  const [totalParsed, setTotalParsed] = useState(0);
  const [totalSpecialiteVideos, setTotalSpecialiteVideos] = useState(0);
  const [talentStats, setTalentStats] = useState<TalentStat[]>([]);
  const [groupStats, setGroupStats] = useState<GroupStat[]>([]);
  const [collabStats, setCollabStats] = useState<CollabStat[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    // タレント一覧とキャッシュデータの読み込み
    const initData = async () => {
      try {
        setLoadingTalents(true);
        const data = await getTalents();
        setTalents(data);

        // すでにLocalStorageに解析結果があるか確認
        const savedStats = localStorage.getItem('specialite_hub_user_stats');
        if (savedStats) {
          const parsed = JSON.parse(savedStats);
          setTotalParsed(parsed.totalParsed || 0);
          setTotalSpecialiteVideos(parsed.totalSpecialiteVideos || 0);
          
          // タレント情報とのマッピングを復元
          const mappedTalents: TalentStat[] = (parsed.talentStats || [])
            .map((stat: any) => {
              const matched = data.find((t) => t.id === stat.talentId);
              return matched ? { talent: matched, count: stat.count } : null;
            })
            .filter((t: any): t is TalentStat => !!t);

          // コラボ情報とのマッピングを復元
          const mappedCollabs: CollabStat[] = (parsed.collabStats || [])
            .map((stat: any) => {
              const memberA = data.find((t) => t.id === stat.memberAId);
              const memberB = data.find((t) => t.id === stat.memberBId);
              return memberA && memberB ? { memberA, memberB, count: stat.count } : null;
            })
            .filter((c: any): c is CollabStat => !!c);

          setTalentStats(mappedTalents);
          setGroupStats(parsed.groupStats || []);
          setCollabStats(mappedCollabs);
          setLastUpdated(parsed.lastUpdated || '');
          setHasData(mappedTalents.length > 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTalents(false);
      }
    };

    initData();
  }, []);


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const history: ParsedHistoryItem[] = JSON.parse(text);

        if (!Array.isArray(history)) {
          throw new Error('JSON形式が不正です。YouTubeの視聴履歴データ配列が含まれていません。');
        }

        // 解析処理
        analyzeHistoryData(history);
      } catch (err) {
        console.error(err);
        setError('ファイルの解析に失敗しました。YouTubeから書き出した watch-history.json であるか確認してください。');
        setAnalyzing(false);
      }
    };
    reader.readAsText(file);
  };

  const analyzeHistoryData = (history: ParsedHistoryItem[]) => {
    const totalItems = history.length;
    
    // タレントごとの集計マップ
    const countMap = new Map<string, number>();

    // 履歴アイテムをスキャン
    history.forEach((item) => {
      // タイトルURLや字幕URLなどからYouTubeチャンネルIDを抽出します
      let channelId = '';

      if (item.subtitles && item.subtitles.length > 0) {
        const subtitleUrl = item.subtitles[0].url || '';
        const match = subtitleUrl.match(/channel\/([^/?#]+)/);
        if (match) {
          channelId = match[1];
        }
      }

      if (channelId && talents.some((t) => t.id === channelId)) {
        countMap.set(channelId, (countMap.get(channelId) || 0) + 1);
      }
    });

    // 1. すぺしゃりて全体の総動画数
    let specialiteTotal = 0;
    const statsArray: TalentStat[] = [];
    const grpCountMap = new Map<string, number>();

    countMap.forEach((count, cId) => {
      specialiteTotal += count;
      const matchedTalent = talents.find((t) => t.id === cId);
      if (matchedTalent) {
        statsArray.push({ talent: matchedTalent, count });

        const group = matchedTalent.group || '所属なし';
        grpCountMap.set(group, (grpCountMap.get(group) || 0) + count);
      }
    });

    // 2. コラボ頻度の集計ロジック (タイトルに他メンバーの名前や愛称が含まれるか)
    const collabMap = new Map<string, { memberA: Channel; memberB: Channel; count: number }>();

    history.forEach((item) => {
      // 視聴動画のチャンネルID
      let watcherId = '';
      if (item.subtitles && item.subtitles.length > 0) {
        const subtitleUrl = item.subtitles[0].url || '';
        const match = subtitleUrl.match(/channel\/([^/?#]+)/);
        if (match) watcherId = match[1];
      }

      if (!watcherId) return;
      const watcherTalent = talents.find((t) => t.id === watcherId);
      if (!watcherTalent) return;

      // タイトルに他の登録タレントの名前が含まれているか確認
      talents.forEach((otherTalent) => {
        if (otherTalent.id === watcherId) return;

        // タレントのフルネームや苗字・名前の一部が含まれているか判定します
        // 例: 「小鳥谷なの」の「なの」、「夢見むむ」の「むむ」など
        const cleanedOtherName = otherTalent.name.replace(/^[^\w\sぁ-んァ-ヶ亜-熙]+|[^\w\sぁ-んァ-ヶ亜-熙]+$/g, '');
        const shortName = cleanedOtherName.length > 3 ? cleanedOtherName.substring(3) : cleanedOtherName;

        const hasCollabName = 
          item.title.includes(otherTalent.name) || 
          (shortName.length >= 2 && item.title.includes(shortName));

        if (hasCollabName) {
          // ペアのキーを一意にするため、IDでソートしてキーを作ります
          const sortedIds = [watcherId, otherTalent.id].sort();
          const key = sortedIds.join('-');

          const existing = collabMap.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            // AとBをマッピング
            const memberA = watcherTalent;
            const memberB = otherTalent;
            collabMap.set(key, { memberA, memberB, count: 1 });
          }
        }
      });
    });

    const collabsArray = Array.from(collabMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 上位10組

    // 視聴数順にソート
    statsArray.sort((a, b) => b.count - a.count);

    // グループ集計も配列に
    const grpArray: GroupStat[] = Array.from(grpCountMap.entries()).map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => b.count - a.count);

    const nowStr = new Date().toLocaleString('ja-JP');

    // キャッシュ保存
    const cacheData = {
      totalParsed: totalItems,
      totalSpecialiteVideos: specialiteTotal,
      talentStats: statsArray.map((s) => ({ talentId: s.talent.id, count: s.count })),
      groupStats: grpArray,
      collabStats: collabsArray.map((c) => ({
        memberAId: c.memberA.id,
        memberBId: c.memberB.id,
        count: c.count,
      })),
      lastUpdated: nowStr,
    };

    localStorage.setItem('specialite_hub_user_stats', JSON.stringify(cacheData));

    // stateの更新
    setTotalParsed(totalItems);
    setTotalSpecialiteVideos(specialiteTotal);
    setTalentStats(statsArray);
    setGroupStats(grpArray);
    setCollabStats(collabsArray);
    setLastUpdated(nowStr);
    setHasData(statsArray.length > 0);
    setAnalyzing(false);
  };


  const handleResetData = () => {
    if (window.confirm('解析データと履歴データを削除しますか？')) {
      localStorage.removeItem('specialite_hub_user_stats');
      setHasData(false);
      setTotalParsed(0);
      setTotalSpecialiteVideos(0);
      setTalentStats([]);
      setGroupStats([]);
      setLastUpdated('');
    }
  };

  // ファン度（オタク度）の診断ロジック
  const getFanDiagnosis = (count: number) => {
    if (count === 0) {
      return {
        level: '通りすがりの観測者',
        description: 'まだすぺしゃりてのアーカイブ視聴履歴が検出されませんでした。今こそ気になるメンバーの動画をのぞいてみましょう！',
        color: '#8d92be',
      };
    }
    if (count < 10) {
      return {
        level: 'ひよっこリスナー',
        description: 'すぺしゃりての動画を少しだけ再生したことがあります。これからたくさんの配信を見つけて、もっと深くハマっていきましょう！',
        color: '#4cc9f0',
      };
    }
    if (count < 50) {
      return {
        level: '常連のファン',
        description: '特定のライバーを日常的によく見ているファンです。配信スケジュールを確認して、生配信にリアタイ参加するともっと楽しめますよ！',
        color: '#fff275',
      };
    }
    if (count < 200) {
      return {
        level: '熱烈なオタク',
        description: '毎日かかさずアーカイブを消化し、お気に入り登録もバッチリな熱心なリスナー。推しの名場面や歌枠を何回もループしていることでしょう！',
        color: '#ff8fa3',
      };
    }
    return {
      level: '限界特異オタク（推し活マスター）',
      description: 'すぺしゃりての配信が生活の一部になっているスーパーリスナー！総再生回数は圧倒的で、全タレントのネタや名場面をほぼ知り尽くしています。素晴らしい推し活ライフです！',
      color: '#7209b7',
    };
  };

  const diagnosis = getFanDiagnosis(totalSpecialiteVideos);

  if (loadingTalents) {
    return (
      <div className="app-container">
        <div className={styles.loading}>タレント情報を準備中...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="page-title">
        <span><span>👑</span> マイページ（推し活分析）</span>
        {hasData && (
          <button className={`btn btn-secondary ${styles.resetBtn}`} onClick={handleResetData}>
            🗑️ データをクリア
          </button>
        )}
      </div>

      {!hasData ? (
        <div className={styles.welcomeSection}>
          <div className={`glass-panel ${styles.uploadCard}`}>
            <h2>📊 あなたの「推し活」を分析してみましょう！</h2>
            <p>
              GoogleアカウントからエクスポートしたYouTube視聴履歴ファイル（`watch-history.json`）をアップロードすると、
              すぺしゃりてメンバーの総再生数や推しランキング、ファン度などを完全にオフラインで解析してグラフ表示します。
            </p>

            <div className={styles.dropzone}>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className={styles.fileInput}
                id="history-file-upload"
              />
              <label htmlFor="history-file-upload" className={styles.dropzoneLabel}>
                {analyzing ? (
                  <span className={styles.analyzingText}>⚙️ 履歴データを解析中...</span>
                ) : (
                  <>
                    <span>📁 watch-history.json を選択またはドラッグ</span>
                    <span className={styles.fileHint}>※ データはサーバーに送信されず、安全にブラウザ内だけで処理されます。</span>
                  </>
                )}
              </label>
            </div>

            {error && <div className={styles.error}>{error}</div>}
          </div>

          <div className={`glass-panel ${styles.guideCard}`}>
            <h3>💡 視聴履歴データの取得方法</h3>
            <ol className={styles.guideSteps}>
              <li>
                <a href="https://takeout.google.com/" target="_blank" rel="noreferrer" className={styles.link}>
                  Google Takeout（データのエクスポート）
                </a> にアクセスします。
              </li>
              <li>「選択をすべて解除」を押し、リストの中から <b>YouTube と YouTube Music</b> だけにチェックを入れます。</li>
              <li>「すべてのデータが含まれます」をクリックし、履歴以外の不要な項目のチェックを外して <b>HTML から JSON に形式を変更</b>します。</li>
              <li>「次のステップ」に進み、エクスポートを作成します。</li>
              <li>数分後、届いたダウンロードリンクからZIPを解凍し、中に含まれる <b>watch-history.json</b> を上にアップロードしてください。</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className={styles.dashboard}>
          {/* ファン度診断カード */}
          <section className={`glass-panel ${styles.diagnosisCard}`} style={{ borderColor: diagnosis.color }}>
            <div className={styles.diagnosisHeader}>
              <span className={styles.levelBadge} style={{ backgroundColor: diagnosis.color }}>
                {diagnosis.level}
              </span>
              <h2 className={styles.diagnosisTitle}>あなたのすぺしゃりてファン度</h2>
            </div>
            <p className={styles.diagnosisDesc}>{diagnosis.description}</p>
          </section>

          {/* 統計数値カード */}
          <div className={styles.statsGrid}>
            <div className={`glass-panel ${styles.statCard}`}>
              <span className={styles.statLabel}>すぺしゃりて総再生数</span>
              <span className={styles.statValue}>{totalSpecialiteVideos} <span className={styles.statUnit}>回</span></span>
            </div>
            <div className={`glass-panel ${styles.statCard}`}>
              <span className={styles.statLabel}>推定総視聴時間</span>
              <span className={styles.statValue}>
                {Math.round((totalSpecialiteVideos * 25) / 60)} <span className={styles.statUnit}>時間</span>
              </span>
              <span className={styles.statSub}>※1動画あたり約25分換算で算出</span>
            </div>
            <div className={`glass-panel ${styles.statCard}`}>
              <span className={styles.statLabel}>履歴全体の解析数</span>
              <span className={styles.statValue}>{totalParsed} <span className={styles.statUnit}>枠</span></span>
            </div>
          </div>

          <div className={styles.chartSection}>
            {/* 推しランキング */}
            <section className={`glass-panel ${styles.chartCard}`}>
              <h3 className={styles.chartTitle}>👑 推しライバーランキング (Top 5)</h3>
              <div className={styles.rankingList}>
                {talentStats.slice(0, 5).map((stat, idx) => {
                  const maxCount = talentStats[0].count;
                  const percent = Math.round((stat.count / maxCount) * 100);
                  return (
                    <div key={stat.talent.id} className={styles.rankRow}>
                      <span className={styles.rankNum}>{idx + 1}</span>
                      <img src={stat.talent.photo} alt={stat.talent.name} className={styles.rankAvatar} />
                      <div className={styles.rankInfo}>
                        <div className={styles.rankHeader}>
                          <span className={styles.rankName}>{stat.talent.name}</span>
                          <span className={styles.rankCount}>{stat.count} 回視聴</span>
                        </div>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* グループ（期生）比率 */}
            <section className={`glass-panel ${styles.chartCard}`}>
              <h3 className={styles.chartTitle}>🏷️ 推しグループ（期生）比率</h3>
              <div className={styles.groupRatioList}>
                {groupStats.map((stat) => {
                  const percent = Math.round((stat.count / totalSpecialiteVideos) * 100);
                  return (
                    <div key={stat.name} className={styles.ratioRow}>
                      <div className={styles.ratioHeader}>
                        <span className={styles.ratioName}>{stat.name}</span>
                        <span className={styles.ratioValue}>{percent}% ({stat.count}回)</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${percent}%`, backgroundColor: 'var(--accent-blue)' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* コラボ相関分析 */}
          {collabStats.length > 0 && (
            <section className={`glass-panel ${styles.collabCard}`}>
              <h3 className={styles.chartTitle}>🤝 よく視聴するコラボの組み合わせ (Top 5)</h3>
              <div className={styles.collabGrid}>
                {collabStats.slice(0, 5).map((collab, idx) => {
                  const maxCollabs = collabStats[0].count;
                  const percent = Math.round((collab.count / maxCollabs) * 100);
                  return (
                    <div key={`collab-${idx}`} className={styles.collabRow}>
                      <div className={styles.collabMembers}>
                        <div className={styles.collabMember}>
                          <img src={collab.memberA.photo} alt={collab.memberA.name} className={styles.collabAvatar} />
                          <span className={styles.collabName}>{collab.memberA.name}</span>
                        </div>
                        <span className={styles.collabHeart}>❤</span>
                        <div className={styles.collabMember}>
                          <img src={collab.memberB.photo} alt={collab.memberB.name} className={styles.collabAvatar} />
                          <span className={styles.collabName}>{collab.memberB.name}</span>
                        </div>
                      </div>
                      <div className={styles.collabInfo}>
                        <span className={styles.collabCount}>{collab.count} 回コラボ視聴</span>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{ width: `${percent}%`, backgroundColor: 'var(--accent-pink)' }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className={styles.footerInfo}>
            <span>データ最終解析日時: {lastUpdated}</span>
          </div>

        </div>
      )}
    </div>
  );
}
