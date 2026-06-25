'use client';

import { useEffect, useState } from 'react';
import { getFavorites, toggleFavorite } from '@/utils/holodex';
import { Channel } from '@/types';
import styles from './settings.module.css';

export default function Settings() {
  // システム設定用
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [discordTestResult, setDiscordTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [adminKeySaved, setAdminKeySaved] = useState(false);

  // AdminKeyのlocalStorageからの読み込み
  useEffect(() => {
    const savedKey = localStorage.getItem('specialite_hub_admin_key') || '';
    setAdminKey(savedKey);
  }, []);

  const handleSaveAdminKey = () => {
    localStorage.setItem('specialite_hub_admin_key', adminKey.trim());
    setAdminKeySaved(true);
    setTimeout(() => setAdminKeySaved(false), 2000);
  };

  const getAdminHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const key = localStorage.getItem('specialite_hub_admin_key');
    if (key) headers['x-admin-key'] = key;
    return headers;
  };

  const handleTestDiscord = async () => {
    try {
      setTestingDiscord(true);
      setDiscordTestResult(null);
      
      const res = await fetch('/api/live/test-discord', {
        method: 'POST',
        headers: getAdminHeaders(),
      });
      
      const data = await res.json();
      if (res.ok) {
        setDiscordTestResult({ success: true, message: data.message });
      } else {
        setDiscordTestResult({ success: false, message: data.error || 'テスト送信に失敗しました。' });
      }
    } catch (err) {
      console.error(err);
      setDiscordTestResult({ success: false, message: '通信エラーが発生しました。' });
    } finally {
      setTestingDiscord(false);
    }
  };

  // アクティブタブ
  const [activeTab, setActiveTab] = useState<'system' | 'favorites' | 'talents' | 'groups'>('system');


  // タレントデータとお気に入り
  const [talents, setTalents] = useState<Channel[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loadingTalents, setLoadingTalents] = useState(false);

  // グループ管理用
  const [dbGroups, setDbGroups] = useState<{ id: string; name: string }[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);

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

  // グループ選択・複数選択用のstate
  const [groupSelectVal, setGroupSelectVal] = useState('1期生');
  const [customGroupVal, setCustomGroupVal] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTargetGroup, setBulkTargetGroup] = useState('');

  // 一括追加モーダル用
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkIds, setBulkIds] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ total: number; current: number; success: number; failed: number } | null>(null);
  const [bulkLogs, setBulkLogs] = useState<{ id: string; status: 'success' | 'error'; message: string }[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchTalents = async () => {
    try {
      setLoadingTalents(true);
      setSelectedIds([]); // 選択状態を解除
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

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setDbGroups(data);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    setFavorites(getFavorites());
    fetchTalents();
    fetchGroups();
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
    setFormGroup(dbGroups[0]?.name || '1期生');
    setGroupSelectVal(dbGroups[0]?.name || '1期生');
    setCustomGroupVal('');
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
    const groupNames = dbGroups.map(g => g.name);
    if (groupNames.includes(talent.group || '')) {
      setGroupSelectVal(talent.group || '');
      setCustomGroupVal('');
    } else {
      setGroupSelectVal('custom');
      setCustomGroupVal(talent.group || '');
    }
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
        if (data.group) {
          setFormGroup(data.group);
          const groupNames = dbGroups.map(g => g.name);
          if (groupNames.includes(data.group)) {
            setGroupSelectVal(data.group);
            setCustomGroupVal('');
          } else {
            setGroupSelectVal('custom');
            setCustomGroupVal(data.group);
          }
        }
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
        group: groupSelectVal === 'custom' ? customGroupVal.trim() : groupSelectVal,
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
        headers: getAdminHeaders(),
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
          headers: getAdminHeaders(),
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

  // グループ追加・削除ハンドラー
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ name: newGroupName.trim() })
      });

      if (res.ok) {
        setNewGroupName('');
        await fetchGroups();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'グループの追加に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      alert('エラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `グループ「${name}」を削除しますか？\n※このグループに所属しているタレントの所属情報は削除されませんが、グループの紐付けが解除されます。`
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/groups/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });

      if (res.ok) {
        await fetchGroups();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'グループの削除に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      alert('エラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/talents/export', {
        headers: getAdminHeaders(),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'エクスポートに失敗しました。');
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `specialite_talents_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'エクスポート処理中にエラーが発生しました。');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.groups || !parsed.talents) {
          alert('不正なJSON形式です。groupsとtalentsが含まれている必要があります。');
          return;
        }

        const confirmed = window.confirm(
          `グループ ${parsed.groups.length} 件、タレント ${parsed.talents.length} 件をインポートしますか？\n既存のデータは上書きされます。`
        );
        if (!confirmed) return;

        const res = await fetch('/api/talents/import', {
          method: 'POST',
          headers: getAdminHeaders(),
          body: content,
        });

        if (res.ok) {
          alert('インポートが完了しました。');
          await fetchTalents();
          await fetchGroups();
          window.dispatchEvent(new Event('favoritesChange'));
        } else {
          const errorData = await res.json().catch(() => ({}));
          alert(errorData.error || 'インポートに失敗しました。');
        }
      } catch (err) {
        console.error(err);
        alert('ファイルの読み込み、またはパースに失敗しました。無効なJSONファイルです。');
      } finally {
        e.target.value = ''; // ファイル選択をリセット
      }
    };
    reader.readAsText(file);
  };

  // 複数選択用のハンドラー
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(talents.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `選択した ${selectedIds.length} 件のタレントをすべて削除しますか？\n関連するアーカイブキャッシュもすべて削除されます。`
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/talents/bulk-delete', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ ids: selectedIds })
      });

      if (res.ok) {
        setSelectedIds([]);
        await fetchTalents();
        window.dispatchEvent(new Event('favoritesChange'));
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || '一括削除に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      alert('一括削除処理中にエラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkGroupUpdate = async () => {
    if (selectedIds.length === 0 || !bulkTargetGroup) return;
    const groupVal = bulkTargetGroup === 'null' ? '' : bulkTargetGroup;

    try {
      setSubmitting(true);
      const res = await fetch('/api/talents/bulk-group', {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ ids: selectedIds, group: groupVal })
      });

      if (res.ok) {
        setSelectedIds([]);
        setBulkTargetGroup('');
        await fetchTalents();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || '一括グループ変更に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      alert('グループ一括変更処理中にエラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTalent = async (talent: Channel) => {
    const confirmed = window.confirm(
      `${talent.name} を削除しますか？\nこのタレントに紐づいているアーカイブ動画のキャッシュもすべて削除されます。`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/talents/${talent.id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
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
        <button
          className={`${styles.tabButton} ${activeTab === 'groups' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          🏷️ グループ管理 ({dbGroups.length})
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

            <section className={`glass-panel ${styles.card}`} style={{ marginTop: '1.5rem' }}>
              <h2 className={styles.cardTitle}>🔑 管理者キー設定</h2>
              {process.env.NEXT_PUBLIC_BYPASS_ADMIN_AUTH === 'true' ? (
                <p className={styles.cardDesc} style={{ color: '#10b981', fontWeight: 'bold' }}>
                  現在、環境変数によって管理者キー認証は無効化（スキップ）されています。Cloudflare Access等で前段の保護を行っている場合に適しています。この端末での管理者キーの設定は不要です。
                </p>
              ) : (
                <>
                  <p className={styles.cardDesc}>
                    タレントの追加・削除・同期などの管理操作を実行するには、サーバー側に設定された「ADMIN_SECRET_KEY」と同じ値をここに入力してください。このキーはブラウザ内にのみ保存され、管理APIへのリクエスト時に自動的に使用されます。
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', maxWidth: '500px', marginTop: '1rem' }}>
                    <input
                      type="password"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="ADMIN_SECRET_KEY の値を入力..."
                      className={styles.input}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveAdminKey}
                      style={{ flexShrink: 0 }}
                    >
                      {adminKeySaved ? '✅ 保存済み' : '保存する'}
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className={`glass-panel ${styles.card}`} style={{ marginTop: '1.5rem' }}>
              <h2 className={styles.cardTitle}>🔔 Discord Webhook 連携テスト</h2>
              <p className={styles.cardDesc}>
                現在環境変数に登録されている「DISCORD_WEBHOOK_URL」宛てに、テスト用の配信用メッセージを送信して疎通確認を行います。
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleTestDiscord}
                  disabled={testingDiscord}
                >
                  {testingDiscord ? '📡 送信中...' : '📨 テスト通知を送信'}
                </button>

                {discordTestResult && (
                  <div
                    className={`${styles.testResultCard} ${
                      discordTestResult.success ? styles.testSuccess : styles.testFailed
                    }`}
                  >
                    {discordTestResult.success ? '✅ ' : '❌ '}
                    {discordTestResult.message}
                  </div>
                )}
              </div>
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleExport}
                >
                  📥 エクスポート
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => document.getElementById('import-file-input')?.click()}
                >
                  📤 インポート
                </button>
                <input
                  type="file"
                  id="import-file-input"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
                <button type="button" className="btn btn-secondary" onClick={openBulkModal}>
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
              <>
                {selectedIds.length > 0 && (
                  <div className={styles.bulkActionBar}>
                    <span className={styles.bulkActionText}>{selectedIds.length} 件選択中</span>
                    <div className={styles.bulkActionButtons}>
                      <select
                        value={bulkTargetGroup}
                        onChange={(e) => setBulkTargetGroup(e.target.value)}
                        className={styles.bulkSelect}
                      >
                        <option value="">-- グループを一括変更 --</option>
                        {dbGroups.map((g) => (
                          <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                        <option value="null">所属なし</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleBulkGroupUpdate}
                        disabled={!bulkTargetGroup || submitting}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        変更を適用
                      </button>
                      <button
                        type="button"
                        className={`${styles.dangerOutlineBtn} btn`}
                        onClick={handleBulkDelete}
                        disabled={submitting}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', marginLeft: '0.5rem' }}
                      >
                        🗑️ 一括削除
                      </button>
                    </div>
                  </div>
                )}

                <div className={styles.tableWrapper}>
                  <table className={styles.talentTable}>
                    <thead>
                      <tr>
                        <th className={styles.checkboxCol}>
                          <input
                            type="checkbox"
                            onChange={handleSelectAll}
                            checked={talents.length > 0 && selectedIds.length === talents.length}
                          />
                        </th>
                        <th>写真</th>
                        <th>チャンネルID / 名前</th>
                        <th>所属グループ</th>
                        <th>Twitter / YouTube</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {talents.map((talent) => {
                        return (
                          <tr key={talent.id}>
                            <td className={styles.checkboxCol}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(talent.id)}
                                onChange={() => handleSelectRow(talent.id)}
                              />
                            </td>
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {/* グループ管理タブ */}
        {activeTab === 'groups' && (
          <section className={`glass-panel ${styles.card}`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.cardTitle}>所属グループ管理</h2>
                <p className={styles.cardDesc}>
                  タレントの分類に使用する所属グループ（期生）を管理します。追加したグループはタレント編集時の選択肢に表示されます。
                </p>
              </div>
            </div>

            <form onSubmit={handleAddGroup} className={styles.groupForm}>
              <input
                type="text"
                className={styles.modalInput}
                placeholder="新しいグループ名を入力（例: 4期生）"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                disabled={submitting}
              />
              <button type="submit" className="btn btn-primary" disabled={submitting || !newGroupName.trim()}>
                ➕ 追加
              </button>
            </form>

            {loadingGroups ? (
              <div className={styles.loadingSpinner}>読み込み中...</div>
            ) : dbGroups.length === 0 ? (
              <div className={styles.emptyState}>グループが登録されていません。</div>
            ) : (
              <div className={styles.groupGrid}>
                {dbGroups.map((g) => (
                  <div key={g.id} className={styles.groupCard}>
                    <span className={styles.groupName}>{g.name}</span>
                    <button
                      type="button"
                      className={`btn btn-secondary ${styles.actionBtnSmall} ${styles.btnDanger}`}
                      onClick={() => handleDeleteGroup(g.id, g.name)}
                      disabled={submitting}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      🗑️ 削除
                    </button>
                  </div>
                ))}
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
                  <label htmlFor="talent-group-select" className={styles.fieldLabel}>
                    所属グループ / 期生
                  </label>
                  <select
                    id="talent-group-select"
                    className={styles.modalInput}
                    value={groupSelectVal}
                    onChange={(e) => setGroupSelectVal(e.target.value)}
                  >
                    {dbGroups.map((g) => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                    <option value="custom">その他（直接入力）</option>
                  </select>
                  
                  {groupSelectVal === 'custom' && (
                    <input
                      id="talent-group"
                      type="text"
                      className={styles.modalInput}
                      style={{ marginTop: '0.5rem' }}
                      placeholder="グループ名を入力してください（例: 4期生）"
                      value={customGroupVal}
                      onChange={(e) => setCustomGroupVal(e.target.value)}
                    />
                  )}
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
