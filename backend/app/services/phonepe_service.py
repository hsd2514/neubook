from dataclasses import dataclass
from uuid import uuid4

from app.config import settings


class PhonePeNotConfiguredError(ValueError):
    pass


@dataclass
class PhonePeInitResult:
    merchant_order_id: str
    state: str
    redirect_url: str
    order_id: str
    expire_at: int | None


@dataclass
class PhonePeStatusResult:
    state: str | None
    amount: int | None
    merchant_order_id: str | None
    raw: dict


def _client():
    if not settings.phonepe_client_id or not settings.phonepe_client_secret or not settings.phonepe_client_version:
        raise PhonePeNotConfiguredError("PhonePe credentials are not configured")

    from phonepe.sdk.pg.env import Env
    from phonepe.sdk.pg.payments.v2.standard_checkout_client import StandardCheckoutClient

    env_value = (settings.phonepe_env or "SANDBOX").upper()
    env = Env.PRODUCTION if env_value == "PRODUCTION" else Env.SANDBOX
    return StandardCheckoutClient.get_instance(
        client_id=settings.phonepe_client_id,
        client_secret=settings.phonepe_client_secret,
        client_version=settings.phonepe_client_version,
        env=env,
        should_publish_events=False,
    )


def initiate_payment(amount_paisa: int, redirect_url: str, merchant_order_id: str | None = None) -> PhonePeInitResult:
    if amount_paisa < 100:
        raise ValueError("amount_paisa must be at least 100")
    if not redirect_url:
        raise ValueError("redirect_url is required")

    from phonepe.sdk.pg.common.models.request.meta_info import MetaInfo
    from phonepe.sdk.pg.payments.v2.models.request.standard_checkout_pay_request import StandardCheckoutPayRequest

    client = _client()
    order_id = merchant_order_id or str(uuid4())
    pay_request = StandardCheckoutPayRequest.build_request(
        merchant_order_id=order_id,
        amount=amount_paisa,
        redirect_url=redirect_url,
        meta_info=MetaInfo(udf1="neubook"),
    )
    response = client.pay(pay_request)
    return PhonePeInitResult(
        merchant_order_id=order_id,
        state=getattr(response, "state", "UNKNOWN"),
        redirect_url=getattr(response, "redirect_url", ""),
        order_id=getattr(response, "order_id", ""),
        expire_at=getattr(response, "expire_at", None),
    )


def fetch_order_status(merchant_order_id: str) -> PhonePeStatusResult:
    if not merchant_order_id:
        raise ValueError("merchant_order_id is required")
    client = _client()
    response = client.get_order_status(merchant_order_id)

    # SDK response shape may vary by version; retain raw payload for compatibility.
    raw = response.__dict__ if hasattr(response, "__dict__") else {}
    return PhonePeStatusResult(
        state=getattr(response, "state", raw.get("state")),
        amount=getattr(response, "amount", raw.get("amount")),
        merchant_order_id=getattr(response, "merchant_order_id", raw.get("merchant_order_id")),
        raw=raw,
    )


def validate_callback(authorization_header_data: str, callback_response_data: str) -> dict:
    if not settings.phonepe_callback_username or not settings.phonepe_callback_password:
        raise PhonePeNotConfiguredError("PhonePe callback credentials are not configured")
    if not authorization_header_data:
        raise ValueError("authorization header is required")
    if not callback_response_data:
        raise ValueError("callback body is required")

    client = _client()
    callback_response = client.validate_callback(
        username=settings.phonepe_callback_username,
        password=settings.phonepe_callback_password,
        callback_header_data=authorization_header_data,
        callback_response_data=callback_response_data,
    )
    return callback_response.__dict__ if hasattr(callback_response, "__dict__") else {"event": None}
