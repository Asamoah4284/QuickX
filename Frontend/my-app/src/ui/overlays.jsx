import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { cx } from '../lib/format';

const EASE = [0.22, 1, 0.36, 1];

function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

function useEscape(active, onClose) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);
}

/** Centered dialog. On phones it slides up from the bottom. */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const titleId = useId();
  useLockBodyScroll(open);
  useEscape(open, onClose);
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-5xl' };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={cx(
              'relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-ink-850 shadow-card sm:rounded-3xl',
              widths[size]
            )}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
              <h2 id={titleId} className="text-lg font-semibold text-fg">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-fg-muted transition hover:bg-white/[0.06] hover:text-fg"
                aria-label="Close"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {footer ? <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

/** Panel that slides in from the right (mobile menu, side forms). */
export function Sheet({ open, onClose, children, label = 'Menu' }) {
  useLockBodyScroll(open);
  useEscape(open, onClose);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col border-l border-line bg-ink-900"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            {children}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

/** Segmented tabs with a pill that slides to the active tab. */
export function Tabs({ tabs, value, onChange, className }) {
  const groupId = useId();
  return (
    <div
      role="tablist"
      className={cx('inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-ink-900 p-1', className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cx(
              'relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              active ? 'text-white' : 'text-fg-muted hover:text-fg'
            )}
          >
            {active ? (
              <motion.span
                layoutId={`tab-pill-${groupId}`}
                className="absolute inset-0 rounded-full bg-brand-600"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative flex items-center gap-2">
              {tab.label}
              {tab.count != null ? (
                <span className={cx('tabular text-xs', active ? 'text-white/80' : 'text-fg-subtle')}>{tab.count}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
