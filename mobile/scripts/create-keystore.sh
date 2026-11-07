#!/usr/bin/env bash
# Creates the Android signing key ONCE. Run on the server (it has Docker):
#   cd ~/gms-app && bash mobile/scripts/create-keystore.sh
#
# Then add 4 GitHub secrets (repo → Settings → Secrets and variables → Actions):
#   ANDROID_KEYSTORE_BASE64   = contents of ~/gms-keystore/gms-release.jks.base64
#   ANDROID_KEYSTORE_PASSWORD = the password you type below
#   ANDROID_KEY_ALIAS         = gms
#   ANDROID_KEY_PASSWORD      = the same password
#
# BACK UP ~/gms-keystore/gms-release.jks + the password somewhere safe (e.g. your
# personal Google Drive). Every future update must be signed with this same key,
# otherwise testers' phones refuse to install the update.
set -euo pipefail

OUT="$HOME/gms-keystore"
mkdir -p "$OUT" && chmod 700 "$OUT"
if [ -f "$OUT/gms-release.jks" ]; then
  echo "Keystore already exists at $OUT/gms-release.jks — not overwriting."
  exit 1
fi

read -r -s -p "Choose a keystore password (min 6 chars): " PASS; echo
read -r -s -p "Repeat password: " PASS2; echo
[ "$PASS" = "$PASS2" ] || { echo "Passwords do not match"; exit 1; }
[ ${#PASS} -ge 6 ] || { echo "Password too short"; exit 1; }

docker run --rm -e PASS="$PASS" -v "$OUT:/out" eclipse-temurin:21-jdk \
  keytool -genkeypair -v -keystore /out/gms-release.jks -storetype PKCS12 \
    -alias gms -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass:env PASS -keypass:env PASS \
    -dname "CN=GMS Garage, OU=Mobile, O=GMS, L=Pune, ST=Maharashtra, C=IN"

base64 -w0 "$OUT/gms-release.jks" > "$OUT/gms-release.jks.base64"
chmod 600 "$OUT"/*
echo
echo "Done. Files in $OUT:"
ls -l "$OUT"
echo "Open gms-release.jks.base64 in MobaXterm's editor and paste its contents into the ANDROID_KEYSTORE_BASE64 secret."
