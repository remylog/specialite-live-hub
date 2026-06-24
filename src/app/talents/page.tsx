'use client';

import { useEffect, useState } from 'react';
import { getTalents, getFavorites, toggleFavorite } from '@/utils/holodex';
import { Channel } from '@/types';
import TalentCard from '@/components/TalentCard';
import styles from './talents.module.css';

export default function Talents() {
  const [talents, setTalents] = useState<Channel[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTalents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTalents();
        setTalents(data);
        setFavoriteIds(getFavorites());
      } catch (err) {
        setError('タレント情報の取得に失敗しました。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTalents();
  }, []);

  const handleToggleFavorite = (channelId: string) => {
    const updated = toggleFavorite(channelId);
    setFavoriteIds(updated);
    
    // Navbarなどの別コンポーネントに変更を通知するためのカスタムイベント
    window.dispatchEvent(new Event('favoritesChange'));
  };

  // 期生の順序を判定するヘルパー関数
  const getGroupOrder = (group: string | undefined): number => {
    if (!group) return 999;
    const num = parseInt(group.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) return num;
    
    const lower = group.toLowerCase();
    if (lower.includes('1st') || lower.includes('one') || lower.includes('1')) return 1;
    if (lower.includes('2nd') || lower.includes('two') || lower.includes('2')) return 2;
    if (lower.includes('3rd') || lower.includes('three') || lower.includes('3')) return 3;
    if (lower.includes('4th') || lower.includes('four') || lower.includes('4')) return 4;
    if (lower.includes('5th') || lower.includes('five') || lower.includes('5')) return 5;
    
    return 999;
  };

  // グループ（期生）のユニークなリストを作成し、期生順にソート
  const rawGroups = Array.from(new Set(talents.map((t) => t.group).filter((group): group is string => !!group)));
  rawGroups.sort((a, b) => getGroupOrder(a) - getGroupOrder(b));
  const groups = ['all', ...rawGroups];

  // フィルタリングおよび期生順ソート処理
  const filteredTalents = talents
    .filter((talent) => {
      const matchesSearch =
        talent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        talent.english_name.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesGroup = selectedGroup === 'all' || talent.group === selectedGroup;

      return matchesSearch && matchesGroup;
    })
    .sort((a, b) => {
      const orderA = getGroupOrder(a.group);
      const orderB = getGroupOrder(b.group);
      
      if (orderA === orderB) {
        return a.english_name.localeCompare(b.english_name);
      }
      return orderA - orderB;
    });

  return (
    <div className="app-container">
      <div className="page-title">
        <span><span>✨</span> タレント一覧</span>
      </div>

      {/* 検索・グループ切り替えバー */}
      <section className={`glass-panel ${styles.controlSection}`}>
        <div className={styles.groupTabs}>
          {groups.map((group) => (
            <button
              key={group}
              className={`${styles.tabBtn} ${selectedGroup === group ? styles.activeTab : ''}`}
              onClick={() => setSelectedGroup(group)}
            >
              {group === 'all' ? '全員' : group}
            </button>
          ))}
        </div>

        <div className={styles.searchWrapper}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="タレント名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className={styles.clearBtn} onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>
      </section>

      {error && <div className={styles.errorCard}>{error}</div>}

      {/* タレントグリッド */}
      {loading ? (
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={styles.skeletonCard}>
              <div className={styles.skeletonAvatar}></div>
              <div className={styles.skeletonName}></div>
              <div className={styles.skeletonSub}></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {filteredTalents.length === 0 ? (
            <div className={`glass-panel ${styles.noResults}`}>
              該当するタレントが見つかりませんでした。
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredTalents.map((talent) => (
                <TalentCard
                  key={talent.id}
                  talent={talent}
                  isFavorite={favoriteIds.includes(talent.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
