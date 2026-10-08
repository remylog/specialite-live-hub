'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './Navbar.module.css';

type NavItem = { name: string; shortName: string; path: string; icon: ReactNode };

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const navItems: NavItem[] = [
  {
    name: 'ホーム', shortName: 'ホーム', path: '/',
    icon: <svg {...iconProps}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>,
  },
  {
    name: 'スケジュール', shortName: '予定', path: '/schedule',
    icon: <svg {...iconProps}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>,
  },
  {
    name: 'アーカイブ', shortName: 'アーカイブ', path: '/archives',
    icon: <svg {...iconProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></svg>,
  },
  {
    name: 'タレント', shortName: 'タレント', path: '/talents',
    icon: <svg {...iconProps}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
  },
  {
    name: '設定', shortName: '設定', path: '/settings',
    icon: <svg {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const isActive = (path: string) =>
    pathname === path || (path !== '/' && pathname.startsWith(path));

  return (
    <header className={styles.header}>
      <div className={styles.navbarContainer}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>Specialite</span>
          <span className={styles.logoSub}>Live Hub</span>
        </Link>

        <nav className={styles.nav} aria-label="メインメニュー">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              aria-label={item.name}
              aria-current={isActive(item.path) ? 'page' : undefined}
              className={`${styles.navLink} ${isActive(item.path) ? styles.activeLink : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabelFull}>{item.name}</span>
              <span className={styles.navLabelShort}>{item.shortName}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
