#!/usr/bin/env bash
# =============================================================================
# VeriForge Ops — EC2 Bootstrap Script
# Covers: system packages, Node.js 18, MongoDB 8, nginx, ufw firewall,
#         deploy user creation, and app directory setup.
#
# Target OS : Ubuntu 22.04 LTS
# Run as    : sudo bash bootstrap.sh
# Idempotent: yes — safe to re-run
# =============================================================================
set -euo pipefail

APP_DIR="/opt/veriforge-ops"
DEPLOY_USER="deploy"
NODE_MAJOR="18"
MONGO_VERSION="8.0"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[bootstrap]${NC} $*"; }
warning() { echo -e "${YELLOW}[warning]${NC}  $*"; }

# ── Must run as root ──────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash bootstrap.sh"; exit 1
fi

# =============================================================================
# 1. System update & base packages
# =============================================================================
info "Updating apt and installing base packages..."
apt-get update -qq
apt-get install -y --no-install-recommends \
  curl \
  wget \
  git \
  gnupg \
  ca-certificates \
  lsb-release \
  build-essential \
  unzip \
  ufw \
  logrotate \
  nginx

# =============================================================================
# 2. Create deploy user (idempotent)
# =============================================================================
info "Creating deploy user '${DEPLOY_USER}'..."
if ! id "${DEPLOY_USER}" &>/dev/null; then
  adduser --system --group --shell /bin/bash --home "/home/${DEPLOY_USER}" "${DEPLOY_USER}"
  info "Created user '${DEPLOY_USER}'."
else
  info "User '${DEPLOY_USER}' already exists — skipping."
fi

# =============================================================================
# 3. Node.js 18 via NodeSource
# =============================================================================
info "Installing Node.js ${NODE_MAJOR}..."
NODE_SETUP_SCRIPT="/tmp/nodesource_setup.sh"
if ! node --version 2>/dev/null | grep -q "^v${NODE_MAJOR}"; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" -o "${NODE_SETUP_SCRIPT}"
  bash "${NODE_SETUP_SCRIPT}"
  rm -f "${NODE_SETUP_SCRIPT}"
  apt-get install -y nodejs
  info "Node.js $(node --version) installed."
else
  info "Node.js $(node --version) already installed — skipping."
fi

# =============================================================================
# 4. MongoDB 8.0 Community Edition
# =============================================================================
info "Installing MongoDB ${MONGO_VERSION}..."
MONGO_LIST="/etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list"
if [[ ! -f "${MONGO_LIST}" ]]; then
  curl -fsSL "https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.asc" \
    | gpg --dearmor -o /usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg

  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg ] \
https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/${MONGO_VERSION} multiverse" \
    > "${MONGO_LIST}"

  apt-get update -qq
  apt-get install -y --no-install-recommends \
    mongodb-org \
    mongodb-org-database \
    mongodb-org-server \
    mongodb-org-mongos \
    mongodb-org-tools
  info "MongoDB installed."
else
  info "MongoDB repo already configured — skipping package install."
fi

# Enable and start MongoDB
systemctl enable mongod
if ! systemctl is-active --quiet mongod; then
  systemctl start mongod
  info "MongoDB started."
else
  info "MongoDB already running."
fi

# =============================================================================
# 5. Secure MongoDB — bind to loopback only
#    (mongod.conf already defaults to 127.0.0.1 on Ubuntu packages;
#     this block makes it explicit and idempotent)
# =============================================================================
info "Verifying MongoDB binds to 127.0.0.1 only..."
MONGO_CONF="/etc/mongod.conf"
if grep -q "bindIp: 127.0.0.1" "${MONGO_CONF}"; then
  info "MongoDB already bound to 127.0.0.1."
else
  # Replace the net.bindIp line
  sed -i 's/bindIp:.*/bindIp: 127.0.0.1/' "${MONGO_CONF}"
  systemctl restart mongod
  info "MongoDB restarted with loopback-only binding."
fi

# =============================================================================
# 6. Create MongoDB database user
#    Run this block ONCE after bootstrap. Skipped automatically if user exists.
#    The admin password prompt will appear interactively.
# =============================================================================
info "MongoDB user setup — to create the app DB user, run after bootstrap:"
cat <<'MONGO_INSTRUCTIONS'

  # Connect to MongoDB as admin:
  mongosh

  # Then paste the following (replace CHANGE_ME_DB_PASSWORD):
  use admin
  db.createUser({ user: "admin", pwd: "CHANGE_ME_ADMIN_PASSWORD", roles: ["root"] })

  use veriforgeops
  db.createUser({
    user: "veriforge_user",
    pwd:  "CHANGE_ME_DB_PASSWORD",
    roles: [{ role: "readWrite", db: "veriforgeops" }]
  })
  exit

MONGO_INSTRUCTIONS

# =============================================================================
# 7. Application directory setup
# =============================================================================
info "Creating app directory ${APP_DIR}..."
mkdir -p "${APP_DIR}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"
chmod 755 "${APP_DIR}"

# =============================================================================
# 8. nginx — enable site, disable default
# =============================================================================
info "Configuring nginx..."
# Remove default site if present
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm /etc/nginx/sites-enabled/default
  info "Removed nginx default site."
fi

systemctl enable nginx
if ! systemctl is-active --quiet nginx; then
  systemctl start nginx
fi

# =============================================================================
# 9. Firewall (ufw)
# =============================================================================
info "Configuring ufw firewall..."

# Allow SSH (critical — must come before enabling ufw)
ufw allow OpenSSH

# Allow HTTP (nginx)
ufw allow 'Nginx HTTP'

# Deny everything else inbound by default
ufw default deny incoming
ufw default allow outgoing

# Enable non-interactively
ufw --force enable

info "ufw status:"
ufw status verbose

# =============================================================================
# 10. logrotate for nginx (already handled by nginx package)
#     Add a catch-all for any future app log files
# =============================================================================
cat > /etc/logrotate.d/veriforge-ops <<'LOGROTATE'
/var/log/nginx/veriforge-ops.*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endscript
}
LOGROTATE

# =============================================================================
# Done
# =============================================================================
info "Bootstrap complete!"
echo ""
echo "  Next steps (see RUNBOOK.md for full details):"
echo "  1. Upload code:  rsync -avz --exclude-from='.deployignore' ./ deploy@<EC2-IP>:/opt/veriforge-ops/"
echo "  2. Create .env:  sudo nano /opt/veriforge-ops/server/.env"
echo "  3. Set MongoDB users (see instructions above)"
echo "  4. Install deps: cd /opt/veriforge-ops && npm install && cd server && npm install"
echo "  5. Seed DB:      cd /opt/veriforge-ops/server && npm run seed"
echo "  6. Build React:  cd /opt/veriforge-ops && REACT_APP_API_URL=http://<EC2-IP> npm run build"
echo "  7. Install nginx config and systemd unit (see RUNBOOK.md Step 9 & 8)"
echo "  8. Start API:    sudo systemctl enable --now veriforge-api"
echo ""
