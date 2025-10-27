# Couple RPG API – Frontend Integration Guide

This document summarizes the HTTP contract that the frontend can rely on when
integrating with the Couple RPG backend. All routes use JSON payloads and
responses.

## Base configuration

- **Base URL**: depends on the deployment. Locally, the server listens on
  `http://localhost:3000` by default (see `src/server.ts`).
- **Authentication**: every protected route requires a Supabase JWT access token
  provided via `Authorization: Bearer <token>`. The token is verified against
  the Supabase JWKS that the backend is configured with (`src/auth/supabase-jwt.ts`).
- **Content type**: send `Content-Type: application/json` for every request body
  and expect JSON responses.
- **Error envelope**: failures return an object shaped as
  `{ "error": string, "message": string }` together with an appropriate HTTP
  status code (see endpoint notes for the most common values).

Unauthenticated requests to protected routes receive `401`. Many couple-specific
features respond with `409` (`conflict`) when the caller is not currently linked
to a couple.

## Health

### `GET /health`
Returns `{ "ok": true }`. Useful for uptime checks. No authentication required.

## Authentication

### `GET /auth/me`
Returns information about the authenticated Supabase user and their couple
membership.

```json
{
  "user": {
    "id": "uuid",
    "email": "person@example.com",
    "displayName": "...",
    "photoUrl": "..."
  },
  "couple": {
    "id": "...",
    "code": "ABCD1234",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "membership": {
    "role": "partner"
  }
}
```

If the user is not part of a couple yet, `couple` and `membership` are `null`.
The route requires authentication; missing or invalid tokens yield `401`.

## Couple management

### `POST /couple`
Creates a new couple entry for the caller and links them as the first member.

- **Body**: `{ "inviteCode"?: string }` (optional custom code, 4–16 chars).
- **Success**: `201 Created` with the couple record `{ id, code, createdAt }`.
- **Errors**: `409 conflict` if the caller is already part of a couple.

If `inviteCode` is omitted, the API autogenerates an 8-character uppercase code.

### `POST /couple/join`
Joins an existing couple via invite code.

- **Body**: `{ "code": string }`.
- **Success**: returns the matched couple record.
- **Errors**:
  - `404 not_found` when the code does not exist.
  - `409 conflict` when the caller already belongs to a couple.

### `GET /couple/:coupleId/stats`
Fetches gamification stats for the given couple.

- Verifies that the caller belongs to the couple identified by `:coupleId`.
- Returns `{ level, xp, hearts, dayStreak, weekStreak, affinity }`.
- If stats were never created, a default object with zeroed counters (except
  `level: 1`) is returned.
- **Errors**:
  - `409 conflict` if the caller is not in any couple.
  - `403 forbidden` if the caller tries to read another couple's stats.

## Profiles

### `GET /profiles/me`
Retrieves the caller's profile. Responds with a `UserProfile` object or `{}` if
no profile exists yet. Fields include `birthday`, `favorites`, `dislikes`,
`allergies`, `loveLanguages`, `hobbies`, `noGoList`, and `aboutMe`.

### `PUT /profiles/me`
Creates or updates the caller's profile.

- **Body schema**:
  ```json
  {
    "birthday": "2024-02-14T00:00:00.000Z",   // ISO datetime string or null
    "favorites": { "food": "sushi" },        // arbitrary JSON map or null
    "dislikes": { "music": "polka" },        // arbitrary JSON map or null
    "allergies": ["peanuts"],
    "loveLanguages": ["quality_time"],
    "hobbies": ["hiking"],
    "noGoList": ["horror movies"],
    "aboutMe": "Optional blurb"
  }
  ```
- Missing array fields default to empty arrays. Explicit `null` values are
  stored as `null`.
- **Success**: returns the upserted `UserProfile` record.

## Quests

### `GET /quests`
Lists active quests for the caller's couple. Returns an array of quest objects
(`Quest` model) sorted by database default order.

### `POST /quests`
Creates a quest for the caller's couple.

- **Body**:
  ```json
  {
    "coupleId": "...",             // must match caller's couple
    "title": "Plan a date night",
    "description": "Pick a restaurant",
    "schedule": "weekly",
    "assignedTo": "partner-user-id",
    "xpReward": 25,
    "heartReward": 3,
    "requiresConfirm": true
  }
  ```
- **Success**: `201 Created` with the new quest.
- **Errors**:
  - `409 conflict` if the caller is not in a couple.
  - `403 forbidden` if `coupleId` does not belong to the caller.

### `POST /quests/:questId/entries`
Creates a quest entry when someone reports progress/completion.

- **Body**: `{ "note"?: string, "photoUrl"?: string }`.
- **Success**: `201 Created` with the `QuestEntry` record.
- **Errors**: `404 not_found` if the quest does not exist or belongs to another
  couple.

### `POST /entries/:entryId/confirm`
Confirms another member's quest entry. When confirmation succeeds, the service
credits XP and hearts to the couple stats.

- **Success payload**:
  ```json
  {
    "entry": { ...updated QuestEntry (status = "confirmed") },
    "stats": { level, xp, hearts, dayStreak, weekStreak, affinity }
  }
  ```
- Only members other than the entry author can confirm; unauthorized attempts
  produce `500` with `Not allowed` (thrown by the service).

## Kudos

### `GET /kudos`
Returns all kudos for the caller's couple ordered by `createdAt DESC`.

### `POST /kudos`
Creates a kudos message directed to another partner.

- **Body**: `{ "toId": string, "text": string, "tags"?: string[] }`.
- **Success**: `201 Created` with the `Kudos` record.
- **Errors**:
  - `409 conflict` if the caller is not in a couple.
  - `404 not_found` if `toId` is not part of the caller's couple.

## Love Bank (Rewards)

### `GET /love-bank/rewards`
Lists active rewards for the couple.

### `POST /love-bank/rewards`
Creates a new reward.

- **Body**: `{ "title": string, "costHearts": number, "description"?: string, "active"?: boolean }`.
- **Success**: `201 Created` with the `Reward` record.

### `POST /love-bank/redeem`
Attempts to redeem a reward.

- **Body**: `{ "rewardId": string }`.
- The backend verifies that the reward is active and that the couple has enough
  hearts. On success it decrements hearts and creates a `Redemption` in `pending`
  status.
- **Errors**:
  - `404 not_found` if the reward does not exist for the couple.
  - `402 payment_required` if hearts are insufficient.

## Messages

### `GET /messages`
Paginates couple messages in reverse chronological order.

- **Query**: optional `cursor` string. Use the `meta.nextCursor` from a previous
  response to fetch the next page.
- Each call returns up to 25 messages:
  ```json
  {
    "items": [ { ...Message }, ... ],
    "meta": { "nextCursor": "opaque-base64" | null }
  }
  ```
- When `nextCursor` is `null`, there are no more messages.

### `POST /messages`
Creates a new message (or ping) between couple members.

- **Body**: `{ "toId": string, "kind"?: string, "text"?: string, "push"?: boolean }`.
  - `kind` defaults to `"ping"` if omitted.
  - `push` flags whether a push notification should be sent (currently not acted on).
- **Success**: `201 Created` with the `Message` record.

## Data model reference

The backend persists data with Prisma models defined in `prisma/schema.prisma`.
The frontend primarily interacts with:

- `User` and `UserProfile` for personal details.
- `Couple`, `CoupleMember`, and `CoupleStats` for relationship context.
- `Quest` and `QuestEntry` for cooperative tasks.
- `Kudos` for appreciation notes.
- `Message` for timeline communications.
- `Reward` and `Redemption` for love bank items.

Refer to the schema for exhaustive field lists and types when mapping responses
client-side.
