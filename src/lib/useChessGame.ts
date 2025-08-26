import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Chess, Square } from "chess.js";
import {
  Move,
  CapturedPieces,
  PendingMove,
  SquareStyles,
  GameStatus,
  calculateCapturedPieces,
  isPromotion,
  generateMoveErrorMessage,
  BOARD_STYLES,
} from "./chess";

export const useChessGame = () => {
  // Game state
  const [fen, setFen] = useState<string>(new Chess().fen());
  const [lastError, setLastError] = useState<string>("");
  const [moveFrom, setMoveFrom] = useState<string>("");
  const [showPromotionDialog, setShowPromotionDialog] =
    useState<boolean>(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({
    white: [],
    black: [],
  });

  // Timer state
  const [timerMinutes, setTimerMinutes] = useState<number>(20); // Default 20 minutes
  const [whiteTime, setWhiteTime] = useState<number>(20 * 60); // in seconds
  const [blackTime, setBlackTime] = useState<number>(20 * 60); // in seconds
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Create game instance for status checks
  const game = useMemo(() => new Chess(fen), [fen]);

  // Game status
  const gameStatus: GameStatus = useMemo(() => {
    const turnColor = game.turn() === "w" ? "White" : "Black";
    const inCheck = game.inCheck();
    const isGameOver = game.isGameOver();

    let status: string;
    if (isGameOver) {
      if (game.isCheckmate()) {
        status = `Checkmate! ${turnColor === "White" ? "Black" : "White"} wins`;
      } else if (game.isDraw()) {
        status = "Draw";
      } else {
        status = "Game over";
      }
    } else if (inCheck) {
      status = `${turnColor} is in check`;
    } else {
      status = `${turnColor} to move`;
    }

    return { status, turnColor, inCheck, isGameOver };
  }, [game]);

  // Update captured pieces when FEN changes
  useEffect(() => {
    setCapturedPieces(calculateCapturedPieces(fen));
  }, [fen]);

  // Timer countdown effect
  useEffect(() => {
    if (!isTimerActive || gameStatus.isGameOver) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      const currentTurn = game.turn();

      if (currentTurn === "w") {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            // Handle time out - could set game over status
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            // Handle time out - could set game over status
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerActive, gameStatus.isGameOver, game]);

  // Start timer on first move
  useEffect(() => {
    const initialFen = new Chess().fen();
    if (fen !== initialFen && !isTimerActive && !gameStatus.isGameOver) {
      setIsTimerActive(true);
    }
  }, [fen, isTimerActive, gameStatus.isGameOver]);

  // Make a move
  const makeMove = useCallback(
    (move: Move): boolean => {
      setLastError("");
      const gameInstance = new Chess(fen);

      try {
        // Check if this is a promotion move and no promotion piece is specified
        if (isPromotion(move, fen) && !move.promotion) {
          setPendingMove({ from: move.from, to: move.to });
          setShowPromotionDialog(true);
          return false; // Don't make the move yet, wait for promotion choice
        }

        const result = gameInstance.move({
          ...move,
          promotion: move.promotion ?? ("q" as const),
        });

        if (result) {
          setFen(gameInstance.fen());
          return true;
        } else {
          setLastError(generateMoveErrorMessage(move, gameInstance));
          return false;
        }
      } catch {
        setLastError(
          `Invalid move format: ${move.from.toUpperCase()} to ${move.to.toUpperCase()}`
        );
        return false;
      }
    },
    [fen]
  );

  // Handle piece drop
  const onDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }): boolean => {
      if (!targetSquare) return false;

      // Validate turn before attempting the move
      const gameInstance = new Chess(fen);
      const piece = gameInstance.get(sourceSquare as Square);

      if (!piece) {
        setLastError(`No piece on ${sourceSquare.toUpperCase()}`);
        return false;
      }

      // Check if it's the piece owner's turn
      if (piece.color !== gameInstance.turn()) {
        setLastError(
          `It's ${gameInstance.turn() === "w" ? "White" : "Black"}'s turn`
        );
        return false;
      }

      const moveResult = makeMove({ from: sourceSquare, to: targetSquare });
      setMoveFrom("");
      return moveResult;
    },
    [makeMove, fen]
  );

  // Handle piece drag begin - show valid moves
  const onPieceDragBegin = useCallback(
    ({
      square,
    }: {
      isSparePiece: boolean;
      piece: unknown;
      square: string | null;
    }) => {
      if (!square) return false;

      const gameInstance = new Chess(fen);
      const pieceOnSquare = gameInstance.get(square as Square);

      if (!pieceOnSquare) return false;

      // Check if it's the piece owner's turn
      if (pieceOnSquare.color !== gameInstance.turn()) {
        // Don't allow highlighting or interaction with opponent's pieces
        return false;
      }

      // Set the source square to show valid moves
      setMoveFrom(square);
      return true;
    },
    [fen]
  );

  // Optimized square styles - calculate directly instead of separate function
  const customSquareStyles = useMemo((): SquareStyles => {
    const styles: SquareStyles = {};

    // Only calculate if there's a selected piece
    if (moveFrom) {
      const gameInstance = new Chess(fen);
      const moves = gameInstance.moves({
        square: moveFrom as Square,
        verbose: true,
      });

      // Add possible moves
      moves.forEach((move) => {
        styles[move.to] = BOARD_STYLES.POSSIBLE_MOVE;
      });

      // Add selected square
      styles[moveFrom] = BOARD_STYLES.SELECTED_SQUARE;
    }

    return styles;
  }, [fen, moveFrom]);

  // Handle square click
  const onSquareClick = useCallback(
    ({ square }: { square: string }) => {
      const gameInstance = new Chess(fen);
      const clickedPiece = gameInstance.get(square as Square);

      // If no piece is selected
      if (!moveFrom) {
        // Only allow selecting pieces of the current player's turn
        if (clickedPiece && clickedPiece.color === gameInstance.turn()) {
          setMoveFrom(square);
        } else if (clickedPiece) {
          // Show error when trying to select opponent's piece
          setLastError(
            `It's ${gameInstance.turn() === "w" ? "White" : "Black"}'s turn`
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
      if (clickedPiece && clickedPiece.color === gameInstance.turn()) {
        setMoveFrom(square);
        return;
      }

      // If clicking on opponent's piece or empty square, try to make the move
      makeMove({ from: moveFrom, to: square });
      setMoveFrom("");
    },
    [fen, moveFrom, makeMove]
  );

  // Handle promotion
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

  // Timer change handler
  const changeTimer = useCallback((minutes: number) => {
    setTimerMinutes(minutes);
    const seconds = minutes * 60;
    setWhiteTime(seconds);
    setBlackTime(seconds);
    setIsTimerActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    const fresh = new Chess();
    setFen(fresh.fen());
    setLastError("");
    setMoveFrom("");
    setShowPromotionDialog(false);
    setPendingMove(null);
    setCapturedPieces({ white: [], black: [] });

    // Reset timers
    const seconds = timerMinutes * 60;
    setWhiteTime(seconds);
    setBlackTime(seconds);
    setIsTimerActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [timerMinutes]);

  return {
    // Game state
    fen,
    gameStatus,
    lastError,
    capturedPieces,
    customSquareStyles,

    // Timer state
    whiteTime,
    blackTime,
    timerMinutes,
    isTimerActive,

    // Promotion dialog state
    showPromotionDialog,
    pendingMove,

    // Event handlers
    onDrop,
    onSquareClick,
    handlePromotion,
    cancelPromotion,
    resetGame,
    changeTimer,
    onPieceDragBegin,
  };
};
