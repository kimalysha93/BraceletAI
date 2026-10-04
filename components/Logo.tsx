// A little bracelet of knots, drawn as an arc of beads.
const BEADS = ["#FF7B6B", "#FFD84D", "#A8E6CF", "#7CC8F2", "#C7B8F5", "#F0509A", "#FF9A3C"];

export default function Logo({ size = 34 }: { size?: number }) {
  const cx = 20;
  const cy = 20;
  const r = 13;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1E4EA" strokeWidth="2" />
      {BEADS.map((hex, i) => {
        const a = (-200 + i * (220 / (BEADS.length - 1))) * (Math.PI / 180);
        return (
          <g key={i}>
            <circle cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r="4.6" fill={hex} stroke="rgba(0,0,0,.12)" />
            <circle cx={cx + r * Math.cos(a) - 1.3} cy={cy + r * Math.sin(a) - 1.5} r="1.3" fill="#fff" opacity=".7" />
          </g>
        );
      })}
      <path d="M14 33 q6 5 12 0" fill="none" stroke="#EC5F99" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
