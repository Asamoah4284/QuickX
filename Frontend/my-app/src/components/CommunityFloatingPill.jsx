import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaTelegramPlane } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';

export default function CommunityFloatingPill() {
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // Hide in video player and admin flows
  if (dismissed || pathname.startsWith('/admin') || pathname.startsWith('/school/course/')) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-4 z-40 flex items-center group">
      <a
        href="https://t.me/quickxtrading"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-[#0B1F44]/95 px-3.5 py-2 text-xs font-bold text-white shadow-xl shadow-sky-950/40 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-[#1B5EF5] hover:border-sky-300"
        title="Join QuickX Official Telegram Community"
        aria-label="Join QuickX Telegram Community"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
        <FaTelegramPlane className="h-3.5 w-3.5 text-[#229ED9] group-hover:text-white transition-colors" />
        <span className="tracking-tight">Join Community</span>
        <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200 group-hover:text-white">
          5K+
        </span>
      </a>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
        aria-label="Dismiss community badge"
      >
        <FiX className="h-3 w-3" />
      </button>
    </div>
  );
}
