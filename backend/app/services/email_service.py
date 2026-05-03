import logging
import smtplib
import threading
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def is_email_configured() -> bool:
    return bool(
        settings.smtp_host
        and settings.smtp_username
        and settings.smtp_password
        and settings.smtp_from_email
    )


def _smtp_parts():
    host = (settings.smtp_host or "").strip()
    username = (settings.smtp_username or "").strip()
    password = (settings.smtp_password or "").strip()
    from_email = (settings.smtp_from_email or "").strip()
    return host, username, password, from_email


def _text_to_html(subject: str, text_body: str) -> str:
    lines = (text_body or "").split("\n")
    body_html = "<br/>".join(line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") for line in lines)
    return f"""\
<html>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#714b67;color:#ffffff;padding:16px 20px;font-size:20px;font-weight:700;">
                Neubook
              </td>
            </tr>
            <tr>
              <td style="padding:22px 20px;">
                <h2 style="margin:0 0 12px 0;font-size:18px;color:#111827;">{subject}</h2>
                <div style="font-size:14px;line-height:1.65;color:#374151;">{body_html}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px;background:#f9fafb;font-size:12px;color:#6b7280;">
                This is an automated message from Neubook.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def send_email_ex(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> tuple[bool, str | None]:
    host, username, password, from_email = _smtp_parts()
    if not (host and username and password and from_email):
        logger.info("Email not sent (SMTP not configured). to=%s subject=%s", to_email, subject)
        return False, "SMTP not configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL."

    to_email = (to_email or "").strip()
    if not is_email_configured():
        logger.info("Email not sent (SMTP not configured). to=%s subject=%s", to_email, subject)
        return False, "SMTP not configured."

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = (
        f"{settings.smtp_from_name} <{from_email}>"
        if settings.smtp_from_name
        else from_email
    )
    msg["To"] = to_email
    msg.set_content(text_body)
    msg.add_alternative(html_body or _text_to_html(subject, text_body), subtype="html")

    try:
        with smtplib.SMTP(host, settings.smtp_port, timeout=20) as server:
            if settings.smtp_use_tls:
                server.starttls()
            server.login(username, password)
            server.send_message(msg)
        return True, None
    except Exception as ex:
        logger.exception("Failed to send email. to=%s subject=%s", to_email, subject)
        return False, str(ex)


def send_email(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    ok, _ = send_email_ex(to_email, subject, text_body, html_body=html_body)
    return ok


def send_email_async(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    def _worker():
        try:
            send_email_ex(to_email, subject, text_body, html_body=html_body)
        except Exception:
            logger.exception("Async email worker crashed. to=%s subject=%s", to_email, subject)

    threading.Thread(target=_worker, daemon=True).start()
