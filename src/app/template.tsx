// ページ遷移のたびに作り直されるため、表示のたびに入場アニメーションが動く
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
