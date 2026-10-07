from datetime import datetime, timedelta
import secrets
import urllib.parse
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import google_auth_oauthlib.flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import googleapiclient.errors

from app.database import get_db
from app.models.user import User
from app.models.integration import Integration
from app.routers.auth import get_current_user
from app.config import settings
from app.utils.crypto import encrypt_token, decrypt_token

router = APIRouter(prefix="/api/v1/integrations", tags=["Integrations"])

GOOGLE_DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file", "openid", "email", "profile"]
REDIRECT_URI = "http://localhost:5173/settings"  # In a real app this should be configurable
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

_oauth_states: dict = {}

def _cleanup_states():
    now = datetime.utcnow()
    expired = [k for k, v in _oauth_states.items() if v["expires_at"] < now]
    for k in expired:
        del _oauth_states[k]

def _get_google_flow(state: Optional[str] = None) -> google_auth_oauthlib.flow.Flow:
    client_config = {
        "web": {
            "client_id": settings.google_client_id,
            "project_id": "opuslex",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": settings.google_client_secret
        }
    }
    return google_auth_oauthlib.flow.Flow.from_client_config(
        client_config, scopes=GOOGLE_DRIVE_SCOPES, state=state
    )

@router.get("/google-drive/auth-url")
def get_google_drive_auth_url(current_user: User = Depends(get_current_user)):
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    _cleanup_states()
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = {
        "user_id": current_user.id,
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    }
    
    flow = _get_google_flow(state=state)
    flow.redirect_uri = REDIRECT_URI
    
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    return {"auth_url": auth_url, "state": state}

@router.post("/google-drive/callback")
def google_drive_callback(
    request_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    code = request_data.get("code")
    state = request_data.get("state")
    
    _cleanup_states()
    
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")
        
    if state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid, expired, or reused state")
        
    state_data = _oauth_states.pop(state)
    
    if state_data["user_id"] != current_user.id:
        raise HTTPException(status_code=400, detail="State does not belong to current user")
        
    if state_data["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="State expired")
        
    flow = _get_google_flow(state=state)
    flow.redirect_uri = REDIRECT_URI
    
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
        
    credentials = flow.credentials
    
    # Get user profile information to store identifier
    import google.auth.transport.requests
    import google.oauth2.id_token
    request = google.auth.transport.requests.Request()
    try:
        id_info = google.oauth2.id_token.verify_oauth2_token(
            credentials.id_token, request, settings.google_client_id
        )
        google_email = id_info.get("email")
    except Exception:
        google_email = None

    integration = db.query(Integration).filter(
        Integration.user_id == current_user.id,
        Integration.provider == "google_drive"
    ).first()
    
    if not integration:
        integration = Integration(
            user_id=current_user.id,
            provider="google_drive"
        )
        db.add(integration)
        
    integration.provider_account_id = google_email
    integration.access_token = credentials.token
    if credentials.refresh_token:
        integration.refresh_token_encrypted = encrypt_token(credentials.refresh_token)
    integration.expires_at = credentials.expiry
    integration.scopes = ",".join(credentials.scopes) if credentials.scopes else None
    
    db.commit()
    
    return {"status": "success", "connected_account": google_email}

@router.get("/google-drive/status")
def google_drive_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    integration = db.query(Integration).filter(
        Integration.user_id == current_user.id,
        Integration.provider == "google_drive"
    ).first()
    
    if not integration:
        return {"connected": False}
        
    return {
        "connected": True,
        "provider": "google_drive",
        "provider_account_id": integration.provider_account_id,
        "scopes": integration.scopes,
        "connected_at": integration.created_at,
        "access_token": integration.access_token  # Required for Google Picker frontend
    }

@router.delete("/google-drive")
def delete_google_drive(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    integration = db.query(Integration).filter(
        Integration.user_id == current_user.id,
        Integration.provider == "google_drive"
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    # Attempt to revoke Google token
    import requests
    if integration.access_token:
        try:
            requests.post('https://oauth2.googleapis.com/revoke',
                params={'token': integration.access_token},
                headers={'content-type': 'application/x-www-form-urlencoded'}
            )
        except Exception:
            pass
            
    db.delete(integration)
    db.commit()
    return {"status": "success"}

@router.post("/google-drive/import")
def import_from_google_drive(
    import_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_id = import_data.get("file_id")
    if not file_id:
        raise HTTPException(status_code=400, detail="Missing file_id")
        
    integration = db.query(Integration).filter(
        Integration.user_id == current_user.id,
        Integration.provider == "google_drive"
    ).first()
    
    if not integration or not integration.refresh_token_encrypted:
        raise HTTPException(status_code=401, detail="Google Drive not connected")
        
    try:
        refresh_token = decrypt_token(integration.refresh_token_encrypted)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt token")
        
    creds = Credentials(
        token=integration.access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=integration.scopes.split(",") if integration.scopes else GOOGLE_DRIVE_SCOPES
    )
    
    try:
        drive_service = build('drive', 'v3', credentials=creds)
        file_metadata = drive_service.files().get(fileId=file_id, fields='id, name, mimeType, size').execute()
        
        file_size = int(file_metadata.get('size', 0))
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File size exceeds the 50MB limit.")
        
        # Download the file content
        import io
        from googleapiclient.http import MediaIoBaseDownload
        
        request = drive_service.files().get_media(fileId=file_id)
        if 'application/vnd.google-apps' in file_metadata.get('mimeType', ''):
             # Export Google Docs
             export_mime = 'application/pdf'
             if 'document' in file_metadata['mimeType']:
                 export_mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
             request = drive_service.files().export_media(fileId=file_id, mimeType=export_mime)
             
        file_content = io.BytesIO()
        downloader = MediaIoBaseDownload(file_content, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            if file_content.tell() > MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail="File size exceeds the 50MB limit during download.")
            
        file_content.seek(0)
        
        # Use existing document ingestion
        from app.routers.document import upload_document_internal
        from fastapi import UploadFile
        
        # Create a mock UploadFile
        filename = file_metadata.get('name', 'imported_file')
        upload_file = UploadFile(filename=filename, file=file_content)
        
        # Ingest
        doc = upload_document_internal(db, upload_file, current_user.id)
        
        # Update tokens if refreshed
        if creds.token != integration.access_token:
            integration.access_token = creds.token
            integration.expires_at = creds.expiry
            db.commit()
            
        return {"status": "success", "document_id": doc.id, "filename": doc.filename}
        
    except googleapiclient.errors.HttpError as e:
        if e.resp.status in [401, 403]:
            # Token might be revoked
            db.delete(integration)
            db.commit()
            raise HTTPException(status_code=401, detail="Google Drive authorization revoked. Please reconnect.")
        raise HTTPException(status_code=400, detail="Failed to download file from Google Drive")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
