"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { useChessGame } from "../lib/useChessGame";
import {
  PromotionDialog,
  GameStatus,
  TimerBanner,
  HamburgerMenu,
} from "../components";
import { BOARD_STYLES } from "../lib/chess";

// Dynamic import with no SSR to prevent hydration mismatch
const Chessboard = dynamic(
  () => import("react-chessboard").then((mod) => ({ default: mod.Chessboard })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "560px",
          height: "560px",
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontSize: "14px",
        }}
      >
        Loading chessboard...
      </div>
    ),
  }
);

export default function Home() {
  const {
    fen,
    gameStatus,
    lastError,
    capturedPieces,
    customSquareStyles,
    whiteTime,
    blackTime,
    timerMinutes,
    showPromotionDialog,
    onDrop,
    onSquareClick,
    handlePromotion,
    cancelPromotion,
    resetGame,
    changeTimer,
  } = useChessGame();

  const currentPlayer = gameStatus.turnColor.toLowerCase() as "white" | "black";
  const showTimer = !gameStatus.isGameOver;

  return (
    <main className="main-layout">
      <div className="game-container">
        <div className="header-section">
          <h1 style={{ margin: 0 }}>WeChess</h1>
          <HamburgerMenu
            onResetGame={resetGame}
            onTimerChange={changeTimer}
            currentTimerMinutes={timerMinutes}
          />
        </div>

        {showTimer && (
          <TimerBanner
            currentPlayer={currentPlayer}
            whiteTime={whiteTime}
            blackTime={blackTime}
            isGameOver={gameStatus.isGameOver}
            capturedPieces={capturedPieces}
          />
        )}

        <div className="board-wrapper">
          <Suspense
            fallback={
              <div
                style={{
                  width: "560px",
                  height: "560px",
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--muted)",
                  fontSize: "14px",
                }}
              >
                Initializing game...
              </div>
            }
          >
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
          </Suspense>
        </div>

        <GameStatus
          status={gameStatus.status}
          lastError={lastError}
          showTimer={showTimer}
        />

        <PromotionDialog
          isOpen={showPromotionDialog}
          onPromotion={handlePromotion}
          onCancel={cancelPromotion}
        />
      </div>
    </main>
  );
}
