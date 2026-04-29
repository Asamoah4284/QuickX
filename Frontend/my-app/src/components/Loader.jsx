import React from 'react';

export default function Loader({
  label = 'Loading…',
  sublabel,
  fullScreen = true,
  size = 'md',
  tone = 'light',
}) {
  const sizeClass = size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-14 w-14' : 'h-12 w-12';

  const pageBg = tone === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900';
  const cardBg = tone === 'dark' ? 'bg-white/5 ring-white/10' : 'bg-white ring-slate-200/80';
  const labelText = tone === 'dark' ? 'text-white' : 'text-slate-900';
  const subText = tone === 'dark' ? 'text-white/70' : 'text-slate-500';

  const content = (
    <div className="flex flex-col items-center text-center">
      <div className={`relative ${sizeClass}`}>
        <div className="absolute inset-0 rounded-full bg-[#1B5EF5]/10 blur-lg" aria-hidden />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 180deg, rgba(27,94,245,1), rgba(27,94,245,0.15), rgba(27,94,245,1))',
          }}
          aria-hidden
        />
        <div className="absolute inset-[4px] rounded-full bg-white" aria-hidden />
        <div className="absolute inset-0 animate-spin rounded-full [mask:radial-gradient(farthest-side,transparent_calc(100%-6px),#000_calc(100%-6px))] [webkit-mask:radial-gradient(farthest-side,transparent_calc(100%-6px),#000_calc(100%-6px))]">
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(27,94,245,1), rgba(27,94,245,0.15), rgba(27,94,245,1))',
            }}
            aria-hidden
          />
        </div>
      </div>

      {label ? <p className={`mt-4 text-sm font-semibold ${labelText}`}>{label}</p> : null}
      {sublabel ? <p className={`mt-1 text-xs ${subText}`}>{sublabel}</p> : null}

      <div className="mt-4 flex items-center gap-1.5" aria-hidden>
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1B5EF5]" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1B5EF5]" style={{ animationDelay: '120ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1B5EF5]" style={{ animationDelay: '240ms' }} />
      </div>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className={`min-h-screen ${pageBg} flex items-center justify-center px-4`}>
      <div className={`w-full max-w-sm rounded-2xl p-6 shadow-none ring-1 ${cardBg}`}>
        {content}
      </div>
    </div>
  );
}

