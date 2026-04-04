# WebSocket Protocol v1

Transport: Socket.IO over `wss` in production.

Namespaces:

- `/play` - authenticated player sockets
- `/watch` - read-only spectator sockets

## Client -> Server

- `join_room`
  - `{ roomId, role, sessionToken? }`
- `resume_room`
  - `{ roomId, sessionToken, lastSeq }`
- `submit_move`
  - `{ roomId, clientSeq, move: { from, to, promotion? } }`
- `fidget_same_square`
  - `{ roomId, square, clientSeq }`
- `ping`
  - `{ t }`

## Server -> Client

- `joined`
  - `{ roomId, side, role, sessionToken, state }`
- `state_snapshot`
  - `{ roomId, seq, fen, status, winner, turn, clocks }`
- `state_delta`
  - `{ roomId, seq, fen, status, winner, turn, moveUci?, moveSan?, clocks }`
- `snark_event`
  - `{ roomId, seq, kind, text, actorSide }`
- `error`
  - `{ code, message, retryable }`
- `pong`
  - `{ t }`

## Ordering and replay

- `seq` is authoritative and monotonic per room for move state updates.
- Clients submit `clientSeq`; if stale, server returns `ERR_SEQ_GAP` and a fresh snapshot.
- On reconnect, client sends `resume_room` and applies the latest snapshot.

## Standard error codes

- `ERR_NOT_YOUR_TURN`
- `ERR_ILLEGAL_MOVE`
- `ERR_ROOM_FULL`
- `ERR_SESSION_EXPIRED`
- `ERR_SEQ_GAP`
- `ERR_BAD_PAYLOAD`
- `ERR_ROOM_NOT_FOUND`
- `ERR_UNAUTHORIZED`
- `ERR_RATE_LIMITED`
