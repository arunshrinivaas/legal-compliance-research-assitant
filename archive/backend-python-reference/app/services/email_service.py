import logging
from email.message import EmailMessage
import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    async def send_otp(email: str, code: str) -> None:
        """Sends a 6-digit OTP to the specified email using the configured SMTP server."""
        if not settings.smtp_host or not settings.smtp_user:
            # We don't raise an exception that crashes the app, but we signal failure
            # so the caller can return a 503 Service Unavailable.
            logger.error("SMTP configuration is missing. Cannot send OTP.")
            raise ValueError("SMTP configuration is missing")
            
        message = EmailMessage()
        message["From"] = settings.smtp_from_email
        message["To"] = email
        message["Subject"] = "Your OpusLex Verification Code"
        
        body = f"""Hello,

Your OpusLex verification code is: {code}

This code expires in 5 minutes.
If you did not request this code, please ignore this email.

Best,
The OpusLex Team
"""
        message.set_content(body)

        try:
            await aiosmtplib.send(
                message,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_user,
                password=settings.smtp_password,
                use_tls=True if settings.smtp_port == 465 else False,
                start_tls=True if settings.smtp_port != 465 else False,
            )
        except Exception as e:
            # Log generically to avoid leaking credentials
            logger.error(f"Failed to send email OTP: {e.__class__.__name__}")
            raise RuntimeError("Failed to send email OTP") from e
