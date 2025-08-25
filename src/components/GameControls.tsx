import React from "react";

interface GameControlsProps {
  onReset: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({ onReset }) => {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={onReset} className="game-button">
        Reset Game
      </button>
    </div>
  );
};
