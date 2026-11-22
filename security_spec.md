# Security Specification (Phase 0 TDD) — Ular Tangga Edukasi 3D

## Data Invariants
1. **Authenticated Identity**: Every read/write requires `request.auth != null` (supporting seamless Anonymous Auth sessions and Google Sign-In), while admin privileges strictly require `request.auth.token.email_verified == true`.
2. **Room Ownership (`hostId`)**: A room must have `hostId == request.auth.uid` on creation, `phase == 'waiting'`, and `hostId` & `createdAt` are immutable thereafter.
3. **Terminal State Lock & Host Restart**: Once `room.phase == 'finished'`, no student or non-owner can mutate the room state; only the room owner (`hostId`) or an admin can initiate a clean restart back to `'playing'`/`'waiting'` and reset players' round progress (`position: 1, score: 0, correctCount: 0, answeredCount: 0, finishOrder: 0`).
4. **Subcollection Master Gate & Bounded Arrays**: Players, questions, messages, and activity logs live in bounded subcollections under `/rooms/{roomCode}` rather than unbounded arrays, and every write verifies parent room existence and valid `roomCode` matching.
5. **Temporal Integrity**: `createdAt` and `updatedAt` are strictly enforced against `request.time`.
6. **No PII Leakage**: Emails are never stored in `/rooms`, `/players`, `/messages`, or `/leaderboard`.

## The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Room Create**: `request.auth == null` creating `/rooms/ABC123`.
2. **Unverified Admin Email Spoof**: `email == 'kedaikaryacollection@gmail.com'` with `email_verified: false` attempting admin delete/update on another host's room.
3. **Identity Spoofing on Room Create**: `hostId: 'victim_uid'` when `request.auth.uid == 'attacker_uid'`.
4. **Ghost Field / Shadow Update**: Updating `/rooms/ABC123` with `{ phase: 'playing', isVerified: true, updatedAt: request.time }`.
5. **Host Hijack Update**: Updating `/rooms/ABC123` with `{ hostId: 'attacker_uid', updatedAt: request.time }`.
6. **Timestamp Forgery**: Creating a room with `createdAt: Timestamp(2020-01-01)`.
7. **Post-Finish Mutation**: Student or non-owner attempting to update `/rooms/ABC123` from `phase: 'finished'` back to `phase: 'playing'`, or host attempting to mutate scores/settings while finished without resetting.
8. **ID Poisoning**: Creating `/rooms/invalid..room!!id` or >128 chars document ID.
9. **Position Bounds Abuse**: Updating `/rooms/ABC123/players/attacker` with `position: 999` or `score: -500`.
10. **Impersonating Another Student Pawn**: Updating `/rooms/ABC123/players/other_student_uid` as a non-host student.
11. **Non-Host Question Injection**: A student attempting to create/delete `/rooms/ABC123/questions/q1`.
12. **Blanket Room List Scrape**: Listing `/rooms` without filtering by `hostId == request.auth.uid`.
