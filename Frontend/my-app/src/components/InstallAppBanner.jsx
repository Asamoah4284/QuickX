import { useEffect, useRef, useState } from 'react';
import { FiShare, FiX } from 'react-icons/fi';
import {
  dismissInstallBanner,
  isIosDevice,
  isStandaloneDisplay,
  wasInstallBannerDismissed,
} from '../utils/webPush';

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [shareTip, setShareTip] = useState(false);
  const installOfferedRef = useRef(false);

  useEffect(() => {
    if (wasInstallBannerDismissed() || isStandaloneDisplay()) return undefined;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      installOfferedRef.current = true;
      setDeferredPrompt(e);
      setShareTip(false);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // If no native install prompt (common on iOS), guide users to Share
    const tipTimer = window.setTimeout(() => {
      if (wasInstallBannerDismissed() || isStandaloneDisplay() || installOfferedRef.current) {
        return;
      }
      setShareTip(true);
      setVisible(true);
    }, isIosDevice() ? 2500 : 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.clearTimeout(tipTimer);
    };
  }, []);

  const close = () => {
    dismissInstallBanner();
    setVisible(false);
    setDeferredPrompt(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      /* user dismissed */
    }
    setDeferredPrompt(null);
    dismissInstallBanner();
    setVisible(false);
  };

  if (!visible) return null;

  const tipCopy = isIosDevice()
    ? 'Tap the Share icon, then Add to Home Screen (or Add Bookmark) to keep Quick-X on your phone.'
    : 'Use Share / the browser menu to Add to Home Screen or bookmark Quick-X for quick access.';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-3 sm:p-4">
      <div className="pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.16)]">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1B5EF5]/10 text-[#1B5EF5]">
          <FiShare className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#0B1F44]">Add Quick-X to your phone</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {shareTip || !deferredPrompt
              ? tipCopy
              : 'Install Quick-X, or use Share to add it to your Home Screen / bookmarks.'}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {deferredPrompt && !shareTip ? (
              <button
                type="button"
                onClick={install}
                className="rounded-lg bg-[#1B5EF5] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1549c4]"
              >
                Install app
              </button>
            ) : null}
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={close}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
