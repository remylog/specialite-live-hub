import BrandCard from './BrandCard';
import styles from './Splash.module.css';

// アプリを開いた直後に出るスプラッシュ。CSSアニメーションだけで消えるので、JSの読み込みを待たない。
// 同じタブ内で2回目以降は出さない(html[data-splash="seen"] で非表示)
const SESSION_SCRIPT = `try{var k='specialite_splash_seen';if(sessionStorage.getItem(k)){document.documentElement.dataset.splash='seen'}else{sessionStorage.setItem(k,'1')}}catch(e){}`;

export default function Splash() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SESSION_SCRIPT }} />
      <div className={`splash ${styles.splash}`} aria-hidden="true">
        <BrandCard />
      </div>
    </>
  );
}
