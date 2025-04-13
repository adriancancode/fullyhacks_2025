import { useState } from 'react';
import AudioVisualizer from './components/AudioVisualizer';
import StarBackground from './components/StarBackground';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.match('audio.*')) {
      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setAudioUrl(url);
    }
  };

  const selectSpaceAudio = (url) => {
    setAudioUrl(url);
    setSelectedFile(null);
  };

  return (
    <>
      
      <div className="app-container" style={{ position: 'relative', zIndex: 1 }}>
        <StarBackground/>

        <header>
          <h1>Space Sound Visualizer🪐</h1>
          <p>Explore the sounds of space through interactive visualizations</p>
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
            <select>
              <option>Select audio</option>
              <option></option>
              <option></option>
              <option></option>
            </select>
          </div>
        </div>

        <div className="visualizer-container">
          {audioUrl ? (
            <AudioVisualizer audioFile={audioUrl} />
          ) : (
            <div className="empty-state">
              <p>Select or upload an audio file to begin visualization</p>
            </div>
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