'use client';

import { useState } from 'react';
import styles from './settings.module.css';
import SystemTab from './SystemTab';
import TalentsTab from './TalentsTab';

type Tab = 'system' | 'talents';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('system');

  return (
    <div className="app-container">
      <div className="page-title">
        <span><span>⚙️</span> アプリケーション管理設定</span>
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'system'}
          className={`${styles.tabButton} ${activeTab === 'system' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('system')}
        >
          ⚙️ システム
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'talents'}
          className={`${styles.tabButton} ${activeTab === 'talents' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('talents')}
        >
          👥 タレント・グループ
        </button>
      </div>

      <div className={styles.container}>
        {activeTab === 'system' ? <SystemTab /> : <TalentsTab />}
      </div>
    </div>
  );
}
