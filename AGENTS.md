# GMS — notes for contributors / agents

## Layout
- `backend/` FastAPI + SQLAlchemy async + Alembic (migrations run on container start)
- `frontend/` Next.js 14 (app router, standalone output)
- `mobile/` Capacitor 8 Android shell that loads the live site (`server.url` in `capacitor.config.json`)
- `nginx/` reverse proxy (:8080), `caddy/` HTTPS (:80/:443, `SITE_ADDRESS` in `.env`)

## Verify (Windows laptop has no Node; use Docker)
- Typecheck: `docker run --rm -v "<repo>/frontend:/app" -w /app node:20-alpine node node_modules/typescript/bin/tsc --noEmit -p .`
- Prod build: same container, `node node_modules/next/dist/bin/next build`
- Backend hot-patch for testing: `docker cp backend/app/. gms_backend:/app/app/ && docker restart gms_backend`
- Compose: `docker compose config -q`

## Gotchas
- The office network intercepts TLS: `npm install` / Android SDK downloads fail locally. Build the APK with GitHub Actions (`.github/workflows/android.yml`).
- Catalog (makes/models/parts/lubes) lives in DB table `catalog_items`; `frontend/src/lib/india-vehicles.ts` + `parts-catalog.ts` are only the offline fallback. Re-export seed with `node scripts/export-catalog-seed.js`.
- Android WebView has no `window.print()` — use `openPrintableCopy()` from `lib/share.ts` in the native app.
- Commits: author `Krishna <gmsapplicaiton@gmail.com>` (pass with `git -c user.name=... -c user.email=...`).
