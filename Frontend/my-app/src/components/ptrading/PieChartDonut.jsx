import React, { useState } from 'react';

const SLICE_COLORS = [
  '#1B5EF5', // Vibrant QuickX Blue
  '#10B981', // Emerald Green
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#84CC16', // Lime
];

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x, y, radius, innerRadius, startAngle, endAngle) {
  // Clamp angle delta to slightly below 360 to prevent SVG rendering artifacts
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
    'Z'
  ].join(' ');
}

export default function PieChartDonut({
  deposits = [],
  targetAmount = 1000,
  raisedAmount = 0,
  size = 300,
  interactive = true,
  showLegend = true,
}) {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.42;
  const innerRadius = size * 0.26;

  // Remaining unfilled pool portion
  const remainingAmount = Math.max(0, targetAmount - raisedAmount);
  const fillPercentage = targetAmount > 0 ? Math.min(100, (raisedAmount / targetAmount) * 100) : 0;

  // Build slices data
  let currentAngle = 0;
  const calculatedSlices = [];

  deposits.forEach((dep, index) => {
    const slicePct = dep.slicePercentage || (raisedAmount > 0 ? (dep.amount / raisedAmount) * 100 : 0);
    // Angle proportion based on targetAmount (or raisedAmount if over target)
    const totalBase = Math.max(targetAmount, raisedAmount);
    const angleDelta = totalBase > 0 ? (dep.amount / totalBase) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleDelta;
    currentAngle = endAngle;

    calculatedSlices.push({
      id: dep._id || `slice-${index}`,
      user: dep.userId?.fullName || `Participant #${index + 1}`,
      amount: dep.amount,
      slicePercentage: Number(slicePct.toFixed(2)),
      color: SLICE_COLORS[index % SLICE_COLORS.length],
      startAngle,
      endAngle,
      path: describeArc(cx, cy, radius, innerRadius, startAngle, endAngle),
      avatar: dep.userId?.profilePicture,
    });
  });

  // Remaining un-funded slice
  let remainingPath = null;
  if (remainingAmount > 0 && currentAngle < 360) {
    remainingPath = describeArc(cx, cy, radius, innerRadius, currentAngle, 360);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible drop-shadow-md"
        >
          {/* Background circle track */}
          <circle
            cx={cx}
            cy={cy}
            r={(radius + innerRadius) / 2}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={radius - innerRadius}
          />

          {/* Unfunded remainder slice */}
          {remainingPath && (
            <path
              d={remainingPath}
              fill="#E2E8F0"
              className="opacity-60 transition-opacity hover:opacity-80"
              onMouseEnter={() =>
                interactive &&
                setHoveredSlice({
                  user: 'Open Pool Slices',
                  amount: remainingAmount,
                  slicePercentage: Number(((remainingAmount / targetAmount) * 100).toFixed(1)),
                  color: '#94A3B8',
                })
              }
              onMouseLeave={() => interactive && setHoveredSlice(null)}
            />
          )}

          {/* Member deposited slices */}
          {calculatedSlices.map((slice) => {
            const isHovered = hoveredSlice?.id === slice.id;
            return (
              <path
                key={slice.id}
                d={slice.path}
                fill={slice.color}
                stroke="#FFFFFF"
                strokeWidth={calculatedSlices.length > 1 ? 1.5 : 0}
                className="cursor-pointer transition-all duration-200"
                style={{
                  transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                  transformOrigin: `${cx}px ${cy}px`,
                  filter: isHovered ? 'brightness(1.1) drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : 'none',
                }}
                onMouseEnter={() => interactive && setHoveredSlice(slice)}
                onMouseLeave={() => interactive && setHoveredSlice(null)}
              />
            );
          })}
        </svg>

        {/* Center Donut Hole Content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4"
          style={{
            width: innerRadius * 2,
            height: innerRadius * 2,
            left: cx - innerRadius,
            top: cy - innerRadius,
          }}
        >
          {hoveredSlice ? (
            <div className="animate-fade-in flex flex-col items-center">
              <span
                className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[100px]"
                style={{ color: hoveredSlice.color }}
              >
                {hoveredSlice.user}
              </span>
              <span className="text-base font-extrabold text-slate-900 leading-tight">
                {hoveredSlice.slicePercentage}%
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                GH₵{hoveredSlice.amount.toLocaleString()}
              </span>
            </div>
          ) : (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Funded
              </span>
              <span className="text-xl font-black text-slate-900 tracking-tight block">
                {fillPercentage.toFixed(0)}%
              </span>
              <span className="text-[10px] font-medium text-slate-500 block truncate max-w-[90px]">
                GH₵{raisedAmount.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {showLegend && calculatedSlices.length > 0 && (
        <div className="mt-4 w-full max-w-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2 px-1">
            <span>Slice Holders ({calculatedSlices.length})</span>
            <span>Slice %</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {calculatedSlices.map((slice) => (
              <div
                key={slice.id}
                onMouseEnter={() => interactive && setHoveredSlice(slice)}
                onMouseLeave={() => interactive && setHoveredSlice(null)}
                className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  hoveredSlice?.id === slice.id ? 'bg-slate-100 ring-1 ring-slate-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-slate-800 font-medium truncate max-w-[140px]">
                    {slice.user}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-bold shrink-0">
                  <span className="text-slate-500 text-[11px]">
                    GH₵{slice.amount.toLocaleString()}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px]"
                    style={{
                      backgroundColor: `${slice.color}15`,
                      color: slice.color,
                    }}
                  >
                    {slice.slicePercentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
