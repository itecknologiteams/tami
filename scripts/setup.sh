#!/usr/bin/env bash
#
# Tami Hailing — one-shot environment setup.
#
# Clones the repo (if a URL is given), installs all workspace dependencies,
# starts Postgres + Nominatim via Docker, waits for the Nominatim import to
# finish, creates apps/api/.env, runs Prisma migrations + seed, and sets up
# the Flutter mobile app.
#
# Usage:
#   ./scripts/setup.sh                          run in-place inside an existing checkout
#   ./scripts/setup.sh <git-url> [target-dir]    clone first, then run setup
#
# Re-running is safe: every step is idempotent.

set -euo pipefail

# ---------------------------------------------------------------------------
# 0. Resolve the repo directory (clone first if a git URL was given)
# ---------------------------------------------------------------------------

REPO_URL="${1:-}"
TARGET_DIR="${2:-tami}"

if [[ -n "$REPO_URL" ]]; then
  if [[ -d "$TARGET_DIR/.git" ]]; then
    echo "==> Repo already cloned at $TARGET_DIR, pulling latest"
    git -C "$TARGET_DIR" pull --ff-only
  else
    echo "==> Cloning $REPO_URL into $TARGET_DIR"
    git clone "$REPO_URL" "$TARGET_DIR"
  fi
  cd "$TARGET_DIR"
else
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$SCRIPT_DIR/.."
fi

REPO_ROOT="$(pwd)"
echo "==> Working in $REPO_ROOT"

# ---------------------------------------------------------------------------
# 1. Check required tools
# ---------------------------------------------------------------------------

echo "==> Checking required tools"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: '$1' is required but not installed. $2" >&2
    exit 1
  fi
}

require node "Install Node.js 22+: https://nodejs.org"
require docker "Install Docker Desktop: https://www.docker.com/products/docker-desktop"
require curl "Install curl (usually preinstalled on macOS/Linux)."

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running. Start Docker Desktop and re-run this script." >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "    pnpm not found, enabling via corepack"
  require corepack "Install Node.js 22+ (bundles corepack) or 'npm install -g pnpm'."
  corepack enable
fi

HAS_FLUTTER=1
if ! command -v flutter >/dev/null 2>&1; then
  HAS_FLUTTER=0
  echo "    flutter not found — skipping mobile app setup (install from https://flutter.dev to enable it later)"
fi

# ---------------------------------------------------------------------------
# 2. Install workspace dependencies
# ---------------------------------------------------------------------------

echo "==> Installing pnpm workspace dependencies"
pnpm install

# ---------------------------------------------------------------------------
# 3. Environment file
# ---------------------------------------------------------------------------

echo "==> Preparing apps/api/.env"
if [[ ! -f apps/api/.env ]]; then
  cp apps/api/.env.example apps/api/.env
  echo "    created apps/api/.env from .env.example"
else
  echo "    apps/api/.env already exists, leaving it untouched"
fi

# ---------------------------------------------------------------------------
# 4. Start Postgres + Nominatim
# ---------------------------------------------------------------------------

echo "==> Starting Postgres and Nominatim (docker compose)"
docker compose up -d postgres nominatim

echo "==> Waiting for Postgres to be healthy"
until [[ "$(docker compose ps --format '{{.Health}}' postgres 2>/dev/null)" == "healthy" ]]; do
  sleep 2
done
echo "    postgres is healthy"

echo "==> Waiting for Nominatim to finish importing (first run can take 30-60 minutes)"
NOMINATIM_URL="${TAMI_NOMINATIM_BASE_URL:-http://127.0.0.1:8090}"
until curl -fsS --max-time 3 "$NOMINATIM_URL/status" >/dev/null 2>&1; do
  sleep 10
  echo "    still importing... (docker compose logs -f nominatim to watch progress)"
done
echo "    nominatim is ready at $NOMINATIM_URL"

# ---------------------------------------------------------------------------
# 5. Database: migrate + seed
# ---------------------------------------------------------------------------

echo "==> Running Prisma migrations"
pnpm --filter @tami/api prisma:migrate:deploy

echo "==> Generating Prisma client"
pnpm --filter @tami/api prisma:generate

echo "==> Seeding launch cities and ride categories"
pnpm --filter @tami/api prisma:seed

# ---------------------------------------------------------------------------
# 6. Mobile app (Flutter)
# ---------------------------------------------------------------------------

if [[ "$HAS_FLUTTER" == "1" ]]; then
  echo "==> Setting up the Flutter mobile app"
  (cd apps/mobile && flutter pub get)
else
  echo "==> Skipping Flutter setup (flutter not installed)"
fi

# ---------------------------------------------------------------------------
# 7. Verify
# ---------------------------------------------------------------------------

echo "==> Verifying the workspace"
pnpm typecheck
pnpm build

echo ""
echo "==================================================================="
echo " Setup complete."
echo ""
echo " Start the API:      pnpm --filter @tami/api dev"
echo " Start the admin app: pnpm --filter @tami/admin dev"
echo " Run all tests:       pnpm test"
if [[ "$HAS_FLUTTER" == "1" ]]; then
  echo " Run the rider app:   cd apps/mobile && flutter run --target lib/main_rider.dart --dart-define=TAMI_API_BASE_URL=http://127.0.0.1:4000"
  echo " Run the driver app:  cd apps/mobile && flutter run --target lib/main_driver.dart --dart-define=TAMI_API_BASE_URL=http://127.0.0.1:4000"
fi
echo "==================================================================="
