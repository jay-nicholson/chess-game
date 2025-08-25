import { Chess } from "chess.js";

// ===== TYPES =====
export type Move = {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
};

export type PieceColor = "w" | "b";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export type Piece = {
  type: PieceType;
  color: PieceColor;
};

export type CapturedPieces = {
  white: string[];
  black: string[];
};

export type PendingMove = {
  from: string;
  to: string;
};

export type SquareStyle = {
  backgroundColor: string;
};

export type SquareStyles = {
  [square: string]: SquareStyle;
};

export type PieceValues = {
  [key in PieceType]: number;
};

export type PieceSymbols = {
  [key: string]: string;
};

export type GameStatus = {
  status: string;
  turnColor: string;
  inCheck: boolean;
  isGameOver: boolean;
};

// ===== CONSTANTS =====

// Piece values for point calculation
export const PIECE_VALUES: PieceValues = {
  p: 1, // pawn
  n: 3, // knight
  b: 3, // bishop
  r: 5, // rook
  q: 9, // queen
  k: 0, // king (invaluable)
};

// Unicode symbols for pieces
export const PIECE_SYMBOLS: PieceSymbols = {
  wp: "♟",
  wn: "♞",
  wb: "♝",
  wr: "♜",
  wq: "♛",
  wk: "♚",
  bp: "♙",
  bn: "♘",
  bb: "♗",
  br: "♖",
  bq: "♕",
  bk: "♔",
};

// Board styling constants
export const BOARD_STYLES = {
  DARK_SQUARE: { backgroundColor: "var(--board-dark-square)" },
  LIGHT_SQUARE: { backgroundColor: "var(--board-light-square)" },
  SELECTED_SQUARE: { backgroundColor: "var(--board-selected-square)" },
  POSSIBLE_MOVE: { backgroundColor: "var(--board-possible-move)" },
  ANIMATION_DURATION: 200,
};

// Promotion pieces configuration
export const PROMOTION_PIECES = [
  { piece: "q" as const, name: "Queen", symbol: "♕" },
  { piece: "r" as const, name: "Rook", symbol: "♖" },
  { piece: "b" as const, name: "Bishop", symbol: "♗" },
  { piece: "n" as const, name: "Knight", symbol: "♘" },
];

// ===== UTILITY FUNCTIONS =====

/**
 * Get all pieces from a chess game instance
 */
export const getAllPieces = (game: Chess): Piece[] => {
  const pieces: Piece[] = [];
  for (let rank = 1; rank <= 8; rank++) {
    for (
      let file = "a";
      file <= "h";
      file = String.fromCharCode(file.charCodeAt(0) + 1)
    ) {
      const square = file + rank;
      const piece = game.get(square as any);
      if (piece) {
        pieces.push(piece);
      }
    }
  }
  return pieces;
};

/**
 * Calculate captured pieces by comparing current position with starting position
 */
export const calculateCapturedPieces = (currentFen: string): CapturedPieces => {
  const startingPosition = new Chess();
  const currentPosition = new Chess(currentFen);

  const startingPieces = getAllPieces(startingPosition);
  const currentPieces = getAllPieces(currentPosition);

  const captured = { white: [] as string[], black: [] as string[] };

  // Count pieces in starting position
  const startingCount: { [key: string]: number } = {};
  startingPieces.forEach((piece) => {
    const key = piece.color + piece.type;
    startingCount[key] = (startingCount[key] || 0) + 1;
  });

  // Count pieces in current position
  const currentCount: { [key: string]: number } = {};
  currentPieces.forEach((piece) => {
    const key = piece.color + piece.type;
    currentCount[key] = (currentCount[key] || 0) + 1;
  });

  // Find captured pieces
  Object.keys(startingCount).forEach((key) => {
    const missing = startingCount[key] - (currentCount[key] || 0);
    for (let i = 0; i < missing; i++) {
      const color = key[0] as "w" | "b";
      const type = key[1];
      if (color === "w") {
        captured.black.push(type); // White piece captured by black
      } else {
        captured.white.push(type); // Black piece captured by white
      }
    }
  });

  return captured;
};

/**
 * Check if a move is a pawn promotion
 */
export const isPromotion = (move: Move, fen: string): boolean => {
  const game = new Chess(fen);
  const piece = game.get(move.from as any);
  if (!piece || piece.type !== "p") return false;

  const fromRank = parseInt(move.from[1]);
  const toRank = parseInt(move.to[1]);

  return (
    (piece.color === "w" && fromRank === 7 && toRank === 8) ||
    (piece.color === "b" && fromRank === 2 && toRank === 1)
  );
};

/**
 * Calculate total points for captured pieces
 */
export const calculateCapturedPoints = (capturedPieces: string[]): number => {
  return capturedPieces.reduce(
    (sum, piece) => sum + PIECE_VALUES[piece as PieceType],
    0
  );
};

/**
 * Get piece name from piece type
 */
export const getPieceName = (pieceType: string): string => {
  switch (pieceType) {
    case "n":
      return "knight";
    case "b":
      return "bishop";
    case "r":
      return "rook";
    case "q":
      return "queen";
    case "k":
      return "king";
    case "p":
      return "pawn";
    default:
      return "piece";
  }
};

/**
 * Generate detailed error message for invalid moves
 */
export const generateMoveErrorMessage = (move: Move, game: Chess): string => {
  const piece = game.get(move.from as any);
  const targetPiece = game.get(move.to as any);

  if (!piece) {
    return `No piece on ${move.from.toUpperCase()}`;
  }

  if (piece.color !== game.turn()) {
    return `It's ${game.turn() === "w" ? "White" : "Black"}'s turn`;
  }

  if (targetPiece && targetPiece.color === piece.color) {
    return `Cannot capture your own piece on ${move.to.toUpperCase()}`;
  }

  // Check if it's a valid move pattern for this piece type
  const moves = game.moves({
    square: move.from as any,
    verbose: true,
  });
  const validDestinations = moves.map((m: any) => m.to);

  if (!validDestinations.includes(move.to)) {
    const pieceName = getPieceName(piece.type);
    return `${
      pieceName.charAt(0).toUpperCase() + pieceName.slice(1)
    } cannot move to ${move.to.toUpperCase()}`;
  }

  return `Invalid move: ${move.from.toUpperCase()} to ${move.to.toUpperCase()}`;
};
