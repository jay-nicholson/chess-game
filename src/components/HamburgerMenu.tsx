import React, { useState } from "react";

interface HamburgerMenuProps {
  onResetGame: () => void;
  onTimerChange: (minutes: number) => void;
  currentTimerMinutes: number;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  onResetGame,
  onTimerChange,
  currentTimerMinutes,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const timerOptions = [5, 10, 15, 20, 25, 30]; // in minutes

  const handleTimerSelect = (minutes: number) => {
    onTimerChange(minutes);
    setIsOpen(false);
  };

  const handleReset = () => {
    onResetGame();
    setIsOpen(false);
  };

  return (
    <div className="hamburger-menu">
      <button
        className="hamburger-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
      >
        <div className={`hamburger-icon ${isOpen ? "open" : ""}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="hamburger-overlay" onClick={() => setIsOpen(false)} />
          <div className="hamburger-dropdown">
            <div className="menu-section">
              <h3>Timer Settings</h3>
              <div className="timer-options">
                {timerOptions.map((minutes) => (
                  <button
                    key={minutes}
                    className={`timer-option ${
                      minutes === currentTimerMinutes ? "active" : ""
                    }`}
                    onClick={() => handleTimerSelect(minutes)}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
            </div>

            <div className="menu-section">
              <h3>Game Controls</h3>
              <button
                className="menu-action-button reset-button"
                onClick={handleReset}
              >
                🔄 Reset Game
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
