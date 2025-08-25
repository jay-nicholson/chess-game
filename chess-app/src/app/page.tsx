"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

type Move = { from: string; to: string; promotion?: "q" | "r" | "b" | "n" };

export default function Home() {
  // Keep chess state in a ref-like pattern by re-instantiating from FEN
  const [fen, setFen] = useState<string>(new Chess().fen());
  const [lastError, setLastError] = useState<string>("");
  const [moveFrom, setMoveFrom] = useState<string>("");
  const [moveTo, setMoveTo] = useState<string>("");
  const [showPromotionDialog, setShowPromotionDialog] =
    useState<boolean>(false);
  const [pendingMove, setPendingMove] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [capturedPieces, setCapturedPieces] = useState<{
    white: string[];
    black: string[];
  }>({ white: [], black: [] });

  // Piece values for point calculation
  const pieceValues = {
    p: 1, // pawn
    n: 3, // knight
    b: 3, // bishop
    r: 5, // rook
    q: 9, // queen
    k: 0, // king (invaluable)
  };

  // Unicode symbols for pieces
  const pieceSymbols = {
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

  // Calculate captured pieces from FEN comparison
  const calculateCapturedPieces = useCallback((currentFen: string) => {
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
  }, []);

  const getAllPieces = (game: Chess) => {
    const pieces: Array<{ type: string; color: "w" | "b" }> = [];
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

  // Update captured pieces when FEN changes
  useEffect(() => {
    setCapturedPieces(calculateCapturedPieces(fen));
  }, [fen, calculateCapturedPieces]);

  // Check if a move is a pawn promotion
  const isPromotion = useCallback(
    (move: { from: string; to: string }) => {
      const game = new Chess(fen);
      const piece = game.get(move.from as any);
      if (!piece || piece.type !== "p") return false;

      const fromRank = parseInt(move.from[1]);
      const toRank = parseInt(move.to[1]);

      return (
        (piece.color === "w" && fromRank === 7 && toRank === 8) ||
        (piece.color === "b" && fromRank === 2 && toRank === 1)
      );
    },
    [fen]
  );

  const makeMove = useCallback(
    (move: Move) => {
      setLastError("");
      // Create a new game instance for this move attempt
      const game = new Chess(fen);

      try {
        // Check if this is a promotion move and no promotion piece is specified
        if (isPromotion(move) && !move.promotion) {
          setPendingMove({ from: move.from, to: move.to });
          setShowPromotionDialog(true);
          return false; // Don't make the move yet, wait for promotion choice
        }

        const result = game.move({
          ...move,
          promotion: move.promotion ?? ("q" as const),
        });
        if (result) {
          setFen(game.fen());
          return true;
        } else {
          // Provide more specific error messages
          const piece = game.get(move.from as any);
          const targetPiece = game.get(move.to as any);

          if (!piece) {
            setLastError(`No piece on ${move.from.toUpperCase()}`);
          } else if (piece.color !== game.turn()) {
            setLastError(
              `It's ${game.turn() === "w" ? "White" : "Black"}'s turn`
            );
          } else if (targetPiece && targetPiece.color === piece.color) {
            setLastError(
              `Cannot capture your own piece on ${move.to.toUpperCase()}`
            );
          } else {
            // Check if it's a valid move pattern for this piece type
            const moves = game.moves({
              square: move.from as any,
              verbose: true,
            });
            const validDestinations = moves.map((m: any) => m.to);

            if (!validDestinations.includes(move.to)) {
              const pieceName =
                piece.type === "n"
                  ? "knight"
                  : piece.type === "b"
                  ? "bishop"
                  : piece.type === "r"
                  ? "rook"
                  : piece.type === "q"
                  ? "queen"
                  : piece.type === "k"
                  ? "king"
                  : "pawn";
              setLastError(
                `${
                  pieceName.charAt(0).toUpperCase() + pieceName.slice(1)
                } cannot move to ${move.to.toUpperCase()}`
              );
            } else {
              setLastError(
                `Invalid move: ${move.from.toUpperCase()} to ${move.to.toUpperCase()}`
              );
            }
          }
          return false;
        }
      } catch (error) {
        setLastError(
          `Invalid move format: ${move.from.toUpperCase()} to ${move.to.toUpperCase()}`
        );
        return false;
      }
    },
    [fen, isPromotion]
  );

  const handlePromotion = useCallback(
    (promotionPiece: "q" | "r" | "b" | "n") => {
      if (pendingMove) {
        const success = makeMove({
          from: pendingMove.from,
          to: pendingMove.to,
          promotion: promotionPiece,
        });

        if (success) {
          setMoveFrom("");
          setMoveTo("");
        }
      }

      setShowPromotionDialog(false);
      setPendingMove(null);
    },
    [pendingMove, makeMove]
  );

  const cancelPromotion = useCallback(() => {
    setShowPromotionDialog(false);
    setPendingMove(null);
  }, []);

  const onDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (!targetSquare) return false;
      const moveResult = makeMove({ from: sourceSquare, to: targetSquare });
      setMoveFrom("");
      setMoveTo("");
      return moveResult;
    },
    [makeMove]
  );

  const onSquareClick = useCallback(
    ({ square }: { square: string }) => {
      const game = new Chess(fen);
      const clickedPiece = game.get(square as any);

      // If no piece is selected
      if (!moveFrom) {
        // Only allow selecting pieces of the current player's turn
        if (clickedPiece && clickedPiece.color === game.turn()) {
          setMoveFrom(square);
        } else if (clickedPiece && clickedPiece.color !== game.turn()) {
          setLastError(
            `It's ${game.turn() === "w" ? "White" : "Black"}'s turn`
          );
        }
        return;
      }

      // If clicking the same square, deselect
      if (moveFrom === square) {
        setMoveFrom("");
        return;
      }

      // If clicking on another piece of the same color, switch selection
      if (clickedPiece && clickedPiece.color === game.turn()) {
        setMoveFrom(square);
        return;
      }

      // If clicking on opponent's piece or empty square, try to make the move
      const moveResult = makeMove({ from: moveFrom, to: square });
      setMoveFrom("");
      setMoveTo("");
    },
    [fen, moveFrom, makeMove]
  );

  // Create game instance for status checks
  const game = useMemo(() => new Chess(fen), [fen]);
  const turnColor = game.turn() === "w" ? "White" : "Black";
  const inCheck = game.inCheck();
  const isGameOver = game.isGameOver();
  const status = isGameOver
    ? game.isCheckmate()
      ? `Checkmate! ${turnColor === "White" ? "Black" : "White"} wins`
      : game.isDraw()
      ? "Draw"
      : "Game over"
    : inCheck
    ? `${turnColor} is in check`
    : `${turnColor} to move`;

  const reset = () => {
    const fresh = new Chess();
    setFen(fresh.fen());
    setLastError("");
    setMoveFrom("");
    setMoveTo("");
    setShowPromotionDialog(false);
    setPendingMove(null);
    setCapturedPieces({ white: [], black: [] });
  };

  // Get possible moves for highlighting
  const getPossibleMoves = useCallback(() => {
    if (!moveFrom) return {};
    const game = new Chess(fen);
    const moves = game.moves({ square: moveFrom as any, verbose: true });
    const possibleMoves: { [square: string]: { backgroundColor: string } } = {};
    moves.forEach((move: any) => {
      possibleMoves[move.to] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
    });
    return possibleMoves;
  }, [fen, moveFrom]);

  // Combine all custom square styles
  const customSquareStyles = useMemo(() => {
    const styles: { [square: string]: { backgroundColor: string } } = {};

    // Add possible moves
    Object.assign(styles, getPossibleMoves());

    // Add selected square
    if (moveFrom) {
      styles[moveFrom] = { backgroundColor: "rgba(255, 255, 0, 0.8)" };
    }

    return styles;
  }, [getPossibleMoves, moveFrom]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: 16,
        display: "grid",
        placeItems: "center",
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
        <h1 style={{ margin: 0 }}>Chess MVP</h1>
        {/* Captured by White (Black pieces captured) */}
        <div
          style={{
            minHeight: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            flexWrap: "wrap",
            maxWidth: "360px",
            padding: "8px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "6px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              color: "#e2e8f0",
              marginRight: "8px",
            }}
          >
            White: +
            {capturedPieces.white.reduce(
              (sum, piece) =>
                sum + pieceValues[piece as keyof typeof pieceValues],
              0
            )}
          </div>
          {capturedPieces.white.map((piece, index) => (
            <span key={index} style={{ fontSize: "16px" }}>
              {pieceSymbols[("b" + piece) as keyof typeof pieceSymbols]}
            </span>
          ))}
        </div>

        <div style={{ width: 360 }}>
          <Chessboard
            options={{
              position: fen,
              onPieceDrop: onDrop,
              onSquareClick: onSquareClick,

              animationDurationInMs: 200,
              darkSquareStyle: { backgroundColor: "#769656" },
              lightSquareStyle: { backgroundColor: "#eeeed2" },
              squareStyles: customSquareStyles,
              showNotation: true,

              boardStyle: {
                borderRadius: "4px",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
              },
            }}
          />
        </div>

        {/* Captured by Black (White pieces captured) */}
        <div
          style={{
            minHeight: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            flexWrap: "wrap",
            maxWidth: "360px",
            padding: "8px",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            borderRadius: "6px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              color: "#e2e8f0",
              marginRight: "8px",
            }}
          >
            Black: +
            {capturedPieces.black.reduce(
              (sum, piece) =>
                sum + pieceValues[piece as keyof typeof pieceValues],
              0
            )}
          </div>
          {capturedPieces.black.map((piece, index) => (
            <span key={index} style={{ fontSize: "16px" }}>
              {pieceSymbols[("w" + piece) as keyof typeof pieceSymbols]}
            </span>
          ))}
        </div>

        <div style={{ fontSize: 14, textAlign: "center" }}>
          <div style={{ marginBottom: 4 }}>
            <strong>Status:</strong> {status}
          </div>
          {lastError ? (
            <div
              style={{
                color: "#f87171",
                backgroundColor: "rgba(248, 113, 113, 0.1)",
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid rgba(248, 113, 113, 0.3)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              ⚠️ {lastError}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={reset}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#e2e8f0",
              cursor: "pointer",
            }}
          >
            New Game
          </button>
        </div>

        <div
          style={{
            opacity: 0.8,
            fontSize: 12,
            textAlign: "center",
            maxWidth: 360,
          }}
        >
          <p style={{ margin: "8px 0" }}>
            <strong>How to play:</strong>
          </p>
          <ul style={{ textAlign: "left", margin: 0, paddingLeft: 16 }}>
            <li>Drag pieces or click to select and move</li>
            <li>Yellow highlights show legal moves</li>
            <li>Only select pieces on your turn</li>
            <li>Choose promotion piece when reaching the end</li>
            <li>Track captured pieces and material advantage</li>
          </ul>
        </div>

        {/* Promotion Dialog */}
        {showPromotionDialog && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={cancelPromotion}
          >
            <div
              style={{
                backgroundColor: "#1e293b",
                padding: "24px",
                borderRadius: "12px",
                border: "1px solid #334155",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                textAlign: "center",
                minWidth: "320px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: "0 0 16px 0", color: "#e2e8f0" }}>
                Choose Promotion Piece
              </h3>
              <p
                style={{ margin: "0 0 20px 0", color: "#94a3b8", fontSize: 14 }}
              >
                Select which piece you want to promote your pawn to:
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                }}
              >
                {[
                  { piece: "q", name: "Queen", symbol: "♕" },
                  { piece: "r", name: "Rook", symbol: "♖" },
                  { piece: "b", name: "Bishop", symbol: "♗" },
                  { piece: "n", name: "Knight", symbol: "♘" },
                ].map(({ piece, name, symbol }) => (
                  <button
                    key={piece}
                    onClick={() =>
                      handlePromotion(piece as "q" | "r" | "b" | "n")
                    }
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #475569",
                      backgroundColor: "#334155",
                      color: "#e2e8f0",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      minWidth: "60px",
                      fontSize: "24px",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#475569";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#334155";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <span>{symbol}</span>
                    <span style={{ fontSize: "10px", fontWeight: "500" }}>
                      {name}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={cancelPromotion}
                style={{
                  marginTop: "16px",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #475569",
                  backgroundColor: "transparent",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
