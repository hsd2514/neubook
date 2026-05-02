# Issue Tracker

This file tracks planned work from chat and current delivery status.

## P0 (Do First: reliability + core booking correctness)

- [x] Concurrency-safe booking lock system (DB transaction + row lock + optional Redis lock)
- [x] Overlap-based capacity enforcement (not just same start-time)
- [x] Slot validity enforcement on create/reschedule (must match real generated slot)
- [x] Idempotency keys for booking create APIs (avoid duplicate submits)
- [x] Public/Unlisted/Private visibility model for appointment types (replace simple publish toggle)
- [x] Required question validation on both frontend and backend

## P1 (High impact product features)

- [x] Shareable booking link flow for unpublished appointments
- [ ] [#19](https://github.com/hsd2514/neubook/issues/19) QR per appointment type for shareable booking link - assignee: `kdt523`
- [ ] [#23](https://github.com/hsd2514/neubook/issues/23) Bulk slot blocking (date ranges + recurring blocks + holiday blocks) - assignee: `Aryan0550p`
- [ ] [#22](https://github.com/hsd2514/neubook/issues/22) Calendar sync (Google first, Apple ICS support next) - assignee: `JayDaftardar`
- [ ] [#20](https://github.com/hsd2514/neubook/issues/20) Advance payment real integration (on hold) - assignee: `hsd2514`
- [ ] [#21](https://github.com/hsd2514/neubook/issues/21) Notification system (email/WhatsApp/SMS) (on hold) - assignee: `hsd2514`

## P2 (Growth + distribution + business value)

- [ ] Embeddable booking widget (iframe/JS snippet)
- [ ] White-label booking page (logo/colors/domain)
- [x] Assignment mode auto/manual fully implemented
- [x] Flexible schedule mode fully implemented (not just weekly schema)

## P3 (Advanced ops + experience)

- [ ] Live provider handoff on last-minute cancellation with auto-reassign + alerts
- [ ] Private provider notes/tags on customer profile
- [x] Booking lifecycle completion flow (`completed` state ownership + automation)
- [ ] Reporting hardening (utilization, cancellation, conversion, no-show, payment metrics)

## P4 (Complex, optional for later)

- [ ] Offline booking queue with conflict resolution on reconnect
