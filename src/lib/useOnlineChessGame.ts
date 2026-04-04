import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, Square } from "chess.js";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ErrorCode,
  JoinedEvent,
  ServerToClientEvents,
  Side,
  StateDeltaEvent,
  StateSnapshotEvent,
} from "../../shared/ws-protocol";
import {
  BOARD_STYLES,
  type CapturedPieces,
  type GameStatus,
  type PendingMove,
  type SquareStyles,
  calculateCapturedPieces,
  isPromotion,
} from "./chess";

type OnlineRole = "player" | "spectator";

type UseOnlineChessGameOptions = {
  roomId: string;
  role: OnlineRole;
  /** When the play namespace rejects join (room full), e.g. redirect to spectate. */
  onRoomFull?: () => void;
};

type NamespaceSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Per-tab storage so a second browser tab/window gets a new seat (not shared localStorage). */
function getStoredPlayerSessionToken(sessionKey: string): string | null {
  if (typeof window === "undefined") return null;
  let t = sessionStorage.getItem(sessionKey);
  if (!t) {
    t = localStorage.getItem(sessionKey);
    if (t) {
      sessionStorage.setItem(sessionKey, t);
      localStorage.removeItem(sessionKey);
    }
  }
  return t;
}

function setStoredPlayerSessionToken(sessionKey: string, token: string) {
  sessionStorage.setItem(sessionKey, token);
  localStorage.removeItem(sessionKey);
}

function clearStoredPlayerSessionToken(sessionKey: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(sessionKey);
  localStorage.removeItem(sessionKey);
}

const getGameStatusFromFen = (fen: string): GameStatus => {
  const game = new Chess(fen);
  const turnColor = game.turn() === "w" ? "White" : "Black";
  const inCheck = game.inCheck();
  const isGameOver = game.isGameOver();

  let status: string;
  let outcome: GameStatus["outcome"] = null;
  let winner: GameStatus["winner"] = null;

  if (isGameOver) {
    if (game.isCheckmate()) {
      outcome = "checkmate";
      winner = game.turn() === "w" ? "black" : "white";
      status = `Checkmate — ${winner === "white" ? "White" : "Black"} wins`;
    } else if (game.isStalemate()) {
      outcome = "stalemate";
      status = "Stalemate — draw";
    } else if (game.isDraw()) {
      outcome = "draw";
      status = "Draw";
    } else {
      status = "Game over";
    }
  } else if (inCheck) {
    status = `${turnColor} is in check`;
  } else {
    status = `${turnColor} to move`;
  }

  return { status, turnColor, inCheck, isGameOver, outcome, winner };
};

export const useOnlineChessGame = ({
  roomId,
  role,
  onRoomFull,
}: UseOnlineChessGameOptions) => {
  const namespace = role === "player" ? "/play" : "/watch";
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4001";
  const sessionKey = `chess:session:${roomId}:${namespace}`;
  const socketRef = useRef<NamespaceSocket | null>(null);

  const [connected, setConnected] = useState(false);
  /** Set when Socket.IO cannot connect (e.g. game server not running). */
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mySide, setMySide] = useState<Side | null>(null);
  const [seq, setSeq] = useState(0);
  const [fen, setFen] = useState(new Chess().fen());
  const [lastError, setLastError] = useState("");
  const [idleSnark, setIdleSnark] = useState<string | null>(null);
  const [idleSnarkTick, setIdleSnarkTick] = useState<number | null>(null);
  const [moveFrom, setMoveFrom] = useState("");
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({
    white: [],
    black: [],
  });
  const [clocks, setClocks] = useState({
    whiteMs: 20 * 60 * 1000,
    blackMs: 20 * 60 * 1000,
    updatedAt: Date.now(),
    running: false,
  });
  const [nowMs, setNowMs] = useState(Date.now());

  const game = useMemo(() => new Chess(fen), [fen]);
  const seqRef = useRef(0);
  /** Keeps socket handlers in sync with assigned seat (avoids stale closure on snark_event). */
  const mySideRef = useRef<Side | null>(null);
  const gameStatus = useMemo(() => getGameStatusFromFen(fen), [fen]);

  useEffect(() => {
    mySideRef.current = mySide;
  }, [mySide]);
  const currentTurn = game.turn() as Side;
  const isMyTurn = mySide !== null && currentTurn === mySide;
  /** Server-driven; false while waiting for the second player (timers frozen). */
  const clockRunning = clocks.running !== false;

  useEffect(() => {
    setCapturedPieces(calculateCapturedPieces(fen));
  }, [fen]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const applyServerState = useCallback(
    (payload: StateSnapshotEvent | StateDeltaEvent) => {
      setFen(payload.fen);
      setSeq(payload.seq);
      seqRef.current = payload.seq;
      setClocks(payload.clocks);
      setLastError("");
    },
    []
  );

  useEffect(() => {
    const socket = io(`${wsUrl}${namespace}`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    }) as NamespaceSocket;
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setConnectionError(null);
      // Read fresh on every connect/reconnect (reconnect after `joined` must see the stored token).
      // Do not emit both resume_room and join_room: both handlers are async and can interleave,
      // so join_room could run before the room fully reflects the session and mis-assign a seat.
      const token =
        role === "player" ? getStoredPlayerSessionToken(sessionKey) : null;
      if (role === "spectator") {
        socket.emit("join_room", { roomId, role: "spectator" });
        return;
      }
      if (token) {
        socket.emit("resume_room", {
          roomId,
          sessionToken: token,
          lastSeq: seqRef.current,
        });
        return;
      }
      socket.emit("join_room", {
        roomId,
        role: "player",
        sessionToken: undefined,
      });
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (err) => {
      setConnected(false);
      setConnectionError(
        `Cannot connect to game server at ${wsUrl}. In another terminal run: npm run dev:ws (${err.message})`
      );
    });
    socket.on("joined", (payload: JoinedEvent) => {
      setMySide(payload.side);
      applyServerState(payload.state);
      if (role === "player" && payload.sessionToken && typeof window !== "undefined") {
        setStoredPlayerSessionToken(sessionKey, payload.sessionToken);
      }
    });

    socket.on("state_snapshot", (payload) => applyServerState(payload));
    socket.on("state_delta", (payload) => applyServerState(payload));
    socket.on("snark_event", (payload) => {
      // Players only see snark for their own same-square fidget, not the opponent's.
      if (
        role === "player" &&
        mySideRef.current !== null &&
        payload.actorSide !== mySideRef.current
      ) {
        return;
      }
      setIdleSnark(payload.text);
      setIdleSnarkTick((prev) => (prev === null ? 1 : prev + 1));
    });
    socket.on("error", (payload: { code: ErrorCode; message: string }) => {
      if (payload.code === "ERR_SESSION_EXPIRED" && role === "player") {
        clearStoredPlayerSessionToken(sessionKey);
        setLastError("");
        socket.emit("join_room", {
          roomId,
          role: "player",
          sessionToken: undefined,
        });
        return;
      }
      setLastError(payload.message);
      if (payload.code === "ERR_ROOM_FULL") {
        onRoomFull?.();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [applyServerState, namespace, onRoomFull, role, roomId, sessionKey, wsUrl]);

  const sendMove = useCallback(
    (move: { from: string; to: string; promotion?: "q" | "r" | "b" | "n" }) => {
      if (!socketRef.current) return;
      socketRef.current.emit("submit_move", {
        roomId,
        clientSeq: seq,
        move,
      });
      setPendingMove(null);
      setShowPromotionDialog(false);
      setMoveFrom("");
      setIdleSnark(null);
      setIdleSnarkTick(null);
    },
    [roomId, seq]
  );

  const onDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }): boolean => {
      if (role !== "player" || !targetSquare) {
        setMoveFrom("");
        return false;
      }

      if (!clockRunning && !gameStatus.isGameOver) {
        setLastError("Waiting for your opponent to connect…");
        setMoveFrom("");
        return false;
      }

      const piece = game.get(sourceSquare as Square);
      if (!piece || !mySide || piece.color !== mySide) {
        setLastError("You can only move your own pieces");
        setMoveFrom("");
        return false;
      }

      if (sourceSquare === targetSquare) {
        socketRef.current?.emit("fidget_same_square", {
          roomId,
          square: sourceSquare,
          clientSeq: seq,
        });
        setMoveFrom("");
        return true;
      }

      if (!isMyTurn) {
        setLastError("It's not your turn");
        setMoveFrom("");
        return false;
      }

      const move = { from: sourceSquare, to: targetSquare };
      if (isPromotion(move, fen)) {
        setPendingMove(move);
        setShowPromotionDialog(true);
        return false;
      }
      sendMove(move);
      return true;
    },
    [
      clockRunning,
      fen,
      game,
      gameStatus.isGameOver,
      isMyTurn,
      mySide,
      role,
      roomId,
      sendMove,
      seq,
    ]
  );

  const onPieceDragBegin = useCallback(
    ({ square }: { square: string | null }) => {
      if (role !== "player" || !square || !mySide) return false;
      if (!clockRunning && !gameStatus.isGameOver) return false;
      const piece = game.get(square as Square);
      if (!piece || piece.color !== mySide) return false;

      if (piece.color === game.turn()) {
        setMoveFrom(square);
      } else {
        setMoveFrom("");
      }
      return true;
    },
    [clockRunning, game, gameStatus.isGameOver, mySide, role]
  );

  const onSquareClick = useCallback(
    ({ square }: { square: string }) => {
      if (role !== "player" || !mySide) return;
      if (!clockRunning && !gameStatus.isGameOver) return;
      const clickedPiece = game.get(square as Square);

      if (!moveFrom) {
        if (clickedPiece && clickedPiece.color === mySide && isMyTurn) {
          setMoveFrom(square);
        } else if (clickedPiece && clickedPiece.color === mySide && !isMyTurn) {
          socketRef.current?.emit("fidget_same_square", {
            roomId,
            square,
            clientSeq: seq,
          });
        }
        return;
      }

      if (moveFrom === square) {
        setMoveFrom("");
        return;
      }

      const sourcePiece = game.get(moveFrom as Square);
      if (!sourcePiece || sourcePiece.color !== mySide || !isMyTurn) {
        setMoveFrom("");
        return;
      }

      if (clickedPiece && clickedPiece.color === mySide) {
        setMoveFrom(square);
        return;
      }

      const move = { from: moveFrom, to: square };
      if (isPromotion(move, fen)) {
        setPendingMove(move);
        setShowPromotionDialog(true);
        return;
      }
      sendMove(move);
    },
    [
      clockRunning,
      fen,
      game,
      gameStatus.isGameOver,
      isMyTurn,
      moveFrom,
      mySide,
      role,
      roomId,
      sendMove,
      seq,
    ]
  );

  const handlePromotion = useCallback(
    (promotionPiece: "q" | "r" | "b" | "n") => {
      if (!pendingMove) return;
      sendMove({
        from: pendingMove.from,
        to: pendingMove.to,
        promotion: promotionPiece,
      });
    },
    [pendingMove, sendMove]
  );

  const cancelPromotion = useCallback(() => {
    setPendingMove(null);
    setShowPromotionDialog(false);
  }, []);

  const customSquareStyles = useMemo((): SquareStyles => {
    const styles: SquareStyles = {};
    if (!moveFrom || !isMyTurn) return styles;

    const moves = game.moves({
      square: moveFrom as Square,
      verbose: true,
    });
    moves.forEach((move) => {
      styles[move.to] = BOARD_STYLES.POSSIBLE_MOVE;
    });
    styles[moveFrom] = BOARD_STYLES.SELECTED_SQUARE;
    return styles;
  }, [game, isMyTurn, moveFrom]);

  const derivedClocks = useMemo(() => {
    const now = nowMs;
    if (gameStatus.isGameOver) {
      return clocks;
    }
    if (clocks.running === false) {
      return clocks;
    }
    const elapsed = Math.max(0, now - clocks.updatedAt);
    if (currentTurn === "w") {
      return { ...clocks, whiteMs: Math.max(0, clocks.whiteMs - elapsed) };
    }
    return { ...clocks, blackMs: Math.max(0, clocks.blackMs - elapsed) };
  }, [clocks, currentTurn, gameStatus.isGameOver, nowMs]);

  return {
    connected,
    connectionError,
    roomId,
    role,
    mySide,
    isMyTurn,
    clockRunning,
    seq,
    fen,
    gameStatus,
    lastError,
    idleSnark,
    idleSnarkTick,
    capturedPieces,
    customSquareStyles,
    whiteTime: Math.floor(derivedClocks.whiteMs / 1000),
    blackTime: Math.floor(derivedClocks.blackMs / 1000),
    showPromotionDialog,
    onDrop,
    onSquareClick,
    handlePromotion,
    cancelPromotion,
    onPieceDragBegin,
  };
};
