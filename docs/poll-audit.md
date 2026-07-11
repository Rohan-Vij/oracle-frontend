# Voting system audit — 2026-07-11

## What actually sucks (ranked)

1. **The votes aren't real.** Counts are a hardcoded seed (`SEED`) plus the
   visitor's own +1. Every visitor sees the same "14,168 votes"; nobody ever
   sees anyone else's vote. This is the core problem and it is not fixable
   client-side — it needs the poll endpoint. The contract the frontend now
   expects is documented in `src/services/poll.js`; the UI is fully wired to
   it, so standing up the endpoint is the only remaining step.
2. **No abuse resistance.** localStorage is trivially clearable; one person
   can vote unlimited times once the endpoint exists. Server must own
   dedupe/rate limits (per-IP + per-session at minimum). Client can't do this.
3. **No stakes, no closure.** A poll on a match page should close at kickoff
   and freeze the tally as "the crowd's final answer." Client now shows
   "Voting closes at kickoff"; the server should enforce it.
4. **Options had no identity.** Three identical text buttons — nothing
   signaled country or connected the ballot to the result bars' colors.
   Fixed: flags on the Norway/England options, the neutral draw swatch on
   Draw, matching the results palette.
5. **Voting felt inconsequential.** After voting you saw bars and nothing
   else. Fixed: the results now tell you whether you sided with or against
   the model — the one-line payoff that makes the vote feel like a position.
6. **No pressed/active feedback.** Buttons inverted on hover but gave no
   press response. Fixed with an :active state.

## Deliberate non-changes

- **No tallies on the ballot itself.** Showing the crowd split before you
  vote anchors people to the majority. Vote first, then see the field.
- **No third-party "free counter" APIs.** They die, they get spammed, and
  they'd leak the poll to an external service. The real endpoint belongs to
  the backend agents.

## For the backend team

`src/services/poll.js` documents the expected API:
`GET  /api/poll/:matchId` → `{ counts: {NOR, DRW, ENG}, closesAt }`
`POST /api/poll/:matchId` body `{ pick }` → same shape, deduped server-side.
Swap the two functions marked `// TODO(backend)` and delete the seed.
