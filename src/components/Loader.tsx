import styles from './Loader.module.css';

interface LoaderProps {
  label?: string;
  // inline: 文中・ボタン近くに置く小さい表示 / block: 領域の中央に置く大きい表示
  variant?: 'inline' | 'block';
}

// 3色の点が跳ねるローディング表示
export default function Loader({ label = '読み込み中', variant = 'block' }: LoaderProps) {
  return (
    <div className={`${styles.loader} ${variant === 'block' ? styles.block : styles.inline}`} role="status" aria-live="polite">
      <span className={styles.dots} aria-hidden="true">
        <i /><i /><i />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
