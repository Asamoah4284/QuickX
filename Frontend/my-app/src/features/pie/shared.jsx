import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '../../lib/format';

export const PIE_STATUS = {
  funding: { label: 'Open for slices', tone: 'brand', help: 'Members can still join.' },
  trading: { label: 'Trading now', tone: 'warn', help: 'Deposits are closed while Maxwell trades.' },
  settling: { label: 'Paying out', tone: 'warn', help: 'Results are being paid into wallets.' },
  settled: { label: 'Finished', tone: 'neutral', help: 'The result has been paid out.' },
  cancelling: { label: 'Refunding', tone: 'neutral', help: 'Deposits are being refunded.' },
  cancelled: { label: 'Cancelled', tone: 'neutral', help: 'Everyone was refunded in full.' },
};

export const OUTCOME = {
  win: { label: 'Profit', tone: 'up' },
  loss: { label: 'Loss', tone: 'down' },
  even: { label: 'Break-even', tone: 'neutral' },
};

export const RISK_TEXT =
  'Pie trading is real trading with real money. You can lose part or all of what you put in. Past results do not promise future ones. Only use money you can afford to lose.';

export function percentFunded(pie) {
  if (!pie?.targetAmount) return 0;
  return Math.min(100, Math.round((Number(pie.raisedAmount || 0) / Number(pie.targetAmount)) * 100));
}

/** A ring that fills up to how much of the Pie is funded. */
export function PieRing({ value = 0, size = 120, stroke = 10, className, children }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className={cx('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-fg/[0.08]" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#pie-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - pct / 100) : c }}
          whileInView={{ strokeDashoffset: c * (1 - pct / 100) }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="pie-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4b8bff" />
            <stop offset="100%" stopColor="#1b5ef5" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Thin bar version for cards. */
export function FundingBar({ pie }) {
  const pct = percentFunded(pie);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-fg/[0.07]">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
