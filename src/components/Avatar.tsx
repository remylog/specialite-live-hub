'use client';

import { useState } from 'react';

const PROXY_HOSTS = ['yt3.ggpht.com', 'yt3.googleusercontent.com'];

// 外部サーバーの画像は自サーバー経由(キャッシュ付き)で取得する
function toSrc(photo?: string | null, size = 160): string | null {
  if (!photo) return null;
  try {
    const { hostname } = new URL(photo);
    return PROXY_HOSTS.includes(hostname) ? `/api/avatar?u=${encodeURIComponent(photo)}&s=${size}` : photo;
  } catch {
    return photo;
  }
}

interface AvatarProps {
  photo?: string | null;
  name: string;
  className?: string;
  // 配信する画像サイズ(px)。表示サイズの2倍程度(96 / 160 / 256 / 400)
  size?: 96 | 160 | 256 | 400;
}

// 読み込みに失敗したら1回だけ再試行し、それでもだめなら頭文字を表示する
export default function Avatar({ photo, name, className, size = 160 }: AvatarProps) {
  const [attempt, setAttempt] = useState(0);
  const src = toSrc(photo, size);

  if (!src || attempt >= 2) {
    return (
      <span
        className={className}
        role="img"
        aria-label={name}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--accent-pink)',
          color: 'var(--text-primary)',
          fontWeight: 900,
        }}
      >
        {name.charAt(0)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // 再試行時はキーを変えて再読み込みさせる
      key={attempt}
      src={attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}r=${attempt}`}
      alt={name}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setAttempt((n) => n + 1)}
    />
  );
}
