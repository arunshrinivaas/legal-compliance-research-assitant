from cryptography.fernet import Fernet
from app.config import settings

# Make sure OAUTH_ENCRYPTION_KEY is available in settings
_fernet = None
if hasattr(settings, 'oauth_encryption_key') and settings.oauth_encryption_key:
    _fernet = Fernet(settings.oauth_encryption_key.encode('utf-8'))

def encrypt_token(token: str) -> str:
    if not token:
        return None
    if not _fernet:
        raise ValueError("OAUTH_ENCRYPTION_KEY is not configured.")
    return _fernet.encrypt(token.encode('utf-8')).decode('utf-8')

def decrypt_token(encrypted_token: str) -> str:
    if not encrypted_token:
        return None
    if not _fernet:
        raise ValueError("OAUTH_ENCRYPTION_KEY is not configured.")
    return _fernet.decrypt(encrypted_token.encode('utf-8')).decode('utf-8')
