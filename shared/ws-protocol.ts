import { z } from "zod";

export const SIDE_SCHEMA = z.enum(["w", "b"]);
export type Side = z.infer<typeof SIDE_SCHEMA>;

export const GAME_STATUS_SCHEMA = z.enum(["active", "checkmate", "draw", "stalemate"]);
export type GameStatusCode = z.infer<typeof GAME_STATUS_SCHEMA>;

export const ERROR_CODE_SCHEMA = z.enum([
  "ERR_NOT_YOUR_TURN",
  "ERR_ILLEGAL_MOVE",
  "ERR_ROOM_FULL",
  "ERR_WAITING_FOR_OPPONENT",
  "ERR_SESSION_EXPIRED",
  "ERR_SEQ_GAP",
  "ERR_BAD_PAYLOAD",
  "ERR_ROOM_NOT_FOUND",
  "ERR_UNAUTHORIZED",
  "ERR_RATE_LIMITED",
]);
export type ErrorCode = z.infer<typeof ERROR_CODE_SCHEMA>;

export const MOVE_INPUT_SCHEMA = z.object({
  from: z.string().length(2),
  to: z.string().length(2),
  promotion: z.enum(["q", "r", "b", "n"]).optional(),
});
export type MoveInput = z.infer<typeof MOVE_INPUT_SCHEMA>;

export const CLOCKS_SCHEMA = z.object({
  whiteMs: z.number().int().nonnegative(),
  blackMs: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  /** When false, clocks do not count down until both seats are filled (server + client). */
  running: z.boolean().default(true),
});
export type ClocksPayload = z.infer<typeof CLOCKS_SCHEMA>;

export const ROOM_STATE_SCHEMA = z.object({
  roomId: z.string().min(3).max(64),
  fen: z.string().min(1),
  seq: z.number().int().nonnegative(),
  status: GAME_STATUS_SCHEMA,
  winner: SIDE_SCHEMA.nullable(),
  turn: SIDE_SCHEMA,
  clocks: CLOCKS_SCHEMA,
});
export type RoomStatePayload = z.infer<typeof ROOM_STATE_SCHEMA>;

export const JOIN_ROOM_INPUT_SCHEMA = z.object({
  roomId: z.string().min(3).max(64),
  sessionToken: z.string().min(8).max(256).optional(),
  role: z.enum(["player", "spectator"]).default("player"),
});
export type JoinRoomInput = z.infer<typeof JOIN_ROOM_INPUT_SCHEMA>;

export const RESUME_ROOM_INPUT_SCHEMA = z.object({
  roomId: z.string().min(3).max(64),
  sessionToken: z.string().min(8).max(256),
  lastSeq: z.number().int().nonnegative(),
});
export type ResumeRoomInput = z.infer<typeof RESUME_ROOM_INPUT_SCHEMA>;

export const SUBMIT_MOVE_INPUT_SCHEMA = z.object({
  roomId: z.string().min(3).max(64),
  clientSeq: z.number().int().nonnegative(),
  move: MOVE_INPUT_SCHEMA,
});
export type SubmitMoveInput = z.infer<typeof SUBMIT_MOVE_INPUT_SCHEMA>;

export const FIDGET_SAME_SQUARE_INPUT_SCHEMA = z.object({
  roomId: z.string().min(3).max(64),
  square: z.string().length(2),
  clientSeq: z.number().int().nonnegative(),
});
export type FidgetSameSquareInput = z.infer<typeof FIDGET_SAME_SQUARE_INPUT_SCHEMA>;

export const JOINED_EVENT_SCHEMA = z.object({
  roomId: z.string(),
  side: SIDE_SCHEMA.nullable(),
  role: z.enum(["player", "spectator"]),
  sessionToken: z.string().nullable(),
  state: ROOM_STATE_SCHEMA,
});
export type JoinedEvent = z.infer<typeof JOINED_EVENT_SCHEMA>;

export const STATE_DELTA_EVENT_SCHEMA = z.object({
  roomId: z.string(),
  seq: z.number().int().nonnegative(),
  fen: z.string(),
  status: GAME_STATUS_SCHEMA,
  winner: SIDE_SCHEMA.nullable(),
  turn: SIDE_SCHEMA,
  moveUci: z.string().nullable(),
  moveSan: z.string().nullable(),
  clocks: CLOCKS_SCHEMA,
});
export type StateDeltaEvent = z.infer<typeof STATE_DELTA_EVENT_SCHEMA>;

export const STATE_SNAPSHOT_EVENT_SCHEMA = z.object({
  roomId: z.string(),
  seq: z.number().int().nonnegative(),
  fen: z.string(),
  status: GAME_STATUS_SCHEMA,
  winner: SIDE_SCHEMA.nullable(),
  turn: SIDE_SCHEMA,
  clocks: CLOCKS_SCHEMA,
});
export type StateSnapshotEvent = z.infer<typeof STATE_SNAPSHOT_EVENT_SCHEMA>;

export const SNARK_EVENT_SCHEMA = z.object({
  roomId: z.string(),
  seq: z.number().int().nonnegative(),
  kind: z.enum(["on_turn_cancel", "off_turn_fidget"]),
  text: z.string(),
  actorSide: SIDE_SCHEMA,
});
export type SnarkEvent = z.infer<typeof SNARK_EVENT_SCHEMA>;

export const ERROR_EVENT_SCHEMA = z.object({
  code: ERROR_CODE_SCHEMA,
  message: z.string(),
  retryable: z.boolean().default(false),
});
export type ErrorEvent = z.infer<typeof ERROR_EVENT_SCHEMA>;

export type ServerToClientEvents = {
  joined: (payload: JoinedEvent) => void;
  state_delta: (payload: StateDeltaEvent) => void;
  state_snapshot: (payload: StateSnapshotEvent) => void;
  snark_event: (payload: SnarkEvent) => void;
  error: (payload: ErrorEvent) => void;
  pong: (payload: { t: number }) => void;
};

export type ClientToServerEvents = {
  join_room: (payload: JoinRoomInput) => void;
  resume_room: (payload: ResumeRoomInput) => void;
  submit_move: (payload: SubmitMoveInput) => void;
  fidget_same_square: (payload: FidgetSameSquareInput) => void;
  ping: (payload: { t: number }) => void;
};
