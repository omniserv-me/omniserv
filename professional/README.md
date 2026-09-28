# professional

Portfolio page for Leonid Yesaulov — Vite + GSAP + three.js, built into a Caddy image.
Part of Omniserv. `npm run dev` to develop, `docker compose up --build webpage` to run as
deployed. See `design.md` for the full specification.

## Deployment

The page ships as the `webpage` service of the Omniserv stack (`../docker-compose.yaml`).
There is no separate deploy step for this directory: it goes live with the rest of the stack.

### Flow

1. **Merge to `main`.** A push to `main` in the Omniserv repo triggers
   `.github/workflows/main.yml` (`deploy`), which runs on the **self-hosted** runner,
   i.e. on the server itself.
2. **Checkout.** The runner wipes its workspace and checks out the repo fresh.
3. **Build + restart.** It runs `docker compose up -d --build --wait` from the repo root,
   with the stack's secrets (`MONGO_*`, `DATA_DIR`, `API_SECRET`, …) passed as env vars.
   The webpage needs none of them.
4. **Image build** (`Dockerfile`, two stages):
   - `node:26-alpine`: `npm ci`, then `npm run build` (`vite build`) into `dist/`.
   - `caddy:2-alpine`: copies `dist/` and `Caddyfile` into `/app` and runs Caddy.
5. **Serve.** Caddy listens on `:5005` (plain HTTP, `auto_https off`). Compose publishes
   `5005:5005` on the host and joins the `omniserv` network; TLS and the public hostname
   are handled upstream of this container.
6. **Health.** Compose probes `http://webpage:5005` every 5 s; `--wait` makes the
   workflow fail if the service does not become healthy.

### What the Caddyfile does

- Compression: `zstd best`, falling back to `gzip 9`. The level matters: the byte budgets
  in `design.md` §12.7 are measured on the wire.
- Caching: `/_/*` (hashed build output) and `/fonts/*` are immutable for a year,
  `/assets/*` for a week, `/files/*` for a day, and `/` is `no-cache`, so a new deploy
  takes effect on the next load.
- Security headers (`nosniff`, `Referrer-Policy`), with the `Server` header stripped.
- Returns 403 for dotfiles, build files and `/hidden/*`. Access logs go to
  `/hidden/caddylog` inside the container.

### Run it locally as deployed

```sh
# from the Omniserv repo root
docker compose up --build webpage
# → http://localhost:5005
```

For a faster check without Docker, run `npm run build && npm run preview`. It serves
`dist/` through Vite rather than Caddy, so it won't show the Caddyfile's headers or
compression.

### Notes

- `.dockerignore` keeps `node_modules`, `dist`, dotfiles, `*.md` and `/hidden` out of the
  build context. The image always builds from source, so a local `dist/` is never shipped.
- Only pushes to `main` deploy. The branch test-deploy workflow (`test.yml`) is currently
  commented out.
- Rollback: revert the commit on `main` and push. The workflow rebuilds from that commit.
