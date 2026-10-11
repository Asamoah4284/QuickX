import React, { useState } from 'react';

const GRADIENT_PALETTES = [
  { id: 'blue', start: '#1B5EF5', end: '#60A5FA', glow: 'rgba(27,94,245,0.4)', text: '#60A5FA' },
  { id: 'emerald', start: '#059669', end: '#34D399', glow: 'rgba(16,185,129,0.4)', text: '#34D399' },
  { id: 'purple', start: '#7C3AED', end: '#C084FC', glow: 'rgba(139,92,246,0.4)', text: '#C084FC' },
  { id: 'amber', start: '#D97706', end: '#FBBF24', glow: 'rgba(245,158,11,0.4)', text: '#FBBF24' },
  { id: 'pink', start: '#DB2777', end: '#F472B6', glow: 'rgba(236,72,153,0.4)', text: '#F472B6' },
  { id: 'cyan', start: '#0891B2', end: '#22D3EE', glow: 'rgba(6,182,212,0.4)', text: '#22D3EE' },
  { id: 'orange', start: '#EA580C', end: '#FB923C', glow: 'rgba(249,115,22,0.4)', text: '#FB923C' },
  { id: 'indigo', start: '#4F46E5', end: '#818CF8', glow: 'rgba(99,102,241,0.4)', text: '#818CF8' },
  { id: 'teal', start: '#0D9488', end: '#2DD4BF', glow: 'rgba(20,184,166,0.4)', text: '#2DD4BF' },
  { id: 'lime', start: '#65A30D', end: '#A3E635', glow: 'rgba(132,204,22,0.4)', text: '#A3E635' },
];

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x, y, radius, innerRadius, startAngle, endAngle) {
  const delta = endAngle - startAngle;
  const safeEndAngle = delta >= 360 ? startAngle + 359.99 : endAngle;

  const startOuter = polarToCartesian(x, y, radius, safeEndAngle);
  const endOuter = polarToCartesian(x, y, radius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, safeEndAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = delta <= 180 ? '0' : '1';

  return [
    'M', startOuter.x, startOuter.y,
    'A', radius, radius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    'Z',
  ].join(' ');
}

export default function PieChartDonut({
  deposits = [],
  targetAmount = 1000,
  raisedAmount = 0,
  size = 320,
  interactive = true,
  showLegend = true,
  theme = 'dark', // 'dark' | 'light'
}) {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [selectedSliceId, setSelectedSliceId] = useState(null);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.43;
  const innerRadius = size * 0.27;

  const remainingAmount = Math.max(0, targetAmount - raisedAmount);
  const fillPercentage = targetAmount > 0 ? Math.min(100, (raisedAmount / targetAmount) * 100) : 0;

  // Process slice angles
  let currentAngle = 0;
  const totalBase = Math.max(targetAmount, raisedAmount);

  const calculatedSlices = deposits.map((dep, index) => {
    const slicePct = dep.slicePercentage || (raisedAmount > 0 ? (dep.amount / raisedAmount) * 100 : 0);
    const angleDelta = totalBase > 0 ? (dep.amount / totalBase) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleDelta;
    currentAngle = endAngle;

    const midAngle = (startAngle + endAngle) / 2;
    const rad = ((midAngle - 90) * Math.PI) / 180.0;
    const explodeDistance = 8;
    const dx = Math.cos(rad) * explodeDistance;
    const dy = Math.sin(rad) * explodeDistance;

    const pal = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];

    // Tier badge
    let tier = 'Member';
    if (slicePct >= 30) tier = '🐋 Whale';
    else if (slicePct >= 15) tier = '🐬 Dolphin';
    else if (slicePct >= 5) tier = '🦈 Shark';

    return {
      id: dep._id || `slice-${index}`,
      user: dep.userId?.fullName || `Participant #${index + 1}`,
      avatar: dep.userId?.profilePicture,
      amount: dep.amount,
      slicePercentage: Number(slicePct.toFixed(2)),
      pal,
      gradientId: `pie-grad-${index}`,
      startAngle,
      endAngle,
      dx,
      dy,
      tier,
      path: describeArc(cx, cy, radius, innerRadius, startAngle, endAngle),
    };
  });

  // Remaining unfunded track
  let remainingPath = null;
  if (remainingAmount > 0 && currentAngle < 360) {
    remainingPath = describeArc(cx, cy, radius, innerRadius, currentAngle, 360);
  }

  const activeFocus = hoveredSlice || (selectedSliceId ? calculatedSlices.find((s) => s.id === selectedSliceId) : null);

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative group" style={{ width: size, height: size }}>
        {/* Glow ambient background ring */}
        <div
          className="absolute inset-8 rounded-full blur-2xl opacity-40 transition-all duration-500 pointer-events-none"
          style={{
            background: activeFocus
              ? activeFocus.pal?.glow || 'rgba(59,130,246,0.3)'
              : 'radial-gradient(circle, rgba(27,94,245,0.25) 0%, rgba(99,102,241,0.15) 60%, transparent 100%)',
          }}
        />

        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          <defs>
            {/* Dynamic Linear Gradients for Slices */}
            {calculatedSlices.map((slice) => (
              <linearGradient
                key={slice.gradientId}
                id={slice.gradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={slice.pal.start} />
                <stop offset="100%" stopColor={slice.pal.end} />
              </linearGradient>
            ))}

            {/* Unfilled track gradient */}
            <linearGradient id="unfilled-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.9" />
            </linearGradient>

            {/* Glowing drop shadow filter */}
            <filter id="slice-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Outer Decorative Orbit Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius + 8}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 6"
            className="text-slate-700/50"
          />

          {/* Background base track */}
          <circle
            cx={cx}
            cy={cy}
            r={(radius + innerRadius) / 2}
            fill="none"
            stroke="#0B132B"
            strokeWidth={radius - innerRadius}
            className="opacity-70"
          />

          {/* Unfilled Remaining Pool Slice */}
          {remainingPath && (
            <path
              d={remainingPath}
              fill="url(#unfilled-grad)"
              stroke="#334155"
              strokeWidth="0.8"
              strokeDasharray="3 3"
              className="cursor-pointer transition-all duration-300 hover:opacity-100 opacity-60"
              onMouseEnter={() =>
                interactive &&
                setHoveredSlice({
                  user: 'Open Pool Slices',
                  amount: remainingAmount,
                  slicePercentage: Number(((remainingAmount / targetAmount) * 100).toFixed(1)),
                  pal: { start: '#64748B', end: '#94A3B8', text: '#94A3B8', glow: 'rgba(148,163,184,0.3)' },
                  tier: 'Available',
                })
              }
              onMouseLeave={() => interactive && setHoveredSlice(null)}
            />
          )}

          {/* Member Slices with 3D Explode Hover Effect */}
          {calculatedSlices.map((slice) => {
            const isHovered = activeFocus?.id === slice.id;
            return (
              <g
                key={slice.id}
                style={{
                  transform: isHovered
                    ? `translate(${slice.dx}px, ${slice.dy}px)`
                    : 'translate(0px, 0px)',
                  transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease',
                  cursor: interactive ? 'pointer' : 'default',
                  filter: isHovered ? 'url(#slice-glow)' : 'none',
                }}
                onMouseEnter={() => interactive && setHoveredSlice(slice)}
                onMouseLeave={() => interactive && setHoveredSlice(null)}
                onClick={() =>
                  interactive &&
                  setSelectedSliceId(selectedSliceId === slice.id ? null : slice.id)
                }
              >
                <path
                  d={slice.path}
                  fill={`url(#${slice.gradientId})`}
                  stroke={isHovered ? '#FFFFFF' : '#0F172A'}
                  strokeWidth={isHovered ? 2.5 : 1.2}
                />
              </g>
            );
          })}

          {/* Inner Decorative Hub Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={innerRadius - 4}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-700/60"
          />
        </svg>

        {/* Center Donut Hole HUD Display */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-3"
          style={{
            width: innerRadius * 2,
            height: innerRadius * 2,
            left: cx - innerRadius,
            top: cy - innerRadius,
          }}
        >
          {activeFocus ? (
            <div className="flex flex-col items-center justify-center animate-fade-in space-y-1">
              <span
                className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-md"
                style={{
                  color: activeFocus.pal?.text || '#60A5FA',
                  backgroundColor: `${activeFocus.pal?.start || '#1B5EF5'}25`,
                }}
              >
                {activeFocus.tier || 'Backer'}
              </span>

              <span className="text-xl font-black text-white tracking-tight leading-none">
                {activeFocus.slicePercentage}%
              </span>

              <span className="text-[11px] font-bold text-slate-300 leading-none">
                GH₵{activeFocus.amount.toLocaleString()}
              </span>

              <span className="text-[9px] text-slate-400 font-medium truncate max-w-[110px] block">
                {activeFocus.user}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-1">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Funded
              </span>

              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-2xl font-black text-white tracking-tight leading-none">
                  {fillPercentage.toFixed(0)}
                </span>
                <span className="text-xs font-bold text-blue-400">%</span>
              </div>

              <span className="text-[10px] font-bold text-slate-300 block truncate max-w-[100px]">
                GH₵{raisedAmount.toLocaleString()}
              </span>

              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-semibold block">
                Target GH₵{targetAmount.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend & Participant Slice Breakdown */}
      {showLegend && calculatedSlices.length > 0 && (
        <div className="mt-5 w-full max-w-md space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2 pb-1 border-b border-slate-800/80">
            <span className="flex items-center gap-1.5">
              <span>Slice Holders ({calculatedSlices.length})</span>
            </span>
            <span>Slice Stake</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {calculatedSlices.map((slice, i) => {
              const isSelected = activeFocus?.id === slice.id;
              return (
                <div
                  key={slice.id}
                  onMouseEnter={() => interactive && setHoveredSlice(slice)}
                  onMouseLeave={() => interactive && setHoveredSlice(null)}
                  onClick={() =>
                    interactive &&
                    setSelectedSliceId(selectedSliceId === slice.id ? null : slice.id)
                  }
                  className={`flex items-center justify-between p-2.5 rounded-2xl text-xs transition-all duration-200 cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-800/90 border-blue-500/60 shadow-lg shadow-blue-500/10 scale-[1.01]'
                      : 'bg-slate-900/60 border-slate-800/60 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-black text-slate-500 w-3.5 text-center">
                      #{i + 1}
                    </span>

                    <div
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${slice.pal.start}, ${slice.pal.end})`,
                        boxShadow: `0 0 8px ${slice.pal.glow}`,
                      }}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold truncate max-w-[120px]">
                          {slice.user}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                          {slice.tier}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-slate-300 font-semibold text-[11px]">
                      GH₵{slice.amount.toLocaleString()}
                    </span>

                    <span
                      className="px-2 py-0.5 rounded-lg text-[10px] font-black tracking-tight"
                      style={{
                        backgroundColor: `${slice.pal.start}25`,
                        color: slice.pal.text,
                        border: `1px solid ${slice.pal.start}50`,
                      }}
                    >
                      {slice.slicePercentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
