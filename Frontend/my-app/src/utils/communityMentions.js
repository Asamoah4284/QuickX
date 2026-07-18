/**
 * Resolve @mentions in text against community members.
 * Matches @FirstName or @"Full Name" / @FirstLast against member.fullName.
 */
export function resolveMentions(text, members = []) {
  if (!text || !members.length) return [];
  const byId = new Map();

  const normalized = members
    .map((m) => ({
      id: String(m.id || m._id || ''),
      fullName: String(m.fullName || '').trim(),
    }))
    .filter((m) => m.id && m.fullName);

  const tokens = text.match(/@(?:"([^"]+)"|([A-Za-z][A-Za-z0-9._-]{1,40}))/g) || [];
  for (const raw of tokens) {
    const handle = raw.slice(1).replace(/^"|"$/g, '').trim().toLowerCase();
    if (!handle) continue;
    const hit = normalized.find((m) => {
      const full = m.fullName.toLowerCase();
      const first = full.split(/\s+/)[0];
      const compact = full.replace(/\s+/g, '');
      return full === handle || first === handle || compact === handle;
    });
    if (hit) byId.set(hit.id, hit.id);
  }

  return Array.from(byId.values());
}

export function mentionHint(members = []) {
  if (!members.length) return '';
  const sample = members
    .slice(0, 3)
    .map((m) => `@${String(m.fullName || '').split(/\s+/)[0]}`)
    .filter(Boolean)
    .join(', ');
  return sample ? `Tip: mention someone with ${sample}` : '';
}
