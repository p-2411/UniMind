from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

# Email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@unimind.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_verification_email(email: str, token: str, user_name: str):
    """Send verification email to user"""
    verification_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/verify-email?token={token}"

    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #f59e0b;">Welcome to UniMind!</h2>
                <p>Hi {user_name},</p>
                <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}"
                       style="background: linear-gradient(to right, #fcd34d, #f97316);
                              color: #000;
                              padding: 12px 30px;
                              text-decoration: none;
                              border-radius: 5px;
                              display: inline-block;
                              font-weight: bold;">
                        Verify Email
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{verification_url}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #999;">UniMind - Study Smarter</p>
            </div>
        </body>
    </html>
    """

    message = MessageSchema(
        subject="Verify your UniMind account",
        recipients=[email],
        body=html,
        subtype="html"
    )

    # Only send email if credentials are configured
    if conf.MAIL_USERNAME and conf.MAIL_PASSWORD:
        fm = FastMail(conf)
        await fm.send_message(message)
    else:
        # In development, just print the verification URL
        print(f"\n{'='*60}")
        print(f"VERIFICATION EMAIL (Development Mode)")
        print(f"To: {email}")
        print(f"Verification URL: {verification_url}")
        print(f"{'='*60}\n")