import { useState, useCallback, useEffect, useMemo } from "react";
import { Chess } from "chess.js";
import { 
  Move, 
  CapturedPieces, 
  PendingMove, 
  SquareStyles, 
  GameStatus,
  calculateCapturedPieces, 
  isPromotion, 
  generateMoveErrorMessage,
  BOARD_STYLES
} from './chess';

export const useChessGame = () => {
  // Game state
  const [fen, setFen] = useState<string>(new Chess().fen());
  const [lastError, setLastError] = useState<string>("");
  const [moveFrom, setMoveFrom] = useState<string>("");
  const [showPromotionDialog, setShowPromotionDialog] = useState<boolean>(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({ 
    white: [], 
    black: [] 
  });

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
      } catch (error) {
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
      const piece = gameInstance.get(sourceSquare as any);

      if (!piece) {
        setLastError(`No piece on ${sourceSquare.toUpperCase()}`);
        return false;
      }

      if (piece.color !== gameInstance.turn()) {
        setLastError(`It's ${gameInstance.turn() === "w" ? "White" : "Black"}'s turn`);
        return false;
      }

      const moveResult = makeMove({ from: sourceSquare, to: targetSquare });
      setMoveFrom("");
      return moveResult;
    },
    [makeMove, fen]
  );

  // Handle square click
  const onSquareClick = useCallback(
    ({ square }: { square: string }) => {
      const gameInstance = new Chess(fen);
      const clickedPiece = gameInstance.get(square as any);

      // If no piece is selected
      if (!moveFrom) {
        // Only allow selecting pieces of the current player's turn
        if (clickedPiece && clickedPiece.color === gameInstance.turn()) {
          setMoveFrom(square);
        } else if (clickedPiece && clickedPiece.color !== gameInstance.turn()) {
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
      const moveResult = makeMove({ from: moveFrom, to: square });
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

  // Get possible moves for highlighting
  const getPossibleMoves = useCallback(() => {
    if (!moveFrom) return {};
    const gameInstance = new Chess(fen);
    const moves = gameInstance.moves({ square: moveFrom as any, verbose: true });
    const possibleMoves: SquareStyles = {};
    moves.forEach((move: any) => {
      possibleMoves[move.to] = BOARD_STYLES.POSSIBLE_MOVE;
    });
    return possibleMoves;
  }, [fen, moveFrom]);

  // Combine all custom square styles
  const customSquareStyles = useMemo((): SquareStyles => {
    const styles: SquareStyles = {};

    // Add possible moves
    Object.assign(styles, getPossibleMoves());

    // Add selected square
    if (moveFrom) {
      styles[moveFrom] = BOARD_STYLES.SELECTED_SQUARE;
    }

    return styles;
  }, [getPossibleMoves, moveFrom]);

  // Reset game
  const resetGame = useCallback(() => {
    const fresh = new Chess();
    setFen(fresh.fen());
    setLastError("");
    setMoveFrom("");
    setShowPromotionDialog(false);
    setPendingMove(null);
    setCapturedPieces({ white: [], black: [] });
  }, []);

  return {
    // Game state
    fen,
    gameStatus,
    lastError,
    capturedPieces,
    customSquareStyles,
    
    // Promotion dialog state
    showPromotionDialog,
    pendingMove,
    
    // Event handlers
    onDrop,
    onSquareClick,
    handlePromotion,
    cancelPromotion,
    resetGame,
  };
};
