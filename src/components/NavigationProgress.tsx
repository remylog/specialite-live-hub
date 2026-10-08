'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import BrandCard from './BrandCard';
import styles from './NavigationProgress.module.css';

// ページ移動のたびに出すロード画面の最低表示時間(ミリ秒)。1000〜2000くらいが目安
const MIN_DISPLAY_MS = 1200;
// 何かの理由で遷移が完了しなかった場合に、強制的に閉じるまでの時間
const MAX_DISPLAY_MS = 10000;

type Phase = 'idle' | 'loading' | 'done';

// 内部リンクをクリックして画面を移動するとき、全画面のロード画面と進行バーを出す。
// 移動が完了していても、最低 MIN_DISPLAY_MS は表示する
export default function NavigationProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const [overlay, setOverlay] = useState(false);
  const startedAt = useRef(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest('a');
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      if (closeTimer.current) clearTimeout(closeTimer.current);
      startedAt.current = Date.now();
      // 動きを減らす設定の端末では、強制的な待ち時間を設けず進行バーだけにする
      setOverlay(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      setPhase('loading');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // パスが変わったら完了する(最低表示時間が残っていれば、その分待つ)
  useEffect(() => {
    if (phase !== 'loading') return;
    const wait = overlay ? Math.max(0, MIN_DISPLAY_MS - (Date.now() - startedAt.current)) : 0;
    closeTimer.current = setTimeout(() => setPhase('done'), wait);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
    // pathname が変わった瞬間だけ実行する(phase の変化では再実行しない)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 完了後はフェードアウトしてから消す。遷移が終わらない場合の安全弁もここで持つ
  useEffect(() => {
    if (phase === 'idle') return;
    const timer = setTimeout(
      () => {
        setPhase('idle');
        setOverlay(false);
      },
      phase === 'done' ? 500 : MAX_DISPLAY_MS
    );
    return () => clearTimeout(timer);
  }, [phase]);

  // ロード画面の表示中は、新しいページの入場アニメーションを止めておき、
  // ロード画面が消え始めるタイミングで再生する(html[data-navigating] を参照)
  useEffect(() => {
    const root = document.documentElement;
    if (phase === 'loading' && overlay) root.dataset.navigating = 'true';
    else delete root.dataset.navigating;
    return () => {
      delete root.dataset.navigating;
    };
  }, [phase, overlay]);

  if (phase === 'idle') return null;
  return (
    <>
      {overlay && (
        <div className={`${styles.overlay} ${phase === 'done' ? styles.overlayOut : ''}`} aria-hidden="true">
          <BrandCard />
        </div>
      )}
      <div className={`${styles.bar} ${phase === 'done' ? styles.done : styles.loading}`} aria-hidden="true" />
    </>
  );
}
