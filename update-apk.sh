#!/bin/bash
# ============================================================
# Pull the latest Android APK from GitHub Releases into ./downloads
# (served at https://<server>/downloads/gms.apk + version.json).
# Run after the "Android APK" GitHub Action finishes:
#   cd ~/gms-app && ./update-apk.sh
# Uses the token already stored in this clone's git remote URL
# (fine-grained PAT with Contents: Read).
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

REMOTE=$(git remote get-url origin)
TOKEN=$(echo "$REMOTE" | sed -nE 's#https://[^:]+:([^@]+)@github.com/.*#\1#p')
REPO=$(echo "$REMOTE" | sed -E 's#.*github.com[/:]([^/]+/[^/.]+)(\.git)?$#\1#')
[ -n "$TOKEN" ] || { echo "No token in git remote URL — clone with https://USER:TOKEN@github.com/..."; exit 1; }

API="https://api.github.com/repos/$REPO"
AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-GitHub-Api-Version: 2022-11-28")

RELEASE=$(curl -fsSL "${AUTH[@]}" "$API/releases/latest")
TAG=$(echo "$RELEASE" | python3 -c "import sys,json;print(json.load(sys.stdin)['tag_name'])")
echo "Latest release: $TAG"

mkdir -p downloads
for NAME in gms.apk version.json; do
  ID=$(echo "$RELEASE" | python3 -c "import sys,json;print(next(a['id'] for a in json.load(sys.stdin)['assets'] if a['name']=='$NAME'))")
  curl -fsSL "${AUTH[@]}" -H "Accept: application/octet-stream" "$API/releases/assets/$ID" -o "downloads/$NAME.tmp"
done
# Swap the APK first, then version.json, so phones never see a version before its APK exists.
mv downloads/gms.apk.tmp downloads/gms.apk
mv downloads/version.json.tmp downloads/version.json
cat downloads/version.json
echo "Published: /downloads/gms.apk"
