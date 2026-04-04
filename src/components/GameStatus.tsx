import React from "react";
import type { GameOutcome } from "../lib/chess";

interface GameStatusProps {
  status: string;
  lastError?: string;
  showTimer?: boolean;
  isGameOver?: boolean;
  outcome?: GameOutcome;
  winner?: "white" | "black" | null;
  idleSnark?: string | null;
  /** Increments each time the player puts a piece back; drives carousel animation */
  idleSnarkKey?: number | null;
  /** Shown on the same row as the status line (e.g. copy room link). */
  roomLinks?: React.ReactNode;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  status,
  lastError,
  showTimer = false,
  isGameOver = false,
  outcome = null,
  winner = null,
  idleSnark = null,
  idleSnarkKey = null,
  roomLinks,
}) => {
  const showGameOverBanner = Boolean(isGameOver && outcome);
  const showRegularStatusRow =
    !showGameOverBanner &&
    (!showTimer ||
      (!status.includes("to move") && !status.includes("is in check")));

  const winnerLabel = winner === "white" ? "White" : "Black";

  return (
    <div
      className="game-status-root"
      style={{
        fontSize: 14,
        textAlign: "center",
        width: "100%",
        maxWidth: 560,
      }}
    >
      {showGameOverBanner && (
        <div
          className={
            outcome === "checkmate"
              ? "game-over-banner game-over-banner--checkmate"
              : outcome === "stalemate"
                ? "game-over-banner game-over-banner--stalemate"
                : "game-over-banner game-over-banner--draw"
          }
          role="status"
          aria-live="polite"
        >
          {outcome === "checkmate" && winner && (
            <>
              <div className="game-over-banner__icon" aria-hidden>
                ♔
              </div>
              <div className="game-over-banner__title">Checkmate</div>
              <div className="game-over-banner__winner">
                {winnerLabel} wins
              </div>
            </>
          )}
          {outcome === "stalemate" && (
            <>
              <div className="game-over-banner__icon" aria-hidden>
                ♔
              </div>
              <div className="game-over-banner__title">Stalemate</div>
              <div className="game-over-banner__sub">Draw — no legal moves</div>
            </>
          )}
          {outcome === "draw" && (
            <>
              <div className="game-over-banner__icon" aria-hidden>
                🤝
              </div>
              <div className="game-over-banner__title">Draw</div>
              <div className="game-over-banner__sub">Game over</div>
            </>
          )}
        </div>
      )}

      {(showRegularStatusRow || roomLinks) && (
        <div
          className={`game-status-bar${roomLinks && !showRegularStatusRow ? " game-status-bar--links-only" : ""}`}
        >
          <div className="game-status-bar__status">
            {showRegularStatusRow && (
              <>
                <strong>Status:</strong> {status}
              </>
            )}
          </div>
          {roomLinks && (
            <div className="game-status-bar__links">{roomLinks}</div>
          )}
        </div>
      )}

      {lastError && (
        <div className="error-message" role="alert">
          ⚠️ {lastError}
        </div>
      )}

      {!lastError && idleSnark && !isGameOver && (
        <div
          className="idle-snark-carousel"
          key={idleSnarkKey ?? idleSnark}
          role="status"
        >
          <p className="idle-snark-carousel__text">{idleSnark}</p>
        </div>
      )}
    </div>
  );
};
