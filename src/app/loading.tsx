import Loader from '@/components/Loader';

// ルート切り替え中のフォールバック
export default function Loading() {
  return (
    <div className="app-container">
      <Loader />
    </div>
  );
}
