# VeriForge Ops — EC2 Deployment Runbook

> **Target OS:** Ubuntu 22.04 LTS  
> **Instance type:** t3.medium (2 vCPU / 4 GB RAM) — minimum recommended when running MongoDB on-box  
> **App directory:** `/opt/veriforge-ops`  
> **Deploy user:** `deploy`  
> **Ports (public):** 22 (SSH), 80 (HTTP)  
> **Ports (internal only):** 4000 (Express API), 27017 (MongoDB)

Replace every `<EC2-PUBLIC-IP>` placeholder with your actual EC2 public IP address before running any command.

---

## Step 1 — EC2 Launch Recommendations

| Setting | Recommended value |
|---------|------------------|
| AMI | Ubuntu Server 22.04 LTS (64-bit x86) |
| Instance type | **t3.medium** (2 vCPU, 4 GB RAM) |
| Storage | **30 GB gp3** (IOPS 3000, throughput 125 MB/s) |
| Key pair | Create or select an existing `.pem` key pair |
| VPC | Default VPC is fine for a single-instance deploy |
| Auto-assign public IP | Enabled |
| IAM role | None required (no AWS services used by the app) |

**Security Group — Inbound rules:**

| Type | Protocol | Port | Source | Purpose |
|------|----------|------|--------|---------|
| SSH | TCP | 22 | Your IP only (`x.x.x.x/32`) | Admin access |
| HTTP | TCP | 80 | 0.0.0.0/0, ::/0 | App traffic via nginx |

**Security Group — Outbound rules:**

| Type | Protocol | Port | Destination |
|------|----------|------|-------------|
| All traffic | All | All | 0.0.0.0/0 |

> Do NOT open port 4000 or 27017 in the security group — they stay internal.

---

## Step 2 — Initial SSH Hardening

```bash
# 1. SSH in as ubuntu (default Ubuntu AMI user)
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>

# 2. Set a strong password for ubuntu (optional but recommended)
sudo passwd ubuntu

# 3. Create the deploy user (also done by bootstrap.sh — idempotent)
sudo adduser --system --group --shell /bin/bash --home /home/deploy deploy

# 4. Copy your SSH public key to the deploy user
sudo mkdir -p /home/deploy/.ssh
sudo cp /home/ubuntu/.authorized_keys /home/deploy/.ssh/authorized_keys 2>/dev/null || true
# OR paste your public key manually:
# sudo nano /home/deploy/.ssh/authorized_keys
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh

# 5. Harden SSH daemon
sudo nano /etc/ssh/sshd_config
# Set these values:
#   PasswordAuthentication no
#   PermitRootLogin no
#   PubkeyAuthentication yes

sudo systemctl restart sshd

# 6. Verify you can still SSH as deploy (in a NEW terminal before closing current session)
ssh -i your-key.pem deploy@<EC2-PUBLIC-IP>
```

---

## Step 3 — System Packages, Node.js 18, MongoDB 8, nginx

Run the bootstrap script (idempotent — safe to re-run):

```bash
# Upload bootstrap.sh to the server
scp -i your-key.pem deploy/bootstrap.sh ubuntu@<EC2-PUBLIC-IP>:~/

# SSH in and run it
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
sudo bash ~/bootstrap.sh
```

The script installs:
- Node.js 18 (via NodeSource)
- MongoDB 8.0 Community Edition
- nginx
- ufw (firewall)
- build-essential, git, curl, logrotate

After the script finishes, verify:
```bash
node --version          # v18.x.x
mongod --version        # db version v8.0.x
nginx -v                # nginx/1.x.x
systemctl is-active mongod    # active
systemctl is-active nginx     # active
```

---

## Step 4 — MongoDB Secure Setup

```bash
# Connect to MongoDB (no auth yet at this point)
mongosh

# Create admin superuser
use admin
db.createUser({
  user: "admin",
  pwd:  "CHANGE_ME_ADMIN_PASSWORD",
  roles: [{ role: "root", db: "admin" }]
})

# Create the application database user
use veriforgeops
db.createUser({
  user: "veriforge_user",
  pwd:  "CHANGE_ME_DB_PASSWORD",
  roles: [{ role: "readWrite", db: "veriforgeops" }]
})
exit

# Enable MongoDB authentication
sudo nano /etc/mongod.conf
# Find the `security:` section and set:
#   security:
#     authorization: enabled

sudo systemctl restart mongod

# Verify auth works
mongosh "mongodb://veriforge_user:CHANGE_ME_DB_PASSWORD@127.0.0.1:27017/veriforgeops?authSource=veriforgeops"
# Should connect successfully
```

---

## Step 5 — Upload Application Code

From your **local machine** (repo root):

```bash
# First time: clone approach (recommended)
git clone https://github.com/your-org/veriforgeops.git
# -- OR -- rsync from local (if repo is not on GitHub)

rsync -avz --progress \
  --exclude-from='.deployignore' \
  ./ \
  deploy@<EC2-PUBLIC-IP>:/opt/veriforge-ops/

# Fix ownership after upload
ssh -i your-key.pem deploy@<EC2-PUBLIC-IP> \
  "sudo chown -R deploy:deploy /opt/veriforge-ops"
```

For subsequent deploys:
```bash
rsync -avz --progress \
  --exclude-from='.deployignore' \
  --delete \
  ./ \
  deploy@<EC2-PUBLIC-IP>:/opt/veriforge-ops/
```

---

## Step 6 — Install Dependencies & Build

SSH into the server as `deploy`:

```bash
# Backend dependencies
cd /opt/veriforge-ops/server
npm install --omit=dev

# Frontend dependencies + production build
cd /opt/veriforge-ops
npm install
REACT_APP_API_URL=http://<EC2-PUBLIC-IP> npm run build
# Output: /opt/veriforge-ops/build/  (served as static files by nginx)
```

> **Important:** `REACT_APP_API_URL` is baked into the JavaScript bundle at build time.
> If your EC2 IP changes, you must re-run `npm run build` with the new IP.

---

## Step 7 — Environment Variables

```bash
# Create the .env file (deploy user owns it, chmod 600)
sudo cp /opt/veriforge-ops/deploy/.env.example /opt/veriforge-ops/server/.env
sudo chown deploy:deploy /opt/veriforge-ops/server/.env
sudo chmod 600 /opt/veriforge-ops/server/.env

# Edit it — fill in real values
sudo nano /opt/veriforge-ops/server/.env
```

Required values to fill in:

```ini
MONGO_URI=mongodb://veriforge_user:CHANGE_ME_DB_PASSWORD@127.0.0.1:27017/veriforgeops?authSource=veriforgeops
JWT_SECRET=<output of: openssl rand -hex 64>
JWT_EXPIRES_IN=24h
PORT=4000
NODE_ENV=production
ALLOWED_ORIGINS=http://<EC2-PUBLIC-IP>
```

Generate the JWT secret:
```bash
openssl rand -hex 64
```

---

## Step 8 — Database Seed (One-Time)

```bash
cd /opt/veriforge-ops/server
# Ensure .env is in place before running seed
node -e "require('dotenv').config(); console.log(process.env.MONGO_URI)"  # verify env loads

npm run seed
# Seeds 16 collections with demo data (~30 seconds)
```

---

## Step 9 — Process Management (systemd)

```bash
# Install the systemd unit file
sudo cp /opt/veriforge-ops/deploy/systemd/veriforge-api.service \
        /etc/systemd/system/veriforge-api.service

# Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable veriforge-api
sudo systemctl start veriforge-api

# Verify it's running
sudo systemctl status veriforge-api

# View live logs
sudo journalctl -u veriforge-api -f

# Test the API directly (from the server)
curl http://127.0.0.1:4000/health
# Expected: {"status":"ok","ts":"..."}
```

---

## Step 10 — Reverse Proxy (nginx)

```bash
# Replace EC2-PUBLIC-IP placeholder in nginx config
sudo sed 's/<EC2-PUBLIC-IP>/<EC2-PUBLIC-IP>/g' \
  /opt/veriforge-ops/deploy/nginx/veriforge-ops.conf \
  > /etc/nginx/sites-available/veriforge-ops
# (Edit manually if sed placeholder substitution looks wrong)
sudo nano /etc/nginx/sites-available/veriforge-ops
# → Replace <EC2-PUBLIC-IP> with your actual IP on the server_name line

# Enable site, remove default
sudo ln -sf /etc/nginx/sites-available/veriforge-ops \
             /etc/nginx/sites-enabled/veriforge-ops
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## Step 11 — SSL/TLS

**Not configured.** This deployment uses HTTP only (no domain name, so Let's Encrypt is not available).

If you attach a domain name in the future:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Step 12 — Firewall

Bootstrap.sh already configures ufw. Verify:

```bash
sudo ufw status verbose
# Expected:
#   To                   Action      From
#   --                   ------      ----
#   OpenSSH              ALLOW IN    Anywhere
#   Nginx HTTP           ALLOW IN    Anywhere
```

To allow a specific admin IP for SSH only (recommended):
```bash
sudo ufw delete allow OpenSSH
sudo ufw allow from <YOUR-IP>/32 to any port 22 proto tcp
sudo ufw reload
```

---

## Step 13 — Log Rotation

nginx logs are rotated by the logrotate config installed by bootstrap.sh:
- Location: `/etc/logrotate.d/veriforge-ops`
- Rotation: daily, 14 days retention, compressed

Application logs go to journald (systemd):
```bash
# View recent API logs
sudo journalctl -u veriforge-api --since "1 hour ago"

# Set max journal disk usage
sudo nano /etc/systemd/journald.conf
# Set: SystemMaxUse=500M
sudo systemctl restart systemd-journald
```

---

## Step 14 — Backup Strategy

**MongoDB:**
```bash
# Create a daily backup script
sudo nano /opt/veriforge-ops/scripts/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/veriforgeops"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "${BACKUP_DIR}"

mongodump \
  --uri="mongodb://veriforge_user:CHANGE_ME_DB_PASSWORD@127.0.0.1:27017/veriforgeops?authSource=veriforgeops" \
  --out="${BACKUP_DIR}/${TIMESTAMP}"

# Compress
tar -czf "${BACKUP_DIR}/${TIMESTAMP}.tar.gz" -C "${BACKUP_DIR}" "${TIMESTAMP}"
rm -rf "${BACKUP_DIR}/${TIMESTAMP}"

# Keep last 7 days of backups
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x /opt/veriforge-ops/scripts/backup.sh

# Schedule daily at 2 AM
echo "0 2 * * * deploy /opt/veriforge-ops/scripts/backup.sh >> /var/log/veriforge-backup.log 2>&1" \
  | sudo tee /etc/cron.d/veriforge-backup
```

To copy backups to S3 (optional):
```bash
# Install awscli and configure credentials, then add to backup.sh:
aws s3 cp "${BACKUP_DIR}/${TIMESTAMP}.tar.gz" s3://your-bucket/veriforgeops-backups/
```

---

## Step 15 — Monitoring Basics

**CloudWatch Agent (lightweight):**
```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
# → Choose: system metrics (CPU, memory, disk) + collect from journald
```

**Simple uptime monitoring (no AWS):**
Use a free service like [UptimeRobot](https://uptimerobot.com) — add a HTTP monitor pointing to:
```
http://<EC2-PUBLIC-IP>/health
```
Set alert interval: every 5 minutes.

**Disk space alert:**
```bash
# Add to crontab — emails if disk > 85%
echo '0 * * * * deploy df -h / | awk "NR==2 {if(\$5+0 > 85) print \"Disk usage is \"\$5}" | grep -q "%" && echo "DISK ALERT on VeriForge EC2" | mail -s "Disk Alert" your@email.com' \
  | sudo tee /etc/cron.d/veriforge-disk-alert
```

---

## Smoke-Test Checklist

Run these after every deployment to confirm everything is up:

```bash
# 1. nginx is serving (HTTP 200)
curl -s -o /dev/null -w "%{http_code}" http://<EC2-PUBLIC-IP>/
# Expected: 200

# 2. React app HTML is returned
curl -s http://<EC2-PUBLIC-IP>/ | grep -c "<title>"
# Expected: 1

# 3. API health check via nginx proxy
curl -s http://<EC2-PUBLIC-IP>/health
# Expected: {"status":"ok","ts":"..."}

# 4. API health check direct (from server only)
curl -s http://127.0.0.1:4000/health
# Expected: {"status":"ok","ts":"..."}

# 5. API returns data
curl -s http://<EC2-PUBLIC-IP>/api/agents | head -c 200
# Expected: JSON array of agents

# 6. MongoDB is running
systemctl is-active mongod
# Expected: active

# 7. API process is running
systemctl is-active veriforge-api
# Expected: active

# 8. nginx is running
systemctl is-active nginx
# Expected: active

# 9. Ports are listening correctly
ss -tlnp | grep -E '80|4000|27017'
# Expected:
#   0.0.0.0:80    → nginx
#   127.0.0.1:4000 → node
#   127.0.0.1:27017 → mongod

# 10. Open browser and navigate to:
#   http://<EC2-PUBLIC-IP>/
# Login with seeded credentials (check server/seed/seed.js for default user)
```

---

## Re-deploy Checklist (Subsequent Deploys)

```bash
# 1. On local machine — push new code
rsync -avz --progress --exclude-from='.deployignore' --delete \
  ./ deploy@<EC2-PUBLIC-IP>:/opt/veriforge-ops/

# 2. On EC2 server
cd /opt/veriforge-ops/server && npm install --omit=dev
cd /opt/veriforge-ops && REACT_APP_API_URL=http://<EC2-PUBLIC-IP> npm run build

# 3. Restart API
sudo systemctl restart veriforge-api

# 4. Reload nginx (only if nginx config changed)
sudo nginx -t && sudo systemctl reload nginx

# 5. Smoke test
curl -s http://<EC2-PUBLIC-IP>/health
```
