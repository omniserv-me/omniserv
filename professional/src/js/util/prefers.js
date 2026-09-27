/* prefers.js — the two motion inputs of design.md §10.1, and the pointer query.

   Resolution: the stored toggle wins if present, otherwise the OS media query
   decides. Storage can throw (private mode, disabled cookies); a failed read is
   "no stored value", a failed write is silently dropped — the toggle still works
   for the rest of the visit. */

const KEY = 'motion';
const VALUES = ['full', 'reduced'];

export const osReducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const coarseQuery = window.matchMedia('(pointer: coarse)');

export function storedMotion() {
  try {
    const v = localStorage.getItem(KEY);
    return VALUES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

export function storeMotion(v) {
  try { localStorage.setItem(KEY, v); } catch { /* not persisted; still applies this visit */ }
}

export function resolveMotion(osReduced = osReducedQuery.matches) {
  return storedMotion() ?? (osReduced ? 'reduced' : 'full');
}
