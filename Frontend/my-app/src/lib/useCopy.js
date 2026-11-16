import { useCallback, useEffect, useRef, useState } from 'react';

/** Copy text to the clipboard. `copied` holds the key of the last thing copied for ~1.6s. */
export function useCopy() {
  const [copied, setCopied] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (text, key = 'default') => {
    const value = String(text ?? '');
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // Older browsers or http: fall back to a hidden textarea.
      try {
        const el = document.createElement('textarea');
        el.value = value;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        ok = document.execCommand('copy');
        document.body.removeChild(el);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(key);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), 1600);
    }
    return ok;
  }, []);

  return { copy, copied };
}
