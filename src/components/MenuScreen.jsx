import PropTypes from "prop-types";
import { useEffect } from "react";

const MenuScreen = ({ onStartGame, audioRef }) => {
  // Setup background audio when component mounts
  useEffect(() => {
    // Create audio element
    if (audioRef.current) {
      audioRef.current.volume = 0.4; // Set volume to 40%
      audioRef.current.play().catch((error) => {
        // Autoplay might be blocked by browser policy
        console.log("Audio autoplay was prevented:", error);
      });
    }

    // No cleanup here - App.jsx handles the audio fadeout
  }, [audioRef]);

  return (
    <div
      className="menu-container"
      style={{ backgroundImage: "url('/backrooms.PNG')" }}
    >
      {/* Background audio */}
      <audio ref={audioRef} src="/Level_-1_ambience.mp3.mpeg" loop />

      {/* Scanline effect overlay */}
      <div className="scanline-effect"></div>

      <div className="menu-content">
        <h1 className="menu-title">BACKROOM ETERNAL</h1>
        <button className="start-button" onClick={onStartGame}>
          ENTER THE BACKROOMS
        </button>
      </div>
    </div>
  );
};

MenuScreen.propTypes = {
  onStartGame: PropTypes.func.isRequired,
  audioRef: PropTypes.object,
};

export default MenuScreen;
