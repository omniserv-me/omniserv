/* sections/index.js — the sections chunk. design.md §12.7 (entry budget).

   Every movement after IDENTITY, kept out of the entry. main.js fetches this
   chunk in parallel with the fonts and awaits both before boot(), because
   register() and onSplit() must run before the registry builds and the
   headings split. The §10.3 NONE fallback rides here too (11a). */

import './about.js';
import './stack.js';
import './projects.js';
import './nav.js';
import './contact.js';
import './fallback.js';
