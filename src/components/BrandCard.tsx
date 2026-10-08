import styles from './Splash.module.css';

// スプラッシュ・画面遷移ローディングで共通のロゴカード
export default function BrandCard() {
  return (
    <div className={styles.card}>
      <span className={styles.logo}>Specialite</span>
      <span className={styles.sub}>Live Hub</span>
      <span className={styles.dots}>
        <i /><i /><i />
      </span>
    </div>
  );
}
