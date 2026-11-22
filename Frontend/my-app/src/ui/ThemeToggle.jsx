import { FiMonitor, FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '../lib/theme';
import { cx } from '../lib/format';

/** Sun / moon button for the top bar. Switches between light and dark. */
export function ThemeButton({ className }) {
  const { theme, setChoice } = useTheme();
  const next = theme === 'light' ? 'dark' : 'light';
  const Icon = theme === 'light' ? FiMoon : FiSun;
  return (
    <button
      type="button"
      onClick={() => setChoice(next)}
      className={cx('rounded-full p-2.5 text-fg-muted transition hover:bg-fg/[0.06] hover:text-fg', className)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

const OPTIONS = [
  { value: 'light', label: 'Light', icon: FiSun },
  { value: 'dark', label: 'Dark', icon: FiMoon },
  { value: 'system', label: 'Device', icon: FiMonitor },
];

/** Light / Dark / Device setting, for Account and the phone menu. */
export function ThemeChoice({ className }) {
  const { choice, setChoice } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className={cx('grid grid-cols-3 gap-1 rounded-2xl border border-line bg-ink-900 p-1', className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setChoice(value)}
            className={cx(
              'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              active ? 'bg-brand-600 text-white shadow-glow' : 'text-fg-muted hover:text-fg'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
