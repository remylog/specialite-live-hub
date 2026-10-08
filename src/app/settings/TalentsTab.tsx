'use client';

import { useEffect, useMemo, useState } from 'react';
import { getFavorites, toggleFavorite } from '@/utils/holodex';
import { Channel } from '@/types';
import Avatar from '@/components/Avatar';
import styles from './settings.module.css';
import list from './talentList.module.css';
import { getAdminHeaders } from './adminHeaders';

const NO_GROUP = '__none__';
const FETCH_FAILED_MESSAGE = 'Holodexから情報が取得できませんでした';

export default function TalentsTab() {
  const [talents, setTalents] = useState<Channel[]>([]);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [refreshing, setRefreshing] = useState<{ current: number; total: number } | null>(null);
  const [bulkGroup, setBulkGroup] = useState(''); // ''=取得した値をそのまま使う
  const [bulkProgress, setBulkProgress] = useState<{ total: number; current: number; success: number; failed: number } | null>(null);
  const [bulkLogs, setBulkLogs] = useState<{ id: string; status: 'success' | 'error'; message: string }[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

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

  // マウント時に一覧を読み込む
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTalents();
    fetchGroups();
  }, []);

  // モーダル操作
  // 自動取得に失敗したときの手動入力用
  const openManualModal = (prefillId = '') => {
    setModalMode('add');
    setFormId(prefillId);
    setFormName('');
    setFormEnglishName('');
    setFormPhoto('');
    setFormTwitter('');
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

  const openAddModal = () => {
    setBulkIds('');
    setBulkGroup('');
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
          throw new Error(FETCH_FAILED_MESSAGE);
        }
        const data = await fetchRes.json();

        // 2. DBへ保存
        const payload = {
          id: id,
          name: data.name || 'Unknown',
          english_name: data.english_name || '',
          photo: data.photo || '',
          twitter: data.twitter || '',
          group: bulkGroup || data.group || '',
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
      } catch (err) {
        failedCount++;
        newLogs.push({ id, status: 'error', message: err instanceof Error ? err.message : 'エラーが発生しました' });
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

  // 複数選択用のハンドラー
  // Holodexから最新の情報を取得して更新する（所属グループは管理画面の設定を優先して変更しない）
  const handleRefresh = async (targets: Channel[]) => {
    if (targets.length === 0 || refreshing) return;
    const label = targets.length === 1 ? targets[0].name : `${targets.length} 件のタレント`;
    const confirmed = window.confirm(
      `${label} の情報をHolodexの最新の値で更新します。\n名前・英語名・写真・Twitter・説明が上書きされます（所属グループは変更しません）。よろしいですか？`
    );
    if (!confirmed) return;

    let updated = 0;
    const failed: string[] = [];

    for (let i = 0; i < targets.length; i++) {
      const talent = targets[i];
      setRefreshing({ current: i + 1, total: targets.length });
      try {
        const fetchRes = await fetch(`/api/holodex/channels/${talent.id}`);
        if (!fetchRes.ok) throw new Error('fetch failed');
        const data = await fetchRes.json();

        // Holodex側が空の項目は既存の値を残す
        const res = await fetch(`/api/talents/${talent.id}`, {
          method: 'PUT',
          headers: getAdminHeaders(),
          body: JSON.stringify({
            name: data.name || talent.name,
            english_name: data.english_name || talent.english_name || '',
            photo: data.photo || talent.photo || '',
            twitter: data.twitter || talent.twitter || '',
            group: talent.group || '',
            description: data.description || talent.description || '',
          }),
        });
        if (!res.ok) throw new Error('update failed');
        updated++;
      } catch {
        failed.push(talent.name);
      }
      // APIレートリミット対策
      if (i < targets.length - 1) await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setRefreshing(null);
    await fetchTalents();
    window.dispatchEvent(new Event('favoritesChange'));
    alert(
      `${updated} 件を更新しました。` +
        (failed.length > 0 ? `\n取得または更新に失敗: ${failed.join('、')}` : '')
    );
  };

  // 検索・グループで絞り込んだ一覧
  const groupOptions = useMemo(
    () => Array.from(new Set(talents.map((t) => t.group).filter((g): g is string => !!g))).sort(),
    [talents]
  );
  const filteredTalents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return talents.filter((t) => {
      if (groupFilter === NO_GROUP ? !!t.group : groupFilter !== 'all' && t.group !== groupFilter) return false;
      if (!q) return true;
      return [t.name, t.english_name, t.id].some((v) => v?.toLowerCase().includes(q));
    });
  }, [talents, searchQuery, groupFilter]);

  // 表示中(絞り込み後)のタレントだけを全選択/解除する
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const visible = new Set(filteredTalents.map((t) => t.id));
    setSelectedIds((prev) =>
      e.target.checked
        ? Array.from(new Set([...prev, ...visible]))
        : prev.filter((id) => !visible.has(id))
    );
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
        if (getFavorites().includes(talent.id)) {
          toggleFavorite(talent.id);
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

  return (
    <>
      <section className={`glass-panel ${list.panel}`}>
        <div className={list.head}>
          <div className={list.headText}>
            <h2 className={styles.cardTitle}>
              タレント情報管理
              <span className={list.count}>
                {filteredTalents.length === talents.length
                  ? `${talents.length}人`
                  : `${filteredTalents.length} / ${talents.length}人`}
              </span>
            </h2>
            <p className={styles.cardDesc}>登録されているタレントの追加、編集、削除ができます。</p>
          </div>
          <div className={list.headActions}>
            <button type="button" className="btn btn-primary" onClick={openAddModal}>
              ➕ タレントを追加
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleRefresh(filteredTalents)}
              disabled={!!refreshing || filteredTalents.length === 0}
            >
              {refreshing
                ? `🔄 再取得中 ${refreshing.current}/${refreshing.total}`
                : filteredTalents.length === talents.length
                  ? '🔄 全員を再取得'
                  : '🔄 表示中を再取得'}
            </button>
          </div>
        </div>

        {loadingTalents ? (
          <div className={styles.loadingSpinner}>読み込み中...</div>
        ) : talents.length === 0 ? (
          <div className={list.empty}>登録されているタレントがいません。「タレントを追加」から登録してください。</div>
        ) : (
          <>
            <div className={list.toolbar}>
              <div className={list.search}>
                <input
                  type="search"
                  className={list.field}
                  placeholder="名前・英語名・IDで検索"
                  aria-label="タレントを検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className={`${list.field} ${list.groupFilter}`}
                aria-label="所属グループで絞り込み"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option value="all">すべてのグループ</option>
                {groupOptions.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
                <option value={NO_GROUP}>所属なし</option>
              </select>
              <label className={list.selectAll}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={filteredTalents.length > 0 && filteredTalents.every((t) => selectedIds.includes(t.id))}
                  disabled={filteredTalents.length === 0}
                />
                表示中を全選択
              </label>
            </div>

            {selectedIds.length > 0 && (
              <div className={list.bulkBar}>
                <span className={list.bulkText}>{selectedIds.length} 件選択中</span>
                <div className={list.bulkButtons}>
                  <select
                    value={bulkTargetGroup}
                    onChange={(e) => setBulkTargetGroup(e.target.value)}
                    className={list.field}
                    aria-label="グループを一括変更"
                  >
                    <option value="">-- グループを一括変更 --</option>
                    {dbGroups.map((g) => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                    <option value="null">所属なし</option>
                  </select>
                  <button
                    type="button"
                    className={`btn btn-secondary ${list.compactBtn}`}
                    onClick={handleBulkGroupUpdate}
                    disabled={!bulkTargetGroup || submitting}
                  >
                    変更を適用
                  </button>
                  <button
                    type="button"
                    className={`btn btn-secondary ${list.compactBtn}`}
                    onClick={() => handleRefresh(talents.filter((t) => selectedIds.includes(t.id)))}
                    disabled={!!refreshing}
                  >
                    🔄 再取得
                  </button>
                  <button
                    type="button"
                    className={`btn ${styles.dangerOutlineBtn} ${list.compactBtn}`}
                    onClick={handleBulkDelete}
                    disabled={submitting}
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            )}

            {filteredTalents.length === 0 ? (
              <div className={list.empty}>条件に一致するタレントがいません。</div>
            ) : (
              <div className={list.tableWrap}>
                <table className={list.table}>
                  <thead>
                    <tr>
                      <th aria-label="選択"></th>
                      <th>タレント</th>
                      <th>所属グループ</th>
                      <th>リンク</th>
                      <th aria-label="操作"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTalents.map((talent) => {
                      const selected = selectedIds.includes(talent.id);
                      return (
                        <tr key={talent.id} className={selected ? list.rowSelected : undefined}>
                          <td className={list.cellCheck}>
                            <input
                              type="checkbox"
                              className={list.checkbox}
                              aria-label={`${talent.name}を選択`}
                              checked={selected}
                              onChange={() => handleSelectRow(talent.id)}
                            />
                          </td>
                          <td className={list.cellTalent}>
                            <div className={list.talent}>
                              <Avatar photo={talent.photo} name={talent.name} className={list.avatar} size={96} />
                              <div className={list.talentText}>
                                <span className={list.name}>{talent.name}</span>
                                {talent.english_name && <span className={list.english}>{talent.english_name}</span>}
                                <code className={list.id} title={talent.id}>{talent.id}</code>
                              </div>
                            </div>
                          </td>
                          <td className={list.cellGroup}>
                            <span className={`${list.groupBadge} ${talent.group ? '' : list.groupNone}`}>
                              {talent.group || '未設定'}
                            </span>
                          </td>
                          <td className={list.cellLinks}>
                            <div className={list.links}>
                              <a
                                href={`https://www.youtube.com/channel/${talent.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className={list.link}
                              >
                                YouTube
                              </a>
                              {talent.twitter && (
                                <a
                                  href={`https://twitter.com/${talent.twitter}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={list.link}
                                >
                                  @{talent.twitter}
                                </a>
                              )}
                            </div>
                          </td>
                          <td className={list.cellActions}>
                            <div className={list.actions}>
                              <button
                                type="button"
                                className={`btn btn-secondary ${styles.actionBtnSmall} ${list.editBtn}`}
                                onClick={() => openEditModal(talent)}
                              >
                                ✏️ 編集
                              </button>
                              <button
                                type="button"
                                className={list.iconBtn}
                                onClick={() => handleRefresh([talent])}
                                disabled={!!refreshing}
                                title="Holodexから再取得"
                                aria-label={`${talent.name}を再取得`}
                              >
                                🔄
                              </button>
                              <button
                                type="button"
                                className={`${list.iconBtn} ${list.iconBtnDanger}`}
                                onClick={() => handleDeleteTalent(talent)}
                                title="削除"
                                aria-label={`${talent.name}を削除`}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* グループ管理 */}
      <details className={`glass-panel ${styles.card} ${styles.stackedCard} ${styles.groupDetails}`}>
        <summary className={styles.groupSummary}>
          🏷️ 所属グループ管理 ({dbGroups.length})
        </summary>
        <p className={styles.cardDesc}>
          タレントの分類に使う所属グループ（期生）です。追加したグループはタレント編集時の選択肢に表示されます。
        </p>

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
                >
                  🗑️ 削除
                </button>
              </div>
            ))}
          </div>
        )}
      </details>

      {/* 編集・手動追加モーダル */}
      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {modalMode === 'add' ? '✍️ 手動でタレントを追加' : '✏️ タレント情報を編集'}
              </h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => setModalOpen(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className={styles.modalForm}>
              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formField}>
                <label htmlFor="talent-id" className={styles.fieldLabel}>
                  YouTube チャンネルID (必須)
                </label>
                <input
                  id="talent-id"
                  type="text"
                  className={styles.modalInput}
                  placeholder="例: UCxxxxxxxxxxxxxxxxxxxxxx"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  disabled={modalMode === 'edit'}
                />
                {modalMode === 'edit' && (
                  <span className={styles.fieldHint}>チャンネルIDは変更できません。</span>
                )}
              </div>

              <div className={styles.formRow}>
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
                      placeholder="グループ名を入力（例: 4期生）"
                      value={customGroupVal}
                      onChange={(e) => setCustomGroupVal(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <details className={styles.advancedDetails}>
                <summary className={styles.advancedSummary}>詳細設定（英語名・写真・Twitter・説明）</summary>

                <div className={styles.formField}>
                  <label htmlFor="talent-eng" className={styles.fieldLabel}>英語名</label>
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
                  <label htmlFor="talent-photo" className={styles.fieldLabel}>写真URL</label>
                  <input
                    id="talent-photo"
                    type="text"
                    className={styles.modalInput}
                    placeholder="https://...（空欄なら頭文字アイコン）"
                    value={formPhoto}
                    onChange={(e) => setFormPhoto(e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <label htmlFor="talent-twitter" className={styles.fieldLabel}>Twitter ID (@抜き)</label>
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
                  <label htmlFor="talent-desc" className={styles.fieldLabel}>説明 / プロフィール</label>
                  <textarea
                    id="talent-desc"
                    className={styles.modalTextarea}
                    placeholder="タレントの紹介文..."
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
              </details>

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

      {bulkModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalContent}`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>➕ タレントを追加</h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => !bulkSubmitting && setBulkModalOpen(false)}>
                ×
              </button>
            </div>
            
            <div className={styles.modalForm}>
              <p className={styles.cardDesc} style={{ marginBottom: '0.5rem' }}>
                YouTubeチャンネルIDを入力してください（複数は改行またはカンマ区切り）。名前・写真・Twitterなどは自動で取得します。
              </p>
              
              <div className={styles.formField}>
                <label htmlFor="add-group" className={styles.fieldLabel}>所属グループ</label>
                <select
                  id="add-group"
                  className={styles.modalInput}
                  value={bulkGroup}
                  onChange={(e) => setBulkGroup(e.target.value)}
                  disabled={bulkSubmitting}
                >
                  <option value="">自動（取得した値を使う）</option>
                  {dbGroups.map((g) => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              <textarea
                className={styles.modalTextarea}
                style={{ minHeight: '120px' }}
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
                          {log.status === 'error' && log.message === FETCH_FAILED_MESSAGE && (
                            <button
                              type="button"
                              className={styles.logRetryBtn}
                              onClick={() => {
                                setBulkModalOpen(false);
                                openManualModal(log.id);
                              }}
                            >
                              手動で入力
                            </button>
                          )}
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
                  {bulkSubmitting ? '処理中...' : '取得して追加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
