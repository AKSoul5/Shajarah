// People already recorded who may be the person being typed in: offered
// when a spouse, a parent or a child is added by name, so a cousin who is
// already in the family is linked rather than recorded a second time.
// Names alone never decide it (two people can share a name): each match is
// shown with their nasab, and the user chooses.

import { normalizeName } from "../nasab";
import type { Gender, MemberDTO } from "../types";

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/**
 * Recorded people whose name matches `typed`: the whole name (hamza forms,
 * diacritics and spaces aside), or, for a single typed word, their own
 * given name. Exact matches first, then those with parents recorded (more
 * likely the person meant: someone of the family). At most `limit`.
 */
export function existingByName(
  members: readonly MemberDTO[],
  typed: string,
  opts: { gender?: Gender; exclude?: ReadonlySet<string>; limit?: number } = {},
): MemberDTO[] {
  const t = typed.trim();
  if (t.length < 2) return [];
  const whole = normalizeName(t);
  const single = words(t).length === 1;
  const scored: [MemberDTO, number][] = [];
  for (const m of members) {
    if (opts.exclude?.has(m.id)) continue;
    if (opts.gender && m.gender !== "UNKNOWN" && m.gender !== opts.gender) continue;
    const name = normalizeName(m.name);
    const given = normalizeName(words(m.name)[0] ?? "");
    let score = 0;
    if (name === whole) score = 3;
    else if (single && given === whole) score = 2;
    else continue;
    if (m.fatherId || m.motherId) score += 0.5;
    scored.push([m, score]);
  }
  return scored.sort((a, b) => b[1] - a[1]).slice(0, opts.limit ?? 4).map(([m]) => m);
}

/** What still refers to a person: what a deletion would unlink. */
export function referencesTo(
  tree: { members: readonly MemberDTO[]; marriages: readonly { spouseAId: string; spouseBId: string }[]; citations?: readonly { memberId: string }[]; media?: readonly { memberId?: string | null }[] },
  id: string,
) {
  return {
    children: tree.members.filter((c) => c.fatherId === id || c.motherId === id).length,
    spouses: tree.marriages.filter((x) => x.spouseAId === id || x.spouseBId === id).length,
    citations: (tree.citations ?? []).filter((c) => c.memberId === id).length,
    media: (tree.media ?? []).filter((m) => m.memberId === id).length,
  };
}
