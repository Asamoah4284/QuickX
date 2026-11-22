import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../lib/format';

/* ── Button ─────────────────────────────────────────────────────────────── */

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 ease-out-quint ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap';

const BUTTON_VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-glow hover:bg-brand-500',
  secondary: 'bg-fg/[0.06] text-fg border border-line hover:bg-fg/[0.1] hover:border-line-strong',
  ghost: 'text-fg-muted hover:text-fg hover:bg-fg/[0.06]',
  light: 'bg-white text-ink-950 hover:bg-brand-300',
  danger: 'bg-down/15 text-down border border-down/30 hover:bg-down/25',
};

const BUTTON_SIZES = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
};

/** Renders a <Link> when `to` is given, an <a> when `href` is given, otherwise a <button>. */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', to, href, loading = false, className, children, ...rest },
  ref
) {
  const classes = cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
  const content = (
    <>
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </>
  );
  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} type="button" className={classes} disabled={loading || rest.disabled} {...rest}>
      {content}
    </button>
  );
});

/* ── Surfaces ───────────────────────────────────────────────────────────── */

export function Card({ as: Tag = 'div', interactive = false, className, children, ...rest }) {
  return (
    <Tag
      className={cx(
        'surface',
        interactive &&
          'transition duration-300 ease-out-quint hover:-translate-y-1 hover:border-line-strong hover:shadow-glow',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const BADGE_TONES = {
  neutral: 'bg-fg/[0.06] text-fg-muted border-line',
  brand: 'bg-brand-500/15 text-brand-300 border-brand-400/30',
  up: 'bg-up/12 text-up border-up/30',
  down: 'bg-down/12 text-down border-down/30',
  warn: 'bg-warn/12 text-warn border-warn/30',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Small uppercase label above a section heading. */
export function Eyebrow({ className, children }) {
  return (
    <p className={cx('text-xs font-semibold uppercase tracking-[0.2em] text-brand-400', className)}>{children}</p>
  );
}

export function Container({ className, children }) {
  return <div className={cx('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <header className={cx('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 text-base text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}

/* ── Form fields ────────────────────────────────────────────────────────── */

const FIELD_CLASSES =
  'w-full rounded-xl border border-line bg-ink-900 px-4 text-sm text-fg placeholder:text-fg-subtle ' +
  'transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60';

export function Field({ label, hint, error, htmlFor, className, children }) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-fg">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-down" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(FIELD_CLASSES, 'h-11', className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cx(FIELD_CLASSES, 'py-3', className)} {...rest} />;
});

export const Select = forwardRef(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(FIELD_CLASSES, 'h-11 appearance-none pr-9', className)} {...rest}>
      {children}
    </select>
  );
});

/* ── Feedback ───────────────────────────────────────────────────────────── */

export function Spinner({ className }) {
  return (
    <svg className={cx('animate-spin', className || 'h-5 w-5')} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-fg-muted" role="status">
      <Spinner className="h-7 w-7 text-brand-400" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('skeleton', className)} aria-hidden />;
}

export function Alert({ tone = 'down', className, children }) {
  const tones = {
    down: 'border-down/30 bg-down/10 text-down',
    up: 'border-up/30 bg-up/10 text-up',
    warn: 'border-warn/30 bg-warn/10 text-warn',
    brand: 'border-brand-400/30 bg-brand-500/10 text-brand-300',
  };
  return (
    <div className={cx('rounded-xl border px-4 py-3 text-sm', tones[tone], className)} role="alert">
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cx('surface flex flex-col items-center px-6 py-14 text-center', className)}>
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-fg">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Avatar({ src, name, size = 36, className }) {
  const letters = String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
  return src ? (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={cx('rounded-full object-cover', className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={cx(
        'inline-flex items-center justify-center rounded-full bg-brand-600 font-semibold text-white',
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {letters || '?'}
    </span>
  );
}
