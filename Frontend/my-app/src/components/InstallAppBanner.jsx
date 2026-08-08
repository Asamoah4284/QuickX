import { useEffect, useState } from 'react';
import { FiDownload, FiShare, FiX } from 'react-icons/fi';
import {
  dismissInstallBanner,
  isIosDevice,
  isStandaloneDisplay,
  wasInstallBannerDismissed,
} from '../utils/webPush';

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosTip, setIosTip] = useState(false);

  useEffect(() => {
    if (wasInstallBannerDismissed() || isStandaloneDisplay()) return undefined;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
      setIosTip(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS has no beforeinstallprompt — show Share tip after a short delay
    let iosTimer;
    if (isIosDevice() && !window.navigator.standalone) {
      iosTimer = window.setTimeout(() => {
        if (!wasInstallBannerDismissed()) {
          setIosTip(true);
          setVisible(true);
        }
      }, 4000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      if (iosTimer) window.clearTimeout(iosTimer);
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

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-3 sm:p-4">
      <div className="pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.16)]">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1B5EF5]/10 text-[#1B5EF5]">
          {iosTip ? <FiShare className="h-5 w-5" /> : <FiDownload className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#0B1F44]">Install Quick-X</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {iosTip
              ? 'Tap Share, then Add to Home Screen to use Quick-X like an app and get notifications.'
              : 'Add Quick-X to your home screen for faster access and push notifications.'}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {!iosTip && deferredPrompt ? (
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
