// Slide order that survives edits (owner, session 20): saving or marking an
// image changes the slide objects, not the set of images, so the order must
// not reshuffle under the viewer. Pure, so it is unit-tested.

/** Fisher–Yates on a copy. `random` is injectable for tests. */
export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The order to show `ids` in, given the order shown before.
 * - same images (or some removed): keep the previous order, minus the removed;
 * - new images or a different set: a fresh order (shuffled when `shuffle`);
 * - `reshuffle` forces a fresh order (another view or page, shuffle switched);
 * - unshuffled: always the source's order.
 */
export function stableOrder(
  prev: number[] | null,
  ids: number[],
  shuffle: boolean,
  reshuffle: boolean,
  random: () => number = Math.random,
): number[] {
  // Unshuffled views (playlists, search, Saved) keep the source's own order.
  if (!shuffle) return ids.slice();
  if (!reshuffle && prev) {
    const now = new Set(ids);
    const before = new Set(prev);
    if (ids.every((id) => before.has(id))) return prev.filter((id) => now.has(id));
  }
  return shuffled(ids, random);
}
