export function MiniSparkline({ data, color = '#10b981' }: { data: number[]; color?: string }) {
  const pts = data.length < 2 ? [{ value: data[0] || 0 }] : data.map(v => ({ value: v }));
  const max = Math.max(...pts.map(d => d.value), 1);
  const w = 56, h = 28;
  if (pts.length < 2) return <svg width={w} height={h} />;
  const points = pts.map((d, i) => `${(i / (pts.length - 1)) * w},${h - (d.value / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}
