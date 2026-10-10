#!/usr/bin/env python3
import os
import time
import subprocess
from pathlib import Path

PROJECT_DIR = "/Users/arun/Documents/Projects/legal-compliance-research-assitant"
BACKUP_SCRIPT = os.path.join(PROJECT_DIR, "scripts/incremental_backup.py")
DEBOUNCE_SECONDS = 300  # 5 minutes
CHECK_INTERVAL = 60     # 1 minute

def get_latest_mtime():
    latest = 0
    for root, dirs, files in os.walk(PROJECT_DIR):
        # Exclude specific directories to speed up and avoid loops
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "dist", ".venv", "__pycache__", ".pytest_cache"}]
        for f in files:
            path = os.path.join(root, f)
            try:
                mtime = os.path.getmtime(path)
                if mtime > latest:
                    latest = mtime
            except OSError:
                pass
    return latest

def main():
    print(f"Starting auto-backup daemon for {PROJECT_DIR}")
    last_backup_time = time.time()

    while True:
        time.sleep(CHECK_INTERVAL)
        latest_change = get_latest_mtime()
        
        # If there has been a change since the last backup
        if latest_change > last_backup_time:
            # Check if changes have settled (debounce)
            time_since_change = time.time() - latest_change
            if time_since_change >= DEBOUNCE_SECONDS:
                print("Changes settled. Triggering backup...")
                try:
                    subprocess.run([BACKUP_SCRIPT], check=True)
                    last_backup_time = time.time()
                except subprocess.CalledProcessError as e:
                    print(f"Backup failed: {e}")

if __name__ == "__main__":
    main()
