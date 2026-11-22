import { cx } from '../lib/format';

/**
 * The QuickX Learn logo, redrawn as SVG from public/logo.jpg so it stays sharp
 * and works on the dark theme: a ring with a green arc around an open book.
 *
 * `onDark` (default) follows the theme: brand-blue ring, book in the text colour.
 */
export function LogoMark({ size = 36, onDark = true, className }) {
  const ring = onDark ? 'var(--color-brand-500)' : 'var(--color-logo-navy)';
  const book = onDark ? 'var(--color-fg)' : 'var(--color-logo-navy)';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="22.5" cy="24" r="19" stroke={ring} strokeWidth="4" />
      <path d="M26 5.2 A19 19 0 0 1 26 42.8" stroke="var(--color-logo-green)" strokeWidth="3.2" strokeLinecap="round" />
      <g stroke={book} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M22.5 17.5 C20 15.6 16.5 15 12.5 15.5 V31 C16.5 30.5 20 31.1 22.5 33 Z" />
        <path d="M22.5 17.5 C25 15.6 28.5 15 32.5 15.5 V31 C28.5 30.5 25 31.1 22.5 33" />
        <path d="M26 21.5 H29.5 M26 25.5 H29.5" />
      </g>
    </svg>
  );
}

/** Mark plus the two-line "QuickX / Learn" wordmark, as in the original logo. */
export default function Logo({ size = 36, label, className, onDark = true }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} onDark={onDark} />
      <span className="flex flex-col leading-none">
        <span className={cx('text-[1.05rem] font-extrabold tracking-tight', onDark ? 'text-fg' : 'text-logo-navy')}>QuickX</span>
        <span className="mt-0.5 text-[0.8rem] font-bold tracking-tight text-logo-green">
          Learn{label ? <span className="ml-1.5 font-semibold text-fg-subtle">{label}</span> : null}
        </span>
      </span>
    </span>
  );
}
