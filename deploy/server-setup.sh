#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 VPS for NucleusArt. Run as root on the server:
#   bash server-setup.sh
set -euo pipefail

echo "==> Updating packages"
apt-get update -y && apt-get upgrade -y

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> Firewall: allow SSH, HTTP, HTTPS only"
apt-get install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> 4 GB swap (keeps the Next.js build from running out of memory)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Automatic security updates"
apt-get install -y unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> App folders"
mkdir -p /opt/nucleusart/data /opt/nucleusart/logs /opt/nucleusart/backups

echo "==> Nightly database backup (03:30, keeps 14 days)"
cat > /etc/cron.d/nucleusart-backup <<'CRON'
30 3 * * * root cd /opt/nucleusart/deploy && PW=$(grep -E '^MYSQL_ROOT_PASSWORD=' .env.production | cut -d= -f2-) && docker compose -f docker-compose.prod.yml --env-file .env.production exec -T mysql mysqldump -uroot -p"$PW" --single-transaction nucleusart | gzip > /opt/nucleusart/backups/db-$(date +\%F).sql.gz && find /opt/nucleusart/backups -name 'db-*.sql.gz' -mtime +14 -delete
CRON

echo "==> Done. Next: run deploy/deploy.sh from your computer."
