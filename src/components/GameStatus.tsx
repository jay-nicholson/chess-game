import React from "react";

interface GameStatusProps {
  status: string;
  lastError?: string;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  status,
  lastError,
}) => {
  return (
    <div style={{ fontSize: 14, textAlign: "center" }}>
      <div style={{ marginBottom: 4 }}>
        <strong>Status:</strong> {status}
      </div>
      {lastError && <div className="error-message">⚠️ {lastError}</div>}
    </div>
  );
};
