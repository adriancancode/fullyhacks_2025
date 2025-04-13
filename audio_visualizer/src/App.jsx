import { useState } from 'react';
import AudioVisualizer from './components/AudioVisualizer';
import StarBackground from './components/StarBackground';
import './App.css';

function App() {
  const [audioUrl, setAudioUrl] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.match('audio.*')) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    }
  };

  return (
    <>
      <div className="app-container" style={{ position: 'relative', zIndex: 1 }}>
        <StarBackground />

        <header>
          <h1>Space Sound Visualizer🪐</h1>
          <p>Sounds that are out-of-this-world!</p>
        </header>

        <div className="controls-section">
          <div className="file-controls">
            <h2>Upload Space Audio</h2>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              id="audio-upload"
            />
          </div>
        </div>

        <div className="visualizer-container">
          {audioUrl ? (
            <AudioVisualizer audioFile={audioUrl} />
          ) : (
            <AudioVisualizer />
          )}
        </div>

        <footer>
          <p>Data from NASA and other space agencies. Created with Web Audio API and React.</p>
        </footer>
      </div>
    </>
  );
}

export default App;
