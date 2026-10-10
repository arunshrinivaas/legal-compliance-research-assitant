#!/usr/bin/env bash
set -e

PROJECT_DIR="/Users/arun/Documents/Projects/legal-compliance-research-assitant"
BACKUP_DIR="/Users/arun/backups/OpusLex"
KEY_FILE="$BACKUP_DIR/recovery_key.txt"

mkdir -p "$BACKUP_DIR"

# Generate encryption key if it doesn't exist
if [ ! -f "$KEY_FILE" ]; then
    echo "Generating new recovery key..."
    openssl rand -base64 32 > "$KEY_FILE"
    chmod 400 "$KEY_FILE"
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="opuslex_backup_$TIMESTAMP.tar.gz.enc"
PART_FILE="$BACKUP_DIR/$BACKUP_NAME.part"
FINAL_FILE="$BACKUP_DIR/$BACKUP_NAME"

echo "Creating backup: $FINAL_FILE"

cd "$PROJECT_DIR"

# Create archive (excluding transient dirs), encrypt and write to .part file
tar -czf - \
    --exclude="node_modules" \
    --exclude="frontend/dist" \
    --exclude="backend/.venv" \
    --exclude="__pycache__" \
    --exclude=".pytest_cache" \
    --exclude=".DS_Store" \
    . | openssl enc -aes-256-cbc -salt -pass file:"$KEY_FILE" -pbkdf2 -out "$PART_FILE"

# Move to final location only if successful
mv "$PART_FILE" "$FINAL_FILE"
echo "Backup successful: $FINAL_FILE"

# Retention policy: keep 30 daily backups (or rather, latest 30 backups)
echo "Enforcing 30-backup retention policy..."
ls -1t "$BACKUP_DIR"/opuslex_backup_*.tar.gz.enc | tail -n +31 | xargs -I {} rm -f "{}"

echo "Backup complete."
