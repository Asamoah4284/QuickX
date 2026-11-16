import { useEffect, useRef, useState } from 'react';
import { useCurrency } from '../utils/currencyStore';
import { cx } from '../lib/format';
import { Input } from './primitives';

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Admin price box that works in the display currency chosen in Admin > Pricing.
 *
 * - `value` is always cedis, and `onChange` always receives cedis, so forms and the
 *   database stay in GH₵ (Paystack charges cedis).
 * - When the display currency is USD, the admin types dollars and sees the cedi
 *   amount that will be saved underneath.
 *
 * `onChange` gets an event-like `{ target: { name, value } }`, so it drops into
 * existing `handleChange` / `set('price')` handlers unchanged.
 */
export default function MoneyInput({ value, onChange, name, className, plain = false, hintClassName, ...rest }) {
  const { currency, exchangeRateUsdToGhs: rate } = useCurrency();
  const usd = currency === 'USD';

  const shown = (ghs) => {
    if (ghs === '' || ghs == null || Number.isNaN(Number(ghs))) return '';
    return usd ? String(round2(Number(ghs) / rate)) : String(ghs);
  };

  const [text, setText] = useState(() => shown(value));
  const lastSent = useRef(value);
  const lastMode = useRef(`${usd}:${rate}`);

  // Follow the form when it changes the value itself (loading a record, resetting),
  // or when the display currency changes. Not while the admin is typing.
  useEffect(() => {
    const mode = `${usd}:${rate}`;
    if (String(value ?? '') !== String(lastSent.current ?? '') || mode !== lastMode.current) {
      setText(shown(value));
      lastSent.current = value;
      lastMode.current = mode;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, usd, rate]);

  const change = (e) => {
    const typed = e.target.value;
    setText(typed);
    const ghs = typed === '' ? '' : usd ? String(round2(Number(typed) * rate)) : typed;
    lastSent.current = ghs;
    onChange?.({ target: { name, value: ghs } });
  };

  const Box = plain ? 'input' : Input;
  return (
    <>
      <Box
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        name={name}
        value={text}
        onChange={change}
        className={className}
        {...rest}
      />
      {usd && text !== '' ? (
        <p className={cx('mt-1 text-xs text-fg-subtle', hintClassName)}>
          Saved as GH₵{round2(Number(text) * rate).toLocaleString()} (at GH₵{rate} per $1). Members pay in cedis.
        </p>
      ) : null}
    </>
  );
}

/** "$" or "GH₵", for labels next to a MoneyInput. Re-renders when the setting changes. */
export function useMoneyUnit() {
  const { currency } = useCurrency();
  return currency === 'USD' ? '$' : 'GH₵';
}

/** Same as useMoneyUnit, as a component for JSX labels: `Price (<MoneyUnit />)`. */
export function MoneyUnit() {
  return useMoneyUnit();
}
