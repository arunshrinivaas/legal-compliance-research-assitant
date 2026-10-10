import os
import sys
import glob
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/drive.file']
BACKUP_DIR = "/Users/arun/backups/OpusLex"

def get_drive_service():
    creds = None
    token_path = os.path.join(BACKUP_DIR, 'token.json')
    creds_path = os.path.join(BACKUP_DIR, 'credentials.json')

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(creds_path):
                print(f"Error: {creds_path} not found.")
                print("Please download an OAuth Client ID from Google Cloud Console and save it as credentials.json in the backup directory.")
                sys.exit(1)
            
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
            creds = flow.run_local_server(port=0)
            
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
            
    return build('drive', 'v3', credentials=creds)

def get_or_create_folder(service, folder_name):
    # Search for the folder
    query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    response = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    files = response.get('files', [])
    
    if files:
        return files[0].get('id')
    
    # Create the folder
    folder_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    file = service.files().create(body=folder_metadata, fields='id').execute()
    return file.get('id')

def upload_file(service, file_path, folder_id):
    file_name = os.path.basename(file_path)
    
    # Check if file already exists in the folder
    query = f"name='{file_name}' and '{folder_id}' in parents and trashed=false"
    response = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    existing_files = response.get('files', [])
    
    file_metadata = {
        'name': file_name,
        'parents': [folder_id]
    }
    media = MediaFileUpload(file_path, resumable=True)
    
    if existing_files:
        print(f"Updating existing file: {file_name}")
        file_id = existing_files[0].get('id')
        service.files().update(fileId=file_id, body={'name': file_name}, media_body=media).execute()
    else:
        print(f"Uploading new file: {file_name}")
        service.files().create(body=file_metadata, media_body=media).execute()

def main():
    print("Connecting to Google Drive...")
    service = get_drive_service()
    folder_id = get_or_create_folder(service, "OpusLex_Backups")
    print(f"Using Google Drive folder 'OpusLex_Backups' (ID: {folder_id})")
    
    # Sync current enc files
    current_files = glob.glob(os.path.join(BACKUP_DIR, "current", "**", "*.enc"), recursive=True)
    manifest = os.path.join(BACKUP_DIR, "manifest.json")
    
    upload_list = current_files
    if os.path.exists(manifest):
        upload_list.append(manifest)
        
    print(f"Found {len(upload_list)} files to sync.")
    for f in upload_list:
        upload_file(service, f, folder_id)
        
    print("Google Drive Sync Complete.")

if __name__ == '__main__':
    main()
