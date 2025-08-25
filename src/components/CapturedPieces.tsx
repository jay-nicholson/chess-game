import React from "react";
import { PIECE_SYMBOLS, calculateCapturedPoints } from "../lib/chess";

interface CapturedPiecesProps {
  capturedPieces: string[];
  color: "white" | "black";
  label: string;
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({
  capturedPieces,
  color,
  label,
}) => {
  const points = calculateCapturedPoints(capturedPieces);
  const oppositeColor = color === "white" ? "b" : "w";

  return (
    <div className={`captured-pieces ${color}`}>
      <div className="captured-label">
        {label}: +{points}
      </div>
      {capturedPieces.map((piece, index) => (
        <span key={index} className="captured-piece">
          {PIECE_SYMBOLS[(oppositeColor + piece) as keyof typeof PIECE_SYMBOLS]}
        </span>
      ))}
    </div>
  );
};
