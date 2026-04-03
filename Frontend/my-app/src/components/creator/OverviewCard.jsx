export default function OverviewCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-creator">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-snug text-slate-500">{hint}</p> : null}
    </div>
  );
}
