#!/usr/bin/env python3
import os
import sys
import json
import time
import shutil
import subprocess
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64
import hashlib

PROJECT_DIR = "/Users/arun/Documents/Projects/legal-compliance-research-assitant"
BACKUP_DIR = "/Users/arun/backups/OpusLex"
CURRENT_DIR = os.path.join(BACKUP_DIR, "current")
HISTORY_DIR = os.path.join(BACKUP_DIR, "history")
MANIFEST_FILE = os.path.join(BACKUP_DIR, "manifest.json")
EXCLUDES = {".git", "node_modules", "dist", ".venv", "venv", "__pycache__", ".pytest_cache"}
RETENTION_LIMIT = 30

def get_encryption_key(allow_generate=False):
    try:
        # Try to read from keychain
        result = subprocess.run(
            ["security", "find-generic-password", "-s", "OpusLexBackup", "-a", "arun", "-w"],
            capture_output=True, text=True, check=True
        )
        return base64.b64decode(result.stdout.strip())
    except subprocess.CalledProcessError:
        if not allow_generate:
            print("ERROR: Encryption key not found in Keychain.")
            print("To prevent rendering existing backups unrecoverable, a new key will NOT be automatically generated.")
            print("If this is a first-time setup, re-run with --setup")
            sys.exit(1)
        # Generate new key
        print("Generating new AES-256-GCM encryption key and storing in Keychain...")
        key = AESGCM.generate_key(bit_length=256)
        key_b64 = base64.b64encode(key).decode('utf-8')
        subprocess.run(
            ["security", "add-generic-password", "-s", "OpusLexBackup", "-a", "arun", "-w", key_b64],
            check=True
        )
        return key

def encrypt_file(input_path, output_path, key):
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    with open(input_path, 'rb') as f:
        data = f.read()
    ct = aesgcm.encrypt(nonce, data, None)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    temp_path = output_path + ".tmp"
    with open(temp_path, 'wb') as f:
        f.write(nonce + ct)
    os.rename(temp_path, output_path)

def decrypt_file(input_path, output_path, key):
    aesgcm = AESGCM(key)
    with open(input_path, 'rb') as f:
        data = f.read()
    nonce = data[:12]
    ct = data[12:]
    pt = aesgcm.decrypt(nonce, ct, None)
    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(pt)

def hash_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def load_manifest():
    if os.path.exists(MANIFEST_FILE):
        with open(MANIFEST_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_manifest(manifest):
    temp_manifest = MANIFEST_FILE + ".tmp"
    with open(temp_manifest, 'w') as f:
        json.dump(manifest, f, indent=2)
    os.rename(temp_manifest, MANIFEST_FILE)

def enforce_retention():
    # Keep RETENTION_LIMIT versions per file in history
    history_files = {}
    import re
    # Match: basename _ [deleted_] timestamp [_counter] .enc
    pattern = re.compile(r'^(.*?)_?(deleted_)?(\d+)(?:_\d+)?\.enc$')
    for root, dirs, files in os.walk(HISTORY_DIR):
        for f in files:
            m = pattern.match(f)
            if not m: continue
            base_name, deleted_flag, ts_part = m.groups()
            
            rel_dir = os.path.relpath(root, HISTORY_DIR)
            if rel_dir == ".": rel_path = base_name
            else: rel_path = os.path.join(rel_dir, base_name)
            
            try:
                ts = int(ts_part)
                if rel_path not in history_files:
                    history_files[rel_path] = []
                history_files[rel_path].append((ts, os.path.join(root, f)))
            except ValueError:
                continue

    for rel_path, versions in history_files.items():
        if len(versions) > RETENTION_LIMIT:
            versions.sort(key=lambda x: x[0], reverse=True) # Sort descending by timestamp
            for ts, path in versions[RETENTION_LIMIT:]:
                try:
                    os.remove(path)
                except OSError:
                    pass

def main():
    if "--export-key" in sys.argv:
        try:
            out_file = sys.argv[2]
            key = get_encryption_key(allow_generate=False)
            with open(out_file, 'wb') as f:
                f.write(base64.b64encode(key))
            print(f"SUCCESS: Recovery key exported securely to {out_file}.")
            print("Please store this key offline (e.g., in a secure password manager or external drive).")
            print("Do NOT upload this key to Google Drive or commit it to version control.")
            sys.exit(0)
        except Exception as e:
            print(f"Export failed: {e}")
            sys.exit(1)

    if "--decrypt" in sys.argv:
        try:
            in_file = sys.argv[sys.argv.index("--decrypt") + 1]
            out_file = sys.argv[sys.argv.index("--decrypt") + 2]
            
            if "--key-file" in sys.argv:
                key_file = sys.argv[sys.argv.index("--key-file") + 1]
                with open(key_file, 'rb') as f:
                    key = base64.b64decode(f.read().strip())
            else:
                key = get_encryption_key(allow_generate=False)
                
            decrypt_file(in_file, out_file, key)
            print(f"Successfully decrypted {in_file} to {out_file}")
            sys.exit(0)
        except Exception as e:
            print(f"Decryption failed: {e}")
            sys.exit(1)

    allow_generate = "--setup" in sys.argv
    if not os.path.exists(BACKUP_DIR) and allow_generate:
        os.makedirs(BACKUP_DIR, exist_ok=True)
    elif not os.path.exists(BACKUP_DIR):
        print(f"ERROR: Backup directory {BACKUP_DIR} does not exist. Run with --setup")
        sys.exit(1)
        
    os.makedirs(CURRENT_DIR, exist_ok=True)
    os.makedirs(HISTORY_DIR, exist_ok=True)
    
    key = get_encryption_key(allow_generate=allow_generate)
    manifest = load_manifest()
    
    current_files = {}
    
    # Scan project
    for root, dirs, files in os.walk(PROJECT_DIR):
        # Prevent diving into excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDES and not (os.path.join(root, d) == os.path.join(PROJECT_DIR, "backend/uploads")) and not (os.path.join(root, d).endswith("venv"))]
        for f in files:
            if f == ".DS_Store" or f.endswith(".pyc"): continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, PROJECT_DIR)
            current_files[rel_path] = full_path

    timestamp = int(time.time())
    new_manifest = manifest.copy()
    changes_made = False

    # Check for modifications and new files
    for rel_path, full_path in current_files.items():
        try:
            file_hash = hash_file(full_path)
        except Exception:
            continue
        
        enc_output = os.path.join(CURRENT_DIR, rel_path + ".enc")
        
        if rel_path not in manifest or manifest[rel_path]['hash'] != file_hash:
            if rel_path in manifest and os.path.exists(enc_output):
                # Ensure no collision
                hist_path = os.path.join(HISTORY_DIR, f"{rel_path}_{timestamp}.enc")
                counter = 1
                while os.path.exists(hist_path):
                    hist_path = os.path.join(HISTORY_DIR, f"{rel_path}_{timestamp}_{counter}.enc")
                    counter += 1
                os.makedirs(os.path.dirname(hist_path), exist_ok=True)
                shutil.move(enc_output, hist_path)
            
            print(f"Backing up {rel_path}")
            encrypt_file(full_path, enc_output, key)
            new_manifest[rel_path] = {'hash': file_hash, 'mtime': os.path.getmtime(full_path)}
            changes_made = True

    # Check for deleted files
    for rel_path in list(manifest.keys()):
        if rel_path not in current_files:
            enc_output = os.path.join(CURRENT_DIR, rel_path + ".enc")
            if os.path.exists(enc_output):
                hist_path = os.path.join(HISTORY_DIR, f"{rel_path}_deleted_{timestamp}.enc")
                counter = 1
                while os.path.exists(hist_path):
                    hist_path = os.path.join(HISTORY_DIR, f"{rel_path}_deleted_{timestamp}_{counter}.enc")
                    counter += 1
                os.makedirs(os.path.dirname(hist_path), exist_ok=True)
                shutil.move(enc_output, hist_path)
                print(f"File deleted: {rel_path}")
            del new_manifest[rel_path]
            changes_made = True

    if changes_made:
        save_manifest(new_manifest)
        enforce_retention()
        print("Backup complete.")
    else:
        print("No changes to back up.")

if __name__ == '__main__':
    main()
