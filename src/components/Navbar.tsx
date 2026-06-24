'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const navItems = [
    { name: 'ホーム', path: '/' },
    { name: 'スケジュール', path: '/schedule' },
    { name: 'アーカイブ', path: '/archives' },
    { name: 'タレント', path: '/talents' },
    { name: '設定', path: '/settings' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.navbarContainer}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>Specialite</span>
          <span className={styles.logoSub}>Live Hub</span>
        </Link>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

      </div>
    </header>
  );
}
