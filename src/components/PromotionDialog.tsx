import React from "react";
import { PROMOTION_PIECES } from "../lib/chess";

interface PromotionDialogProps {
  isOpen: boolean;
  onPromotion: (piece: "q" | "r" | "b" | "n") => void;
  onCancel: () => void;
}

export const PromotionDialog: React.FC<PromotionDialogProps> = ({
  isOpen,
  onPromotion,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "var(--card-bg)",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
          textAlign: "center",
          minWidth: "320px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: "0 0 24px 0",
            color: "var(--foreground)",
            fontSize: "20px",
            fontWeight: "600",
          }}
        >
          Choose your piece
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            maxWidth: "240px",
            margin: "0 auto",
          }}
        >
          {PROMOTION_PIECES.map(({ piece, name, symbol }) => (
            <button
              key={piece}
              onClick={() => onPromotion(piece)}
              style={{
                padding: "20px 12px",
                borderRadius: "12px",
                border: "2px solid var(--border)",
                backgroundColor: "var(--card-bg)",
                color: "var(--foreground)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                minHeight: "100px",
                fontSize: "40px",
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--button-hover)";
                e.currentTarget.style.borderColor = "var(--foreground)";
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 20px rgba(0, 0, 0, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--card-bg)";
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={{ lineHeight: 1 }}>{symbol}</span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  opacity: 0.9,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {name}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          style={{
            marginTop: "24px",
            padding: "12px 24px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            backgroundColor: "transparent",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--border)";
            e.currentTarget.style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--muted)";
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
