"""Seed the database with rich demo data.

Usage:
    uv run python seed.py
"""

from datetime import datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import joinedload

from app.database import Base, SessionLocal, engine
from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.booking_seat import BookingSeat
from app.models.question import Question
from app.models.resource import Resource
from app.models.schedule import Schedule
from app.models.seat import Seat
from app.models.seat_block import SeatBlock
from app.models.user import User
from app.models.waitlist import WaitlistEntry
from app.utils.password import hash_password

Base.metadata.create_all(bind=engine)

USERS = [
    {"full_name": "Alice Customer", "email": "customer@test.com", "password": "test1234", "role": "customer"},
    {"full_name": "Bea Customer", "email": "customer2@test.com", "password": "test1234", "role": "customer"},
    {"full_name": "Bob Organiser", "email": "organiser@test.com", "password": "test1234", "role": "organiser"},
    {"full_name": "Charlie Admin", "email": "admin@test.com", "password": "test1234", "role": "admin"},
]


def _get_or_create_user(db, data: dict) -> User:
    user = db.execute(select(User).where(User.email == data["email"])).scalar_one_or_none()
    if user:
        user.full_name = data["full_name"]
        user.role = data["role"]
        user.is_active = True
        if not user.password_hash:
            user.password_hash = hash_password(data["password"])
        print(f"  keep  {data['email']} [{data['role']}]")
        return user
    user = User(
        full_name=data["full_name"],
        email=data["email"],
        password_hash=hash_password(data["password"]),
        role=data["role"],
        is_active=True,
    )
    db.add(user)
    db.flush()
    print(f"  added {data['email']} [{data['role']}]")
    return user


def _upsert_appointments(db, organiser: User):
    specs = [
        {
            "name": "Dental care",
            "description": "General dental consultation and quick checks.",
            "duration_minutes": 30,
            "appointment_kind": "resource",
            "slot_schedule": "weekly",
            "is_published": True,
            "manage_capacity": True,
            "advance_payment": True,
            "manual_confirmation": True,
            "assignment_mode": "manual",
            "service_amount_paisa": 150000,
            "max_bookings_per_slot": 3,
            "share_link": "dental-care-demo",
            "resources": ["Dr. Maya", "Dr. Vipa"],
            "schedules": [
                {"day_of_week": 0, "start_time": time(10, 0), "end_time": time(13, 0)},
                {"day_of_week": 2, "start_time": time(14, 0), "end_time": time(17, 0)},
            ],
            "questions": [
                {"label": "Any pain area we should know?", "field_type": "text", "is_required": True, "sort_order": 1},
                {"label": "Need anesthesia discussion?", "field_type": "checkbox", "is_required": False, "sort_order": 2},
            ],
        },
        {
            "name": "Tennis court booking",
            "description": "Reserve a tennis court by slot.",
            "duration_minutes": 60,
            "appointment_kind": "resource",
            "slot_schedule": "weekly",
            "is_published": True,
            "manage_capacity": False,
            "advance_payment": False,
            "manual_confirmation": False,
            "assignment_mode": "manual",
            "service_amount_paisa": 80000,
            "max_bookings_per_slot": 1,
            "share_link": "tennis-demo",
            "resources": ["Court 1", "Court 2"],
            "schedules": [
                {"day_of_week": 1, "start_time": time(8, 0), "end_time": time(12, 0)},
                {"day_of_week": 4, "start_time": time(16, 0), "end_time": time(20, 0)},
            ],
            "questions": [
                {"label": "Any special request?", "field_type": "text", "is_required": False, "sort_order": 1},
            ],
        },
        {
            "name": "Private mentor session",
            "description": "1:1 mentoring call by appointment.",
            "duration_minutes": 45,
            "appointment_kind": "user",
            "slot_schedule": "weekly",
            "is_published": True,
            "manage_capacity": False,
            "advance_payment": False,
            "manual_confirmation": False,
            "assignment_mode": "manual",
            "service_amount_paisa": 250000,
            "max_bookings_per_slot": 1,
            "share_link": "mentor-demo",
            "resources": [],
            "schedules": [
                {"day_of_week": 3, "start_time": time(9, 0), "end_time": time(12, 0)},
            ],
            "questions": [
                {"label": "What topic should we cover?", "field_type": "text", "is_required": True, "sort_order": 1},
            ],
        },
        {
            "name": "Cinema premiere seating",
            "description": "Pick your exact seats from a visual seat map.",
            "duration_minutes": 120,
            "appointment_kind": "resource",
            "slot_schedule": "weekly",
            "is_published": True,
            "manage_capacity": False,
            "advance_payment": True,
            "manual_confirmation": False,
            "assignment_mode": "manual",
            "booking_mode": "seat_map",
            "service_amount_paisa": 45000,
            "max_bookings_per_slot": 200,
            "share_link": "cinema-seatmap-demo",
            "resources": ["Hall A"],
            "schedules": [
                {"day_of_week": 5, "start_time": time(18, 0), "end_time": time(22, 0)},
            ],
            "seat_blocks": [
                {"name": "Gold", "seat_class": "premium", "color": "#F59E0B", "price_override_paisa": 60000},
                {"name": "Silver", "seat_class": "standard", "color": "#60A5FA", "price_override_paisa": 45000},
            ],
            "seats": [
                {"block_name": "Gold", "row_label": "A", "col_start": 1, "count": 6},
                {"block_name": "Silver", "row_label": "B", "col_start": 1, "count": 8},
                {"block_name": "Silver", "row_label": "C", "col_start": 1, "count": 8},
            ],
            "questions": [
                {"label": "Need accessibility support?", "field_type": "checkbox", "is_required": False, "sort_order": 1},
            ],
        },
        {
            "name": "Flash Sale Coaching (Waitlist Demo)",
            "description": "Intentionally high-demand slot to demonstrate waitlist join and queue position.",
            "duration_minutes": 30,
            "appointment_kind": "user",
            "slot_schedule": "weekly",
            "is_published": True,
            "manage_capacity": True,
            "advance_payment": False,
            "manual_confirmation": False,
            "assignment_mode": "manual",
            "booking_mode": "capacity",
            "service_amount_paisa": 99000,
            "max_bookings_per_slot": 1,
            "share_link": "waitlist-demo",
            "resources": [],
            "schedules": [
                {"day_of_week": 2, "start_time": time(11, 0), "end_time": time(13, 0)},
            ],
            "questions": [
                {"label": "Preferred focus area", "field_type": "text", "is_required": True, "sort_order": 1},
            ],
        },
        {
            "name": "Founder AMA (Unlisted Demo)",
            "description": "Link-only booking page to demo unlisted visibility.",
            "duration_minutes": 40,
            "appointment_kind": "user",
            "slot_schedule": "weekly",
            "visibility": "unlisted",
            "is_published": True,
            "manage_capacity": False,
            "advance_payment": False,
            "manual_confirmation": False,
            "assignment_mode": "manual",
            "booking_mode": "capacity",
            "service_amount_paisa": 120000,
            "max_bookings_per_slot": 2,
            "share_link": "unlisted-demo",
            "resources": [],
            "schedules": [
                {"day_of_week": 6, "start_time": time(15, 0), "end_time": time(18, 0)},
            ],
            "questions": [
                {"label": "Where did you hear about this?", "field_type": "text", "is_required": False, "sort_order": 1},
            ],
        },
        {
            "name": "Internal Interview Loop (Private Demo)",
            "description": "Private appointment type should not appear in public listing.",
            "duration_minutes": 45,
            "appointment_kind": "user",
            "slot_schedule": "weekly",
            "visibility": "private",
            "is_published": True,
            "manage_capacity": False,
            "advance_payment": False,
            "manual_confirmation": True,
            "assignment_mode": "manual",
            "booking_mode": "capacity",
            "service_amount_paisa": 0,
            "max_bookings_per_slot": 1,
            "share_link": "private-demo",
            "resources": [],
            "schedules": [
                {"day_of_week": 1, "start_time": time(10, 0), "end_time": time(12, 0)},
            ],
            "questions": [
                {"label": "Interview panel notes", "field_type": "text", "is_required": True, "sort_order": 1},
            ],
        },
    ]

    created = []
    for spec in specs:
        appt = (
            db.execute(
                select(AppointmentType)
                .options(
                    joinedload(AppointmentType.resources),
                    joinedload(AppointmentType.schedules),
                    joinedload(AppointmentType.seat_blocks),
                    joinedload(AppointmentType.seats),
                    joinedload(AppointmentType.questions),
                )
                .where(
                    AppointmentType.organiser_id == organiser.id,
                    AppointmentType.name == spec["name"],
                )
            )
            .unique()
            .scalar_one_or_none()
        )
        if not appt:
            appt = AppointmentType(
                organiser_id=organiser.id,
                **{k: spec[k] for k in spec if k not in ("resources", "schedules", "questions", "seat_blocks", "seats")}
            )
            db.add(appt)
            db.flush()
            print(f"  added appointment: {spec['name']}")
        else:
            for key, value in spec.items():
                if key in ("resources", "schedules", "questions", "seat_blocks", "seats"):
                    continue
                setattr(appt, key, value)
            print(f"  keep  appointment: {spec['name']}")

        # reset child records to keep deterministic demo data
        existing_seat_ids = [s.id for s in list(appt.seats)]
        if existing_seat_ids:
            db.query(BookingSeat).filter(BookingSeat.seat_id.in_(existing_seat_ids)).delete(synchronize_session=False)
        for s in list(appt.seats):
            db.delete(s)
        for sb in list(appt.seat_blocks):
            db.delete(sb)
        for r in list(appt.resources):
            db.delete(r)
        for s in list(appt.schedules):
            db.delete(s)
        for q in list(appt.questions):
            db.delete(q)
        db.flush()

        resource_id_map = {}
        for r_name in spec["resources"]:
            r = Resource(appointment_type_id=appt.id, name=r_name, working_hours=None)
            db.add(r)
            db.flush()
            resource_id_map[r_name] = r.id

        for s in spec["schedules"]:
            db.add(
                Schedule(
                    appointment_type_id=appt.id,
                    resource_id=None if appt.appointment_kind == "user" else None,
                    day_of_week=s["day_of_week"],
                    start_time=s["start_time"],
                    end_time=s["end_time"],
                )
            )

        for q in spec["questions"]:
            db.add(Question(appointment_type_id=appt.id, options=None, **q))

        block_id_map = {}
        for b in spec.get("seat_blocks", []):
            block = SeatBlock(
                appointment_type_id=appt.id,
                resource_id=None,
                name=b["name"],
                seat_class=b.get("seat_class", "standard"),
                color=b.get("color"),
                price_override_paisa=b.get("price_override_paisa"),
                x=0,
                y=0,
                width=1,
                height=1,
            )
            db.add(block)
            db.flush()
            block_id_map[b["name"]] = block.id

        for seat_group in spec.get("seats", []):
            block_id = block_id_map.get(seat_group["block_name"])
            if not block_id:
                continue
            row_label = seat_group["row_label"]
            col_start = seat_group.get("col_start", 1)
            count = seat_group["count"]
            for i in range(count):
                col_number = col_start + i
                db.add(
                    Seat(
                        appointment_type_id=appt.id,
                        block_id=block_id,
                        resource_id=None,
                        label=f"{row_label}{col_number}",
                        row_label=row_label,
                        col_number=col_number,
                        seat_type="normal",
                        status="active",
                        x=i,
                        y=0,
                    )
                )

        created.append(appt)
    db.flush()
    return created


def _seed_bookings(db, appointments: list[AppointmentType], customer: User, customer2: User):
    for appt in appointments:
        db.query(Booking).filter(Booking.appointment_type_id == appt.id).delete(synchronize_session=False)
        db.query(WaitlistEntry).filter(WaitlistEntry.appointment_type_id == appt.id).delete(synchronize_session=False)
    db.flush()

    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    future_1 = now + timedelta(days=2, hours=2)
    future_2 = now + timedelta(days=4, hours=1)
    past_1 = now - timedelta(days=2, hours=1)

    for appt in appointments:
        resource_id = None
        if appt.appointment_kind == "resource":
            first_resource = db.execute(select(Resource).where(Resource.appointment_type_id == appt.id).order_by(Resource.id)).scalars().first()
            resource_id = first_resource.id if first_resource else None

        # upcoming booking
        booking_1 = Booking(
            customer_id=customer.id,
            appointment_type_id=appt.id,
            resource_id=resource_id,
            start_time=future_1,
            end_time=future_1 + timedelta(minutes=appt.duration_minutes),
            capacity=1,
            status="pending" if appt.manual_confirmation else "confirmed",
            payment_status="paid" if appt.advance_payment else "not_required",
            payment_reference="seed_txn_1001" if appt.advance_payment else None,
            answers={"seed": True},
        )
        db.add(booking_1)
        db.flush()

        if appt.booking_mode == "seat_map":
            demo_seat = (
                db.execute(select(Seat).where(Seat.appointment_type_id == appt.id).order_by(Seat.id.asc()))
                .scalars()
                .first()
            )
            if demo_seat:
                db.add(BookingSeat(booking_id=booking_1.id, seat_id=demo_seat.id))
        # another booking for utilization
        db.add(
            Booking(
                customer_id=customer2.id,
                appointment_type_id=appt.id,
                resource_id=resource_id,
                start_time=future_2,
                end_time=future_2 + timedelta(minutes=appt.duration_minutes),
                capacity=1,
                status="confirmed",
                payment_status="paid" if appt.advance_payment else "not_required",
                payment_reference="seed_txn_2001" if appt.advance_payment else None,
                answers={"seed": True},
            )
        )
        # past/cancelled sample
        db.add(
            Booking(
                customer_id=customer.id,
                appointment_type_id=appt.id,
                resource_id=resource_id,
                start_time=past_1,
                end_time=past_1 + timedelta(minutes=appt.duration_minutes),
                capacity=1,
                status="cancelled",
                payment_status="not_required",
                payment_reference=None,
                answers={"seed": True},
            )
        )

        if appt.name == "Flash Sale Coaching (Waitlist Demo)":
            db.add(
                WaitlistEntry(
                    customer_id=customer2.id,
                    appointment_type_id=appt.id,
                    resource_id=None,
                    start_time=future_1,
                    seat_ids=None,
                    answers={"seed": True, "reason": "demo waitlist"},
                    position=1,
                    status="waiting",
                )
            )


def seed():
    db = SessionLocal()
    try:
        print("\nSeeding users...")
        users = {u["email"]: _get_or_create_user(db, u) for u in USERS}
        db.flush()

        organiser = users["organiser@test.com"]
        customer = users["customer@test.com"]
        customer2 = users["customer2@test.com"]

        print("\nSeeding appointments/resources/schedules/questions...")
        appointments = _upsert_appointments(db, organiser)

        print("\nSeeding sample bookings...")
        _seed_bookings(db, appointments, customer, customer2)

        try:
            db.commit()
        except ProgrammingError as exc:
            db.rollback()
            msg = str(exc).lower()
            if "payment_status" in msg or "payment_reference" in msg:
                print("\nDatabase schema is behind models.")
                print("Run: uv run alembic upgrade head")
                print("Then rerun: uv run python seed.py\n")
                return
            raise

        print("\nDone! Test accounts:\n")
        for u in USERS:
            print(f"  {u['role']:12} {u['email']:24} password: {u['password']}")
        print("\nDemo services:")
        for appt in appointments:
            print(f"  - {appt.name} (published={appt.is_published}, advance_payment={appt.advance_payment})")
        print("\nCustomer demo checklist:")
        print("  1) Payment + manual confirmation: Dental care")
        print("  2) Seat-map booking: Cinema premiere seating")
        print("  3) Waitlist flow (full slot): Flash Sale Coaching (Waitlist Demo)")
        print("  4) Unlisted link-only flow: /book/share/unlisted-demo")
        print("  5) Private visibility check: Internal Interview Loop (Private Demo) should NOT appear publicly")
        print()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
