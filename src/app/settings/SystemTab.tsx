'use client';

import { useEffect, useState } from 'react';
import styles from './settings.module.css';
import { ADMIN_KEY_STORAGE, getAdminHeaders } from './adminHeaders';

type Result = { success: boolean; message: string } | null;
type RecommendLog = { id: string; status: string; message: string; count: number; createdAt: string };

function ResultBox({ result }: { result: Result }) {
  if (!result) return null;
  return (
    <div className={`${styles.testResultCard} ${result.success ? styles.testSuccess : styles.testFailed}`}>
      {result.success ? '✅ ' : '❌ '}
      {result.message}
    </div>
  );
}

export default function SystemTab() {
  const [adminKey, setAdminKey] = useState('');
  const [adminKeySaved, setAdminKeySaved] = useState(false);

  const [testingDiscord, setTestingDiscord] = useState(false);
  const [discordResult, setDiscordResult] = useState<Result>(null);

  const [geminiEnabled, setGeminiEnabled] = useState(false);
  const [updatingRecommend, setUpdatingRecommend] = useState(false);
  const [recommendResult, setRecommendResult] = useState<Result>(null);
  const [latestLog, setLatestLog] = useState<RecommendLog | null>(null);

  const fetchLatestLog = async () => {
    try {
      const res = await fetch('/api/recommend/logs', { headers: getAdminHeaders() });
      if (res.ok) {
        const data: RecommendLog[] = await res.json();
        setLatestLog(data[0] ?? null);
      }
    } catch (err) {
      console.error('Failed to fetch recommend logs:', err);
    }
  };

  // マウント時に localStorage / サーバー設定を読み込む
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdminKey(localStorage.getItem(ADMIN_KEY_STORAGE) || '');
    fetch('/api/features')
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => {
        if (f?.gemini) {
          setGeminiEnabled(true);
          fetchLatestLog();
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveAdminKey = () => {
    localStorage.setItem(ADMIN_KEY_STORAGE, adminKey.trim());
    setAdminKeySaved(true);
    setTimeout(() => setAdminKeySaved(false), 2000);
  };

  const handleTestDiscord = async () => {
    try {
      setTestingDiscord(true);
      setDiscordResult(null);
      const res = await fetch('/api/live/test-discord', { method: 'POST', headers: getAdminHeaders() });
      const data = await res.json();
      setDiscordResult({ success: res.ok, message: res.ok ? data.message : data.error || 'テスト送信に失敗しました。' });
    } catch (err) {
      console.error(err);
      setDiscordResult({ success: false, message: '通信エラーが発生しました。' });
    } finally {
      setTestingDiscord(false);
    }
  };

  const handleUpdateRecommend = async () => {
    if (!window.confirm('昨日のイチオシ配信のおすすめ情報を再生成します。よろしいですか？')) return;
    try {
      setUpdatingRecommend(true);
      setRecommendResult(null);
      const res = await fetch('/api/recommend', { method: 'POST', headers: getAdminHeaders() });
      const data = await res.json();
      setRecommendResult({ success: res.ok, message: res.ok ? data.message : data.error || '生成に失敗しました。' });
      await fetchLatestLog();
    } catch (err) {
      console.error(err);
      setRecommendResult({ success: false, message: '通信エラーが発生しました。' });
    } finally {
      setUpdatingRecommend(false);
    }
  };

  // バックアップ(エクスポート/インポート)
  const handleExport = async () => {
    try {
      const res = await fetch('/api/talents/export', { headers: getAdminHeaders() });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'バックアップの保存に失敗しました。');
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
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'バックアップ処理中にエラーが発生しました。');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.groups || !parsed.talents) {
          alert('不正なバックアップ形式です。groupsとtalentsが含まれている必要があります。');
          return;
        }

        const confirmed = window.confirm(
          `グループ ${parsed.groups.length} 件、タレント ${parsed.talents.length} 件を復元しますか？\n既存のデータは上書きされます。この操作は元に戻せません。`
        );
        if (!confirmed) return;

        const res = await fetch('/api/talents/import', { method: 'POST', headers: getAdminHeaders(), body: content });
        if (res.ok) {
          alert('復元が完了しました。');
          window.dispatchEvent(new Event('favoritesChange'));
        } else {
          const errorData = await res.json().catch(() => ({}));
          alert(errorData.error || '復元に失敗しました。');
        }
      } catch (err) {
        console.error(err);
        alert('ファイルの読み込みに失敗しました。無効なJSONファイルです。');
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file);
  };

  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_ADMIN_AUTH === 'true';

  return (
    <>
      <section className={`glass-panel ${styles.card}`}>
        <h2 className={styles.cardTitle}>🔑 管理者キー</h2>
        {bypassAuth ? (
          <p className={styles.cardDesc} style={{ color: '#10b981', fontWeight: 'bold' }}>
            管理者キー認証は無効化されています(前段の認証で保護されている設定)。この端末での設定は不要です。
          </p>
        ) : (
          <>
            <p className={styles.cardDesc}>
              管理操作にはサーバーの「ADMIN_SECRET_KEY」と同じ値が必要です。キーはこのブラウザ内にのみ保存されます。
            </p>
            <div className={styles.inlineForm}>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="ADMIN_SECRET_KEY の値を入力..."
                className={styles.input}
                autoComplete="off"
              />
              <button type="button" className="btn btn-primary" onClick={handleSaveAdminKey}>
                {adminKeySaved ? '✅ 保存済み' : '保存する'}
              </button>
            </div>
          </>
        )}
      </section>

      <section className={`glass-panel ${styles.card} ${styles.stackedCard}`}>
        <h2 className={styles.cardTitle}>💾 バックアップ</h2>
        <p className={styles.cardDesc}>
          タレントとグループをJSONファイルに保存、またはファイルから復元します。復元すると既存データは上書きされます。
        </p>
        <div className={styles.headerActions}>
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            📥 バックアップを保存
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            📤 バックアップから復元
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </section>

      <section className={`glass-panel ${styles.card} ${styles.stackedCard}`}>
        <h2 className={styles.cardTitle}>🔔 Discord 通知テスト</h2>
        <p className={styles.cardDesc}>
          環境変数「DISCORD_WEBHOOK_URL」宛てにテストメッセージを送信して疎通確認を行います。
        </p>
        <div className={styles.testBlock}>
          <button type="button" className="btn btn-primary" onClick={handleTestDiscord} disabled={testingDiscord} aria-busy={testingDiscord}>
            {testingDiscord ? '送信中...' : '📨 テスト通知を送信'}
          </button>
          <ResultBox result={discordResult} />
        </div>
      </section>

      {geminiEnabled && (
        <section className={`glass-panel ${styles.card} ${styles.stackedCard}`}>
          <h2 className={styles.cardTitle}>🤖 Gemini AI おすすめ</h2>
          <p className={styles.cardDesc}>
            昨日の配信データからイチオシ配信を選定します。通常は自動実行されますが、手動で更新もできます。
          </p>
          <div className={styles.testBlock}>
            <button type="button" className="btn btn-primary" onClick={handleUpdateRecommend} disabled={updatingRecommend} aria-busy={updatingRecommend}>
              {updatingRecommend ? '生成更新中...' : '🔄 今すぐ更新'}
            </button>
            <ResultBox result={recommendResult} />
            <p className={styles.cardDesc}>
              {latestLog
                ? `前回の実行: ${new Date(latestLog.createdAt).toLocaleString()} / ${
                    latestLog.status === 'success' ? '成功' : '失敗'
                  }(${latestLog.count}件) ${latestLog.message}`
                : '実行履歴はありません。'}
            </p>
          </div>
        </section>
      )}
    </>
  );
}
