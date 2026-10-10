#!/usr/bin/env bash
set -e

BACKUP_DIR="/Users/arun/backups/OpusLex"
KEY_FILE="$BACKUP_DIR/recovery_key.txt"
RESTORE_DIR="/Users/arun/backups/OpusLex_Restore_Test"

if [ ! -f "$KEY_FILE" ]; then
    echo "Error: Key file missing at $KEY_FILE"
    exit 1
fi

LATEST_BACKUP=$(ls -1t "$BACKUP_DIR"/opuslex_backup_*.tar.gz.enc 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "Error: No backup found."
    exit 1
fi

echo "Testing restore of: $LATEST_BACKUP"

# Clean up any previous test
rm -rf "$RESTORE_DIR"
mkdir -p "$RESTORE_DIR"

cd "$RESTORE_DIR"

# Decrypt and extract
openssl enc -d -aes-256-cbc -pass file:"$KEY_FILE" -pbkdf2 -in "$LATEST_BACKUP" | tar -xzf -

echo "Extraction successful to: $RESTORE_DIR"

# Verify .git
if [ -d ".git" ]; then
    echo ".git directory verified."
else
    echo "Error: .git directory missing."
    exit 1
fi

# Verify .env files
if [ -f "backend/.env" ]; then
    echo "backend/.env verified."
else
    echo "Error: backend/.env missing."
    exit 1
fi

if [ -f "frontend/.env.local" ]; then
    echo "frontend/.env.local verified."
else
    echo "Error: frontend/.env.local missing."
    exit 1
fi

echo "Restore test passed successfully."
