import React from "react";

interface GameStatusProps {
  status: string;
  lastError?: string;
  showTimer?: boolean;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  status,
  lastError,
  showTimer = false,
}) => {
  // Hide regular status when timer is shown for "to move" states
  const shouldShowStatus =
    !showTimer ||
    (!status.includes("to move") && !status.includes("is in check"));

  return (
    <div
      style={{
        fontSize: 14,
        textAlign: "center",
        minHeight: shouldShowStatus ? "auto" : "0",
      }}
    >
      {shouldShowStatus && (
        <div style={{ marginBottom: 4 }}>
          <strong>Status:</strong> {status}
        </div>
      )}
      {lastError && <div className="error-message">⚠️ {lastError}</div>}
    </div>
  );
};
