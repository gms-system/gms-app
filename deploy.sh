#!/bin/bash
# ============================================================
# GMS — Cloud Deployment Script
# ============================================================
# Run this on your cloud server (Ubuntu 22.04) after:
#   1. git clone your-repo
#   2. cp .env.example .env  (then edit .env with real values)
#   3. chmod +x deploy.sh && ./deploy.sh
# ============================================================

set -e  # stop on any error

echo "========================================"
echo "  GMS Deployment Script"
echo "========================================"

# ── Check .env exists ────────────────────────────────────────
if [ ! -f .env ]; then
  echo "ERROR: .env file not found!"
  echo "Run: cp .env.example .env"
  echo "Then edit .env with your real passwords and secrets."
  exit 1
fi

# ── Install Docker if not present ────────────────────────────
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  echo "Docker installed. You may need to log out and back in."
fi

# ── Install Docker Compose plugin if not present ─────────────
if ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose..."
  sudo apt-get update
  sudo apt-get install -y docker-compose-plugin
fi

# ── Pull latest code ─────────────────────────────────────────
echo ""
echo "Pulling latest code..."
git pull origin main

# ── Build images ─────────────────────────────────────────────
echo ""
echo "Building Docker images..."
docker compose build --no-cache

# ── Stop old containers ──────────────────────────────────────
echo ""
echo "Stopping existing containers..."
docker compose down

# ── Start all containers ─────────────────────────────────────
echo ""
echo "Starting containers..."
docker compose up -d

# ── Wait for backend to be ready ─────────────────────────────
echo ""
echo "Waiting for services to start..."
sleep 10

# ── Health check ─────────────────────────────────────────────
echo ""
echo "Running health check..."
if curl -sf http://localhost:8080/api/health > /dev/null; then
  echo "✓ Backend is healthy"
else
  echo "✗ Backend health check failed. Checking logs..."
  docker compose logs backend --tail=30
fi

# ── Show status ──────────────────────────────────────────────
echo ""
echo "Container status:"
docker compose ps

# ── Get public IP ────────────────────────────────────────────
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
SITE_ADDRESS=$(grep -E "^SITE_ADDRESS=" .env | cut -d= -f2)
echo ""
echo "========================================"
echo "  Deployment complete!"
if [ -n "$SITE_ADDRESS" ] && [ "$SITE_ADDRESS" != "localhost" ]; then
  echo "  App URL (HTTPS): https://${SITE_ADDRESS}"
else
  echo "  App URL: http://${PUBLIC_IP}:8080 (localhost only — set SITE_ADDRESS in .env for HTTPS)"
fi
echo "  API Docs: http://${PUBLIC_IP}:8080/api/docs (server-local) or https://${SITE_ADDRESS}/api/docs"
echo "========================================"
