"use client";

import React, { useCallback, useState } from "react";

type Path = "play" | "watch";

type CopyRoomLinkButtonProps = {
  roomId: string;
  /** URL path segment after origin (default: play — invite someone to play). */
  path?: Path;
  label?: string;
  className?: string;
};

/**
 * Copies `${origin}/${path}/${roomId}` to the clipboard (client-only).
 */
export const CopyRoomLinkButton: React.FC<CopyRoomLinkButtonProps> = ({
  roomId,
  path = "play",
  label = "Copy join link",
  className = "game-button copy-room-link-btn",
}) => {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(() => {
    const url = `${window.location.origin}/${path}/${encodeURIComponent(roomId)}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }, [path, roomId]);

  return (
    <button type="button" className={className} onClick={onClick} aria-live="polite">
      {copied ? "Copied!" : label}
    </button>
  );
};
