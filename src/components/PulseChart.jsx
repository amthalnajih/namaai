// PulseChart.jsx
// العنصر البصري المميز بالتصميم: خط نبض (زي جهاز مراقبة القلب) يُرسم فعليًا
// من مصفوفة التنبؤ الحقيقية (forecast) القادمة من الباك إند — مو رسمة ديكورية.
// يتحول لونه من نعناعي (سليم) لمرجاني (عجز متوقع) عند نقطة العبور تحت الصفر.

export default function PulseChart({
  data,
  height = 120,
  showAxis = false,
  showZeroLine = true,
  deficitDay = null,
}) {
  if (!data || data.length === 0) return null;

  const width = 1000; // viewBox عرضي ثابت، يتمدد فعليًا عبر CSS
  const values = data.map((d) => d.balance);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const padY = 10;

  const scaleX = (i) => (i / (data.length - 1)) * width;
  const scaleY = (v) => {
    const t = (v - min) / range;
    return height - padY - t * (height - padY * 2);
  };

  const points = data.map((d, i) => [scaleX(i), scaleY(d.balance)]);

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  const zeroY = scaleY(0);
  const hasDeficit = deficitDay !== null && deficitDay !== undefined;
  const strokeColor = hasDeficit ? "var(--coral)" : "var(--mint)";
  const gradientId = hasDeficit ? "pulseGradientCoral" : "pulseGradientMint";

  const lastPoint = points[points.length - 1];
  const deficitPoint = hasDeficit && data[deficitDay - 1] ? points[deficitDay - 1] : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: `${height}px`, display: "block", overflow: "visible" }}
      role="img"
      aria-label={hasDeficit ? "خط النبض المالي — يظهر عجز متوقع" : "خط النبض المالي — الوضع مستقر"}
    >
      <defs>
        <linearGradient id="pulseGradientMint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#35d9a6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#35d9a6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pulseGradientCoral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6259" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ff6259" stopOpacity="0" />
        </linearGradient>
      </defs>

      {showZeroLine && min < 0 && (
        <line
          x1="0"
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
      )}

      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />

      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {deficitPoint && (
        <g>
          <circle cx={deficitPoint[0]} cy={deficitPoint[1]} r="5" fill="var(--coral)" />
          <circle cx={deficitPoint[0]} cy={deficitPoint[1]} r="9" fill="none" stroke="var(--coral)" strokeWidth="1.5" opacity="0.5" />
        </g>
      )}

      {!hasDeficit && lastPoint && (
        <g className="pulse-dot">
          <circle cx={lastPoint[0]} cy={lastPoint[1]} r="5" fill="var(--mint)" />
        </g>
      )}

      {showAxis && (
        <text x="4" y="14" fill="var(--muted)" fontSize="20" fontFamily="IBM Plex Mono, monospace">
          اليوم 1
        </text>
      )}
    </svg>
  );
}
