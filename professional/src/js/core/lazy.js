/* lazy.js — loader for core/late.js. Kept apart from late.js so that importing
   the loader never pulls the plugins into the entry chunk.

   loadLate() is memoised: one request however often it is called. late() is the
   synchronous check for code that must not wait — e.g. the nav indicator moves
   with a plain appendChild until late()?.Flip exists, and the LINK glyph hover
   is a no-op until late()?.MorphSVGPlugin does. */

let promise = null;
let mod = null;

export function loadLate() {
  // A failed fetch (flaky connection) is not cached, so a later call retries.
  promise ??= import('./late.js').then(
    (m) => (mod = m),
    (e) => { promise = null; throw e; },
  );
  return promise;
}

export const late = () => mod;
