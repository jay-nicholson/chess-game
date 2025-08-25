"use client";

import React from "react";
import { Chessboard } from "react-chessboard";
import { useChessGame } from "../lib/useChessGame";
import {
  CapturedPieces,
  PromotionDialog,
  GameStatus,
  GameControls,
} from "../components";
import { BOARD_STYLES } from "../lib/chess";

export default function Home() {
  const {
    fen,
    gameStatus,
    lastError,
    capturedPieces,
    customSquareStyles,
    showPromotionDialog,
    onDrop,
    onSquareClick,
    handlePromotion,
    cancelPromotion,
    resetGame,
  } = useChessGame();

  return (
    <main className="main-layout">
      <div className="game-container">
        <h1 style={{ margin: 0 }}>WeChess</h1>

        <CapturedPieces
          capturedPieces={capturedPieces.white}
          color="white"
          label="White"
        />

        <div className="board-wrapper">
          <Chessboard
            options={{
              position: fen,
              onPieceDrop: onDrop,
              onSquareClick: onSquareClick,
              animationDurationInMs: BOARD_STYLES.ANIMATION_DURATION,
              darkSquareStyle: BOARD_STYLES.DARK_SQUARE,
              lightSquareStyle: BOARD_STYLES.LIGHT_SQUARE,
              squareStyles: customSquareStyles,
              showNotation: true,
              boardStyle: {
                borderRadius: "4px",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
              },
            }}
          />
        </div>

        <CapturedPieces
          capturedPieces={capturedPieces.black}
          color="black"
          label="Black"
        />

        <GameStatus status={gameStatus.status} lastError={lastError} />

        <GameControls onReset={resetGame} />

        <PromotionDialog
          isOpen={showPromotionDialog}
          onPromotion={handlePromotion}
          onCancel={cancelPromotion}
        />
      </div>
    </main>
  );
}
