'use client';

import { useEffect, useState } from 'react';
import { getFavorites, toggleFavorite } from '@/utils/holodex';
import { Channel } from '@/types';
import styles from './settings.module.css';

export default function Settings() {
  // システム設定用

  // アクティブタブ
  const [activeTab, setActiveTab] = useState<'system' | 'favorites' | 'talents'>('system');

  // タレントデータとお気に入り
  const [talents, setTalents] = useState<Channel[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loadingTalents, setLoadingTalents] = useState(false);

  // タレント追加・編集モーダル用
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formEnglishName, setFormEnglishName] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formTwitter, setFormTwitter] = useState('');
  const [formYoutubeHandle, setFormYoutubeHandle] = useState('');
  const [formGroup, setFormGroup] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 一括追加モーダル用
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkIds, setBulkIds] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ total: number; current: number; success: number; failed: number } | null>(null);
  const [bulkLogs, setBulkLogs] = useState<{ id: string; status: 'success' | 'error'; message: string }[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const fetchTalents = async () => {
    try {
      setLoadingTalents(true);
      const res = await fetch('/api/talents');
      if (res.ok) {
        const data = await res.json();
        setTalents(data);
      }
    } catch (err) {
      console.error('Failed to fetch talents:', err);
    } finally {
      setLoadingTalents(false);
    }
  };

  useEffect(() => {
    setFavorites(getFavorites());
    fetchTalents();
  }, []);




  // お気に入り解除
  const handleRemoveFavorite = (channelId: string) => {
    const updated = toggleFavorite(channelId);
    setFavorites(updated);
    window.dispatchEvent(new Event('favoritesChange'));
  };

  // すべてのお気に入りを解除
  const handleClearAllFavorites = () => {
    if (window.confirm('すべてのお気に入りを解除しますか？')) {
      localStorage.setItem('specialite_hub_favorites', JSON.stringify([]));
      setFavorites([]);
      window.dispatchEvent(new Event('favoritesChange'));
    }
  };

  // モーダル操作
  const openAddModal = () => {
    setModalMode('add');
    setFormId('');
    setFormName('');
    setFormEnglishName('');
    setFormPhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80');
    setFormTwitter('');
    setFormYoutubeHandle('');
    setFormGroup('1期生');
    setFormDescription('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (talent: Channel) => {
    setModalMode('edit');
    setFormId(talent.id);
    setFormName(talent.name);
    setFormEnglishName(talent.english_name || '');
    setFormPhoto(talent.photo || '');
    setFormTwitter(talent.twitter || '');
    setFormYoutubeHandle(talent.youtube_handle || '');
    setFormGroup(talent.group || '');
    setFormDescription(talent.description || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleAutoFill = async () => {
    if (!formId.trim()) {
      setFormError('自動取得するには、まずチャンネルIDを入力してください。');
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      
      const res = await fetch(`/api/holodex/channels/${formId.trim()}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data.name) setFormName(data.name);
        if (data.english_name) setFormEnglishName(data.english_name);
        if (data.photo) setFormPhoto(data.photo);
        if (data.twitter) setFormTwitter(data.twitter);
        if (data.description) setFormDescription(data.description);
      } else {
        setFormError('タレント情報の取得に失敗しました。チャンネルIDが正しいか確認してください。');
      }
    } catch (err) {
      setFormError('ネットワークエラーが発生しました。');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId.trim() || !formName.trim()) {
      setFormError('チャンネルIDと名前は必須入力です。');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const payload = {
        id: formId.trim(),
        name: formName.trim(),
        english_name: formEnglishName.trim(),
        photo: formPhoto.trim(),
        twitter: formTwitter.trim(),
        youtube_handle: formYoutubeHandle.trim(),
        group: formGroup.trim(),
        description: formDescription.trim(),
      };

      let url = '/api/talents';
      let method = 'POST';

      if (modalMode === 'edit') {
        url = `/api/talents/${formId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchTalents();
        setModalOpen(false);
        window.dispatchEvent(new Event('favoritesChange'));
      } else {
        const errorData = await res.json().catch(() => ({}));
        setFormError(errorData.error || '保存に失敗しました。');
      }
    } catch (err) {
      setFormError('ネットワークエラーが発生しました。');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openBulkModal = () => {
    setBulkIds('');
    setBulkProgress(null);
    setBulkLogs([]);
    setBulkSubmitting(false);
    setBulkModalOpen(true);
  };

  const handleBulkAdd = async () => {
    const ids = bulkIds.split(/[\n,]+/).map(id => id.trim()).filter(id => id.length > 0);
    if (ids.length === 0) {
      alert('チャンネルIDを入力してください。');
      return;
    }

    setBulkSubmitting(true);
    setBulkProgress({ total: ids.length, current: 0, success: 0, failed: 0 });
    setBulkLogs([]);

    let successCount = 0;
    let failedCount = 0;
    const newLogs: typeof bulkLogs = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      setBulkProgress(prev => prev ? { ...prev, current: i + 1 } : null);

      try {
        // 1. Holodexからデータ取得
        const fetchRes = await fetch(`/api/holodex/channels/${id}`);
        if (!fetchRes.ok) {
          throw new Error('Holodexから情報が取得できませんでした');
        }
        const data = await fetchRes.json();

        // 2. DBへ保存
        const payload = {
          id: id,
          name: data.name || 'Unknown',
          english_name: data.english_name || '',
          photo: data.photo || '',
          twitter: data.twitter || '',
          youtube_handle: '',
          group: data.group || '未設定',
          description: data.description || '',
        };

        const postRes = await fetch('/api/talents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (postRes.ok) {
          successCount++;
          newLogs.push({ id, status: 'success', message: `${data.name} を追加しました` });
        } else {
          const errorData = await postRes.json().catch(() => ({}));
          throw new Error(errorData.error || '保存に失敗しました');
        }
      } catch (err: any) {
        failedCount++;
        newLogs.push({ id, status: 'error', message: err.message || 'エラーが発生しました' });
      }

      setBulkLogs([...newLogs]);
      setBulkProgress(prev => prev ? { ...prev, success: successCount, failed: failedCount } : null);
      
      // APIレートリミット対策
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await fetchTalents();
    setBulkSubmitting(false);
  };

  const handleDeleteTalent = async (talent: Channel) => {
    const confirmed = window.confirm(
      `${talent.name} を削除しますか？\nこのタレントに紐づいているアーカイブ動画のキャッシュもすべて削除されます。`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/talents/${talent.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchTalents();
        // お気に入りに入っていた場合は解除
        const storedFavorites = getFavorites();
        if (storedFavorites.includes(talent.id)) {
          toggleFavorite(talent.id);
          setFavorites(getFavorites());
        }
        window.dispatchEvent(new Event('favoritesChange'));
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || '削除に失敗しました。');
      }
    } catch (err) {
      console.error('Failed to delete talent:', err);
      alert('削除処理中にエラーが発生しました。');
    }
  };

  // お気に入りタレント情報を解決
  const favoriteTalents = favorites.map(id => {
    return (
      talents.find(t => t.id === id) ||
      ({ id, name: '不明なタレント', english_name: 'Unknown', photo: '' } as Channel)
    );
  });

  return (
    <div className="app-container">
      <div className="page-title">
        <span><span>⚙️</span> アプリケーション管理設定</span>
      </div>

      {/* タブ切り替え */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabButton} ${activeTab === 'system' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('system')}
        >
          ⚙️ システム設定
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'favorites' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          ⭐ お気に入り管理 ({favorites.length})
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'talents' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('talents')}
        >
          👥 タレント管理 ({talents.length})
        </button>
      </div>

      <div className={styles.container}>
        {/* システム設定タブ */}
        {activeTab === 'system' && (
          <>
            <section className={`glass-panel ${styles.card}`}>
              <h2 className={styles.cardTitle}>システム設定</h2>
              <p className={styles.cardDesc}>
                APIキー等のシステム設定は現在環境変数(.env)で管理されています。
              </p>
            </section>
          </>
        )}

        {/* お気に入り管理タブ */}
        {activeTab === 'favorites' && (
          <section className={`glass-panel ${styles.card}`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.cardTitle}>お気に入り（スターマーク）管理</h2>
                <p className={styles.cardDesc}>
                  現在お気に入りに登録されているタレントの一覧です。スターマークをクリックして解除できます。
                </p>
              </div>
              {favorites.length > 0 && (
                <button
                  type="button"
                  className={`btn btn-secondary ${styles.dangerOutlineBtn}`}
                  onClick={handleClearAllFavorites}
                >
                  💔 全解除する
                </button>
              )}
            </div>

            {favorites.length === 0 ? (
              <div className={styles.emptyState}>
                お気に入り登録されているタレントはいません。タレント一覧ページで星マークをクリックして登録してください。
              </div>
            ) : (
              <div className={styles.favGrid}>
                {favoriteTalents.map((talent) => (
                  <div key={talent.id} className={styles.favCard}>
                    {talent.photo ? (
                      <img src={talent.photo} alt={talent.name} className={styles.favAvatar} />
                    ) : (
                      <div className={styles.favAvatarPlaceholder}>👤</div>
                    )}
                    <div className={styles.favInfo}>
                      <span className={styles.favGroupName}>{talent.group || '所属なし'}</span>
                      <h3 className={styles.favName}>{talent.name}</h3>
                      <span className={styles.favSub}>{talent.english_name}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.favStarBtn}
                      onClick={() => handleRemoveFavorite(talent.id)}
                      title="お気に入りを解除"
                    >
                      ★
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* タレント管理タブ */}
        {activeTab === 'talents' && (
          <section className={`glass-panel ${styles.card}`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.cardTitle}>タレント情報管理</h2>
                <p className={styles.cardDesc}>
                  ローカルデータベースに登録されているタレントです。追加、編集、削除が行えます。
                </p>
              </div>
              <div className={styles.headerActions}>
                <button type="button" className={`btn btn-secondary`} onClick={openBulkModal}>
                  📦 一括追加
                </button>
                <button type="button" className="btn btn-primary" onClick={openAddModal}>
                  ➕ 新規タレントを追加
                </button>
              </div>
            </div>

            {loadingTalents ? (
              <div className={styles.loadingSpinner}>読み込み中...</div>
            ) : talents.length === 0 ? (
              <div className={styles.emptyState}>
                登録されているタレント情報がありません。（APIをロードすると自動的にシードされます）
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.talentTable}>
                  <thead>
                    <tr>
                      <th>写真</th>
                      <th>チャンネルID / 名前</th>
                      <th>所属グループ</th>
                      <th>Twitter / YouTube</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {talents.map((talent) => (
                      <tr key={talent.id}>
                        <td>
                          {talent.photo ? (
                            <img src={talent.photo} alt={talent.name} className={styles.tableAvatar} />
                          ) : (
                            <div className={styles.tableAvatarPlaceholder}>👤</div>
                          )}
                        </td>
                        <td>
                          <div className={styles.talentNameCol}>
                            <span className={styles.tableNameText}>{talent.name}</span>
                            <span className={styles.tableSubText}>{talent.english_name}</span>
                            <code className={styles.tableCodeId}>{talent.id}</code>
                          </div>
                        </td>
                        <td>
                          <span className={styles.tableGroupBadge}>{talent.group || '未設定'}</span>
                        </td>
                        <td>
                          <div className={styles.snsCol}>
                            {talent.twitter && (
                              <a
                                href={`https://twitter.com/${talent.twitter}`}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.snsLink}
                              >
                                🐦 @{talent.twitter}
                              </a>
                            )}
                            {talent.youtube_handle && (
                              <span className={styles.youtubeHandleText}>
                                📺 {talent.youtube_handle}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={`btn btn-secondary ${styles.actionBtnSmall}`}
                              onClick={() => openEditModal(talent)}
                            >
                              ✏️ 編集
                            </button>
                            <button
                              type="button"
                              className={`btn btn-secondary ${styles.actionBtnSmall} ${styles.btnDanger}`}
                              onClick={() => handleDeleteTalent(talent)}
                            >
                              🗑️ 削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {/* 追加・編集モーダル */}
      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {modalMode === 'add' ? '✨ 新規タレントを追加' : '✏️ タレント情報を編集'}
              </h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => setModalOpen(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className={styles.modalForm}>
              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="talent-id" className={styles.fieldLabel}>
                    YouTube チャンネルID (必須)
                  </label>
                  <div className={styles.autoFillWrapper}>
                    <input
                      id="talent-id"
                      type="text"
                      className={styles.modalInput}
                      placeholder="例: UC_kozuyanano_dummy"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      disabled={modalMode === 'edit'}
                    />
                    {modalMode === 'add' && (
                      <button
                        type="button"
                        className={styles.autoFillBtn}
                        onClick={handleAutoFill}
                        disabled={submitting || !formId.trim()}
                      >
                        🪄 自動取得
                      </button>
                    )}
                  </div>
                  {modalMode === 'edit' && (
                    <span className={styles.fieldHint}>チャンネルIDは変更できません。</span>
                  )}
                </div>

                <div className={styles.formField}>
                  <label htmlFor="talent-name" className={styles.fieldLabel}>
                    タレント名 (必須)
                  </label>
                  <input
                    id="talent-name"
                    type="text"
                    className={styles.modalInput}
                    placeholder="例: 小鳥谷なの"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="talent-eng" className={styles.fieldLabel}>
                    英語名
                  </label>
                  <input
                    id="talent-eng"
                    type="text"
                    className={styles.modalInput}
                    placeholder="例: Nano Kozuya"
                    value={formEnglishName}
                    onChange={(e) => setFormEnglishName(e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <label htmlFor="talent-group" className={styles.fieldLabel}>
                    所属グループ / 期生
                  </label>
                  <input
                    id="talent-group"
                    type="text"
                    className={styles.modalInput}
                    placeholder="例: 1期生"
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label htmlFor="talent-photo" className={styles.fieldLabel}>
                  写真URL (プロフィール画像)
                </label>
                <input
                  id="talent-photo"
                  type="text"
                  className={styles.modalInput}
                  placeholder="https://..."
                  value={formPhoto}
                  onChange={(e) => setFormPhoto(e.target.value)}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="talent-twitter" className={styles.fieldLabel}>
                    Twitter ID (@抜き)
                  </label>
                  <input
                    id="talent-twitter"
                    type="text"
                    className={styles.modalInput}
                    placeholder="例: nano_kozuya"
                    value={formTwitter}
                    onChange={(e) => setFormTwitter(e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <label htmlFor="talent-yt" className={styles.fieldLabel}>
                    YouTube ユーザー名 (ハンドル)
                  </label>
                  <input
                    id="talent-yt"
                    type="text"
                    className={styles.modalInput}
                    placeholder="例: @nano_kozuya"
                    value={formYoutubeHandle}
                    onChange={(e) => setFormYoutubeHandle(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label htmlFor="talent-desc" className={styles.fieldLabel}>
                  説明 / プロフィール
                </label>
                <textarea
                  id="talent-desc"
                  className={styles.modalTextarea}
                  placeholder="タレントの紹介文..."
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  キャンセル
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '保存中...' : '保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 一括追加モーダル */}
      {bulkModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>📦 タレント一括追加</h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => !bulkSubmitting && setBulkModalOpen(false)}>
                ×
              </button>
            </div>
            
            <div className={styles.modalForm}>
              <p className={styles.cardDesc} style={{ marginBottom: '0.5rem' }}>
                複数のYouTubeチャンネルIDを改行またはカンマ区切りで入力してください。
              </p>
              
              <textarea
                className={styles.modalTextarea}
                style={{ minHeight: '150px' }}
                placeholder="UC...&#10;UC..."
                value={bulkIds}
                onChange={(e) => setBulkIds(e.target.value)}
                disabled={bulkSubmitting}
              />

              {bulkProgress && (
                <div className={styles.bulkProgressContainer}>
                  <div className={styles.bulkProgressHeader}>
                    <span>進行状況: {bulkProgress.current} / {bulkProgress.total}</span>
                    <span className={styles.bulkProgressStats}>
                      <span className={styles.successText}>成功: {bulkProgress.success}</span>
                      <span className={styles.failedText}>失敗: {bulkProgress.failed}</span>
                    </span>
                  </div>
                  <div className={styles.bulkProgressBar}>
                    <div 
                      className={styles.bulkProgressFill} 
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                  
                  {bulkLogs.length > 0 && (
                    <div className={styles.bulkLogs}>
                      {bulkLogs.map((log, i) => (
                        <div key={i} className={log.status === 'success' ? styles.successLog : styles.errorLog}>
                          [{log.id}] {log.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setBulkModalOpen(false)}
                  disabled={bulkSubmitting}
                >
                  閉じる
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleBulkAdd} 
                  disabled={bulkSubmitting || !bulkIds.trim()}
                >
                  {bulkSubmitting ? '処理中...' : '一括取得して追加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
