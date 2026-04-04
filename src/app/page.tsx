"use client";

import React, { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useChessGame } from "../lib/useChessGame";
import {
  CopyRoomLinkButton,
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
  const [roomInput, setRoomInput] = useState("");
  /** Set only after mount so server and first client render match (no Math.random during SSR). */
  const [generatedRoom, setGeneratedRoom] = useState<string | null>(null);
  useEffect(() => {
    setGeneratedRoom(`room-${Math.random().toString(36).slice(2, 8)}`);
  }, []);
  const {
    fen,
    gameStatus,
    lastError,
    idleSnarkIndex,
    idleSnark,
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
    onPieceDragBegin,
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

        <div className="online-launcher">
          <div className="online-launcher__row">
            {generatedRoom ? (
              <>
                <Link href={`/play/${generatedRoom}`} className="game-button">
                  Create online room
                </Link>
                <Link href={`/watch/${generatedRoom}`} className="game-button">
                  Spectate room
                </Link>
                <CopyRoomLinkButton roomId={generatedRoom} label="Copy invite link" />
              </>
            ) : (
              <>
                <span className="game-button online-launcher__pending" aria-busy="true">
                  Preparing room…
                </span>
                <span className="game-button online-launcher__pending" aria-busy="true">
                  Preparing room…
                </span>
              </>
            )}
          </div>
          <div className="online-launcher__row">
            <input
              className="room-input"
              value={roomInput}
              onChange={(event) => setRoomInput(event.target.value)}
              placeholder="Enter room id"
            />
            <Link
              href={roomInput.trim() ? `/play/${roomInput.trim()}` : "#"}
              className={`game-button ${roomInput.trim() ? "" : "disabled-link"}`}
            >
              Join room
            </Link>
          </div>
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
                onPieceDrag: onPieceDragBegin,
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
          isGameOver={gameStatus.isGameOver}
          outcome={gameStatus.outcome}
          winner={gameStatus.winner}
          idleSnark={idleSnark}
          idleSnarkKey={idleSnarkIndex}
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
