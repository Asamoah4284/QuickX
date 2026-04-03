const styles = {
  draft: 'bg-slate-100 text-slate-700',
  published: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  pending_review: 'bg-amber-100 text-amber-700',
  under_review: 'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
  suspended: 'bg-rose-100 text-rose-700',
  archived: 'bg-slate-200 text-slate-700',
};

export default function StatusBadge({ status }) {
  const normalized = String(status || 'draft').toLowerCase();
  const label = normalized.replace(/_/g, ' ');

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[normalized] || styles.draft}`}>
      {label}
    </span>
  );
}
