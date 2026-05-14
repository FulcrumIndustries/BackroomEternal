import { useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import "./App.css";
import MenuScreen from "./components/MenuScreen";
import BackroomsGame from "./components/BackroomsGame";

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const menuAudioRef = useRef(null);

  const startGame = () => {
    // When starting the game, we'll fade out the menu audio
    if (menuAudioRef.current) {
      // Fade out menu audio
      const fadeAudio = setInterval(() => {
        if (menuAudioRef.current && menuAudioRef.current.volume > 0.1) {
          menuAudioRef.current.volume -= 0.1;
        } else {
          clearInterval(fadeAudio);
          if (menuAudioRef.current) {
            menuAudioRef.current.pause();
          }
          setGameStarted(true);
        }
      }, 100);
    } else {
      setGameStarted(true);
    }
  };

  return (
    <div className="app-container">
      {!gameStarted ? (
        <MenuScreen onStartGame={startGame} audioRef={menuAudioRef} />
      ) : (
        <Canvas className="game-canvas">
          <BackroomsGame />
        </Canvas>
      )}
    </div>
  );
}

export default App;
