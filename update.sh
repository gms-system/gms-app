#!/bin/bash
# ============================================================
# GMS — Update Script (run on cloud server after git push)
# ============================================================
# Usage: ./update.sh
# ============================================================

set -e

echo "========================================"
echo "  GMS Update Script"
echo "========================================"

# Pull latest code
echo "Pulling latest code from GitHub..."
git pull origin main

# Rebuild only changed images (faster than --no-cache)
echo ""
echo "Rebuilding images..."
docker compose build

# Restart containers with new images (zero-downtime for DB)
echo ""
echo "Restarting containers..."
docker compose up -d --no-deps backend
sleep 5
docker compose up -d --no-deps frontend
# nginx caches upstream container IPs — restart it so it picks up the new ones
docker compose restart nginx

echo ""
echo "Checking health..."
sleep 5
curl -sf http://localhost:8080/api/health && echo "✓ Backend healthy" || echo "✗ Check logs: docker compose logs backend"

echo ""
docker compose ps
echo ""
echo "Update complete!"
