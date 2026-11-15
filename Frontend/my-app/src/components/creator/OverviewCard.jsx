export default function OverviewCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-850 px-4 py-3.5">
      <p className="text-xs font-medium text-fg-subtle">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-fg">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-snug text-fg-subtle">{hint}</p> : null}
    </div>
  );
}
