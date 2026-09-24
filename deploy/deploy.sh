#!/usr/bin/env bash
# Deploys the current code to the server and (re)starts NucleusArt.
# Run from the project folder on your computer (Git Bash):
#   bash deploy/deploy.sh root@YOUR_SERVER_IP
# First deploy only: the script uploads deploy/.env.production if the server has none.
set -euo pipefail

SERVER="${1:?Usage: bash deploy/deploy.sh root@SERVER_IP}"
APP_DIR=/opt/nucleusart
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE="$(mktemp -d)/nucleusart.tar.gz"

echo "==> Packing code (without secrets, node_modules, build output or local data)"
tar -czf "$ARCHIVE" -C "$ROOT" \
  --exclude=./node_modules --exclude=./.next --exclude=./data --exclude=./logs --exclude=./docker-logs \
  --exclude=./.git --exclude='./.env' --exclude='./.env.local' --exclude='./deploy/.env.production' \
  --exclude=./coverage --exclude=./backups --exclude=./ad-creatives --exclude='./scripts/.tmp-*' \
  .

echo "==> Uploading $(du -h "$ARCHIVE" | cut -f1)"
scp "$ARCHIVE" "$SERVER:/tmp/nucleusart.tar.gz"

if ! ssh "$SERVER" "test -f $APP_DIR/deploy/.env.production"; then
  if [ -f "$ROOT/deploy/.env.production" ]; then
    echo "==> Uploading deploy/.env.production (first deploy)"
    ssh "$SERVER" "mkdir -p $APP_DIR/deploy"
    scp "$ROOT/deploy/.env.production" "$SERVER:$APP_DIR/deploy/.env.production"
    ssh "$SERVER" "chmod 600 $APP_DIR/deploy/.env.production"
  else
    echo "!! No deploy/.env.production here or on the server. Create it first: node deploy/create-env.mjs nucleusart.studio"
    exit 1
  fi
fi

echo "==> Building and starting on the server (first build takes ~5-10 minutes)"
ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
mkdir -p $APP_DIR/data $APP_DIR/logs
tar -xzf /tmp/nucleusart.tar.gz -C $APP_DIR
rm /tmp/nucleusart.tar.gz
cd $APP_DIR/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker image prune -f >/dev/null
# Every deploy builds on the server; without this the build cache filled 70 GB of a 96 GB disk.
docker builder prune -af --filter until=48h >/dev/null 2>&1 || true
echo "==> Waiting for the website to be healthy"
for i in \$(seq 1 60); do
  status=\$(docker inspect -f '{{.State.Health.Status}}' nucleusart-web-1 2>/dev/null || echo starting)
  [ "\$status" = healthy ] && break
  sleep 5
done
docker compose -f docker-compose.prod.yml --env-file .env.production ps
REMOTE

DOMAIN_NAME="$(grep '^DOMAIN=' "$ROOT/deploy/.env.production" 2>/dev/null | cut -d= -f2 || true)"
echo "==> Deployed. Open https://${DOMAIN_NAME:-your-domain}"
