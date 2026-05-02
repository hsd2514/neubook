def signup_otp_email(full_name: str, code: str) -> tuple[str, str]:
    return (
        "Your Neubook verification code",
        (
            f"Hi {full_name},\n\n"
            f"Your Neubook verification code is: {code}\n"
            "This code expires in 15 minutes.\n\n"
            "If you did not request this, you can ignore this email."
        ),
    )


def reset_password_email(full_name: str, reset_link: str) -> tuple[str, str]:
    return (
        "Reset your Neubook password",
        (
            f"Hi {full_name},\n\n"
            "We received a password reset request for your Neubook account.\n"
            f"Reset link: {reset_link}\n\n"
            "This link expires in 1 hour.\n"
            "If you did not request this, you can ignore this email."
        ),
    )


def booking_customer_email(
    *,
    customer_name: str,
    service_name: str,
    when_utc: str,
    booking_id: int,
    subject: str,
    customer_line: str,
) -> tuple[str, str]:
    base = f"Service: {service_name}\nWhen: {when_utc}\nBooking ID: {booking_id}\n"
    return subject, f"Hi {customer_name},\n\n{customer_line}\n\n{base}"


def booking_organiser_email(
    *,
    organiser_name: str,
    service_name: str,
    when_utc: str,
    booking_id: int,
    subject: str,
    organiser_line: str,
) -> tuple[str, str]:
    base = f"Service: {service_name}\nWhen: {when_utc}\nBooking ID: {booking_id}\n"
    return subject, f"Hi {organiser_name},\n\n{organiser_line}\n\n{base}"


def waitlist_joined_email(customer_name: str, position: int, service_name: str, when_utc: str) -> tuple[str, str]:
    return (
        "You've been added to the waitlist",
        (
            f"Hi {customer_name},\n\n"
            f"You are now #{position} in the waitlist for:\n"
            f"  Service: {service_name}\n"
            f"  Time:    {when_utc}\n\n"
            "We will notify you if a spot becomes available."
        ),
    )


def waitlist_promoted_email(customer_name: str, service_name: str, when_utc: str) -> tuple[str, str]:
    return (
        "A spot opened up — book now!",
        (
            f"Hi {customer_name},\n\n"
            f"A spot has become available for:\n"
            f"  Service: {service_name}\n"
            f"  Time:    {when_utc}\n\n"
            "Please log in and complete your booking as soon as possible."
        ),
    )
