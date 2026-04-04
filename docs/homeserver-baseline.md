# Homeserver baseline hardening (macOS)

Use this checklist when rebuilding a barebones Mac mini / Intel Mac used as a homeserver **before** exposing any game services. Goal: **admin access over Tailscale**, **no unnecessary inbound ports**, **clean slate**.

## 1. Fresh slate

- Stop and remove unused containers: `docker system prune -a` (review first; removes unused images).
- Remove old Compose projects and volumes you no longer need.
- Disable or delete LaunchAgents/Daemons you do not recognize (`~/Library/LaunchAgents`, `/Library/LaunchDaemons`).
- Uninstall tools you no longer use (e.g. old agent stacks).

## 2. macOS updates and accounts

- Install pending macOS and security updates.
- Create a **non-admin** day-to-day user for normal work; keep one admin account for installs.
- For deployment, prefer a dedicated **deploy** user with SSH key auth only (no password login).

## 3. SSH: prefer Tailscale, key-only

- In **System Settings → General → Sharing → Remote Login**: restrict to specific users if possible.
- Use **SSH keys**; disable password authentication for SSH (see `sshd` hardening guides for your macOS version).
- Prefer SSH over **Tailscale** only: connect to the machine’s Tailscale IP from your laptop, not the public WAN IP.
- Do **not** forward SSH (port 22) on your home router unless you have a strong reason.

## 4. Firewall

- Enable the macOS **application firewall** (System Settings → Network → Firewall).
- Allow only what you need (Docker, your tunnel client if applicable).

## 5. Docker

- Install Docker Desktop (or Colima) and use **one** Compose project directory for this app.
- Keep images pinned by digest in production where practical.

## 6. What we are *not* doing yet

- Opening **80/443** on the router to the Mac (use an outbound tunnel; see [deploy-homeserver.md](./deploy-homeserver.md)).
- Running the database or game server bound to `0.0.0.0` on the public interface without a reverse proxy/tunnel in front.

## 7. Next steps

- Deploy with Docker Compose: [deploy-homeserver.md](./deploy-homeserver.md).
- Operations (backups, uptime): [ops-homeserver.md](./ops-homeserver.md).
