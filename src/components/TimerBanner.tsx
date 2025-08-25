import React from "react";
import { calculateCapturedPoints } from "../lib/chess";

interface TimerBannerProps {
  currentPlayer: "white" | "black";
  whiteTime: number; // in seconds
  blackTime: number; // in seconds
  isGameOver: boolean;
  capturedPieces: {
    white: string[];
    black: string[];
  };
}

export const TimerBanner: React.FC<TimerBannerProps> = ({
  currentPlayer,
  whiteTime,
  blackTime,
  isGameOver,
  capturedPieces,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const whitePoints = calculateCapturedPoints(capturedPieces.white);
  const blackPoints = calculateCapturedPoints(capturedPieces.black);

  if (isGameOver) {
    return null; // Don't show timer when game is over
  }

  return (
    <div className="timer-banner">
      <div
        className={`timer-section ${currentPlayer === "white" ? "active" : ""}`}
      >
        <div className="timer-header">
          <div className="timer-label">White</div>
          <div className="timer-value white-timer">{formatTime(whiteTime)}</div>
        </div>
        <div className="material-section white-material">
          {whitePoints > 0 && (
            <span className="material-points">+{whitePoints}</span>
          )}
        </div>
      </div>

      <div className="turn-indicator">
        <div className={`turn-dot ${currentPlayer}`}></div>
        <span className="turn-text">
          {currentPlayer === "white" ? "White" : "Black"} to move
        </span>
      </div>

      <div
        className={`timer-section ${currentPlayer === "black" ? "active" : ""}`}
      >
        <div className="timer-header">
          <div className="timer-label">Black</div>
          <div className="timer-value black-timer">{formatTime(blackTime)}</div>
        </div>
        <div className="material-section black-material">
          {blackPoints > 0 && (
            <span className="material-points">+{blackPoints}</span>
          )}
        </div>
      </div>
    </div>
  );
};
