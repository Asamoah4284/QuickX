const styles = {
  draft: 'bg-ink-800 text-fg-muted',
  published: 'bg-up/10 text-up',
  approved: 'bg-up/10 text-up',
  pending: 'bg-warn/10 text-warn',
  pending_review: 'bg-warn/10 text-warn',
  under_review: 'bg-warn/10 text-warn',
  rejected: 'bg-down/10 text-down',
  suspended: 'bg-down/10 text-down',
  archived: 'bg-ink-700 text-fg-muted',
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
