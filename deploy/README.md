# VeriForge Ops — Deploy Directory

This directory contains all artefacts needed to deploy VeriForge Ops to a fresh Ubuntu 22.04 EC2 instance.

## Directory Structure

```
deploy/
├── README.md                    ← you are here
├── RUNBOOK.md                   ← full step-by-step deployment guide
├── bootstrap.sh                 ← idempotent setup script (Node, Mongo, nginx, ufw)
├── .env.example                 ← template for /opt/veriforge-ops/server/.env
├── systemd/
│   └── veriforge-api.service    ← systemd unit for Express API
└── nginx/
    └── veriforge-ops.conf       ← nginx site config (HTTP, proxy + static)
```

Also at the repo root:
- `DEPLOYMENT_AUDIT.md` — full tech stack and dependency audit
- `.deployignore` — rsync exclude list (what NOT to copy to the server)

## Quick Start

1. Launch a **t3.medium** Ubuntu 22.04 EC2 instance with ports **22** and **80** open.
2. Run the bootstrap script on the server:
   ```bash
   scp deploy/bootstrap.sh ubuntu@<EC2-IP>:~/
   ssh ubuntu@<EC2-IP> "sudo bash ~/bootstrap.sh"
   ```
3. Follow **[RUNBOOK.md](RUNBOOK.md)** step by step.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| nginx serves React build as static files | No Node.js process needed for frontend in production |
| nginx proxies `/api/*` and `/health` to Express:4000 | Port 4000 stays internal; one public port (80) |
| `REACT_APP_API_URL` set at build time | CRA bakes env vars into the JS bundle |
| MongoDB on same instance | Simple single-server setup; add Atlas later if scaling needed |
| systemd for process management | Restart-on-crash, journald logging, boot persistence |
| HTTP only | No domain name available; add certbot + domain for HTTPS |

## Environment Variables Summary

See [.env.example](.env.example) for the full annotated list.

| Variable | Where set | Secret? |
|----------|-----------|---------|
| `MONGO_URI` | `/opt/veriforge-ops/server/.env` | Yes |
| `JWT_SECRET` | `/opt/veriforge-ops/server/.env` | Yes |
| `JWT_EXPIRES_IN` | `/opt/veriforge-ops/server/.env` | No |
| `PORT` | `/opt/veriforge-ops/server/.env` | No |
| `NODE_ENV` | `/opt/veriforge-ops/server/.env` | No |
| `ALLOWED_ORIGINS` | `/opt/veriforge-ops/server/.env` | No |
| `REACT_APP_API_URL` | Build-time env var (`npm run build`) | No |
