export default {
  build: {
    outDir: 'dist',
    assetsDir: '_',          // hashed bundles land in dist/_/ so they cannot collide
                             // with the verbatim public/assets/ tree
    target: 'es2022',
    // design.md §12.2 specifies `manualChunks: { three: ['three'] }`. vite 8.3.1 is
    // Rolldown-based and accepts only the function form ("manualChunks is not a function"),
    // so the same split is expressed as a predicate. Same intent: the entry chunk paints the
    // hero while the ~170 KB gzipped three chunk streams in behind it.
    rollupOptions: {
      output: {
        manualChunks: (id) => (/node_modules[\\/]three[\\/]/.test(id) ? 'three' : undefined),
      },
    },
  },
};
