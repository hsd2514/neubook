# Issue Tracker

This file tracks active delivery priorities so we do not lose context.

## P0 - Booking Integrity and Access Control

- [ ] [#2](https://github.com/hsd2514/neubook/issues/2) P0: Prevent overlapping double-bookings (interval overlap + capacity) - assignee: `JayDaftardar`
- [ ] [#6](https://github.com/hsd2514/neubook/issues/6) P0: Enforce required booking questions on FE + BE - assignee: `JayDaftardar`
- [x] [#9](https://github.com/hsd2514/neubook/issues/9) P0: Add Redis-backed slot locking for concurrent booking safety - assignee: `Aryan0550`, `hsd2514`
- [ ] [#10](https://github.com/hsd2514/neubook/issues/10) P0: Add idempotency keys to booking create API - assignee: `JayDaftardar`
- [ ] [#11](https://github.com/hsd2514/neubook/issues/11) P0: Implement appointment visibility modes (public/unlisted/private) - assignee: `kdt523`

## P1 - Next Features

- [ ] [#3](https://github.com/hsd2514/neubook/issues/3) Share-link booking flow for unpublished appointments - assignee: `kdt523`

## P2 - Platform Features

- [ ] [#5](https://github.com/hsd2514/neubook/issues/5) Flexible slot scheduling (weekly + flexible) - assignee: `Aryan0550`
- [ ] [#7](https://github.com/hsd2514/neubook/issues/7) Assignment mode auto/manual behavior - assignee: `kdt523`

## P3 - Quality and Reporting

- [ ] [#8](https://github.com/hsd2514/neubook/issues/8) Lifecycle/reporting consistency + tests - assignee: `Aryan0550`






Absolutely. Here’s a combined priority backlog from what you requested + known system gaps.

**P0 (Do First: reliability + core booking correctness)**
1. Concurrency-safe booking lock system (DB transaction + row lock + optional Redis lock).
2. Overlap-based capacity enforcement (not just same start-time).
3. Slot validity enforcement on create/reschedule (must match real generated slot).
4. Idempotency keys for booking create APIs (avoid duplicate submits).
5. Public/Unlisted/Private visibility model for appointment types (replace simple publish toggle).
6. Required question validation on both frontend and backend.

**P1 (High impact product features)**
1. Shareable booking link + QR per appointment type.
2. Bulk slot blocking (date ranges + recurring blocks + holiday blocks).
3. Calendar sync (Google first, Apple ICS support next).
4. Advance payment real integration (keep on hold per your note).
5. Notification system (email/WhatsApp/SMS) (on hold per your note).

**P2 (Growth + distribution + business value)**
1. Embeddable booking widget (iframe/JS snippet).
2. White-label booking page (logo/colors/domain).
3. Assignment mode auto/manual fully implemented.
4. Flexible schedule mode fully implemented (not just weekly schema).

**P3 (Advanced ops + experience)**
1. Live provider handoff on last-minute cancellation with auto-reassign + alerts.
2. Private provider notes/tags on customer profile.
3. Booking lifecycle completion flow (`completed` state ownership + automation).
4. Reporting hardening (utilization, cancellation, conversion, no-show, payment metrics).

**P4 (Complex, optional for later)**
1. Offline booking queue with conflict resolution on reconnect.

If you want, I can convert this exact list into GitHub issues labeled `P0/P1/P2/P3/P4` and map owners.
