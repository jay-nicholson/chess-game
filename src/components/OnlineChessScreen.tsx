"use client";

import React, { Suspense, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOnlineChessGame } from "../lib/useOnlineChessGame";
import { BOARD_STYLES } from "../lib/chess";
import { CopyRoomLinkButton, GameStatus, PromotionDialog, TimerBanner } from ".";

const Chessboard = dynamic(
  () => import("react-chessboard").then((mod) => ({ default: mod.Chessboard })),
  { ssr: false }
);

export const OnlineChessScreen: React.FC<{
  roomId: string;
  role: "player" | "spectator";
}> = ({ roomId, role }) => {
  const router = useRouter();
  const onRoomFull = useCallback(() => {
    router.replace(`/watch/${roomId}`);
  }, [roomId, router]);

  const {
    connected,
    connectionError,
    mySide,
    isMyTurn,
    clockRunning,
    fen,
    gameStatus,
    lastError,
    idleSnark,
    idleSnarkTick,
    capturedPieces,
    customSquareStyles,
    whiteTime,
    blackTime,
    showPromotionDialog,
    onDrop,
    onSquareClick,
    handlePromotion,
    cancelPromotion,
    onPieceDragBegin,
  } = useOnlineChessGame({
    roomId,
    role,
    onRoomFull: role === "player" ? onRoomFull : undefined,
  });

  const currentPlayer = gameStatus.turnColor.toLowerCase() as "white" | "black";
  const showTimer = !gameStatus.isGameOver;

  return (
    <main className="main-layout">
      <div className="game-container">
        <div className="header-section">
          <h1 style={{ margin: 0 }}>
            WeChess {role === "spectator" ? "Spectator" : "Online"}
          </h1>
          <Link href="/" className="game-button">
            Back to local game
          </Link>
        </div>

        {connectionError && (
          <div className="connection-error-banner" role="alert">
            {connectionError}
          </div>
        )}

        <div className="online-meta">
          <span>Room: {roomId}</span>
          <span>
            {connectionError
              ? "Disconnected"
              : connected
                ? "Connected"
                : "Connecting…"}
          </span>
          <span>
            {role === "spectator"
              ? "Watching"
              : connectionError
                ? "—"
                : mySide
                  ? `${mySide === "w" ? "White" : "Black"} (${isMyTurn ? "your turn" : "waiting"})`
                  : "Joining…"}
          </span>
        </div>

        {showTimer && (
          <TimerBanner
            currentPlayer={currentPlayer}
            whiteTime={whiteTime}
            blackTime={blackTime}
            isGameOver={gameStatus.isGameOver}
            waitingForOpponent={!clockRunning && !gameStatus.isGameOver}
            capturedPieces={capturedPieces}
          />
        )}

        <div className="board-wrapper">
          <Suspense fallback={<div className="board-fallback">Loading board...</div>}>
            <Chessboard
              options={{
                position: fen,
                boardOrientation:
                  role === "player" && mySide === "b"
                    ? "black"
                    : "white",
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
          idleSnarkKey={idleSnarkTick}
          roomLinks={
            <>
              <CopyRoomLinkButton
                roomId={roomId}
                path="play"
                label="Copy join link"
              />
              {role === "spectator" && (
                <CopyRoomLinkButton
                  roomId={roomId}
                  path="watch"
                  label="Copy spectate link"
                  className="game-button copy-room-link-btn copy-room-link-btn--secondary"
                />
              )}
            </>
          }
        />

        <PromotionDialog
          isOpen={showPromotionDialog}
          onPromotion={handlePromotion}
          onCancel={cancelPromotion}
        />
      </div>
    </main>
  );
};
