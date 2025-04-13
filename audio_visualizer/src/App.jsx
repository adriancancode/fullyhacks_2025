import { useRef, useState } from 'react';
import StarBackground from './components/StarBackground';
import Saturn from './assets/audio/Saturn-radio-emissions.mp3';
import Jupiter from './assets/audio/Voyager-2-Jupiter-Arrival.mp3';
import './App.css';

function App() {
  const audioRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const audios = [
    {name: 'Saturn radio emissions', url: Saturn},
    {name: 'Voyager 2 arrival to Jupiter', url: Jupiter}
  ];
    
  

  const handleFileChange = (e) => {
    setSelectedFile(e.target.value);
  };

  return (
    <>
      
      <div className="app-container" style={{ position: 'relative', zIndex: 1 }}>
        <StarBackground/>
        
        <header>
          <h1>Space Sound Visualizer🪐</h1>
          <p>Sounds that are out-of-this-world!</p>
        </header>

        <select onChange={handleFileChange} value={selectedFile}>
          {audios.map((audio, index) => {
            <option key={index} value={audio.url}>{option.name}</option>
          })}
        </select>

        
          {selectedFile ? (
            <div className="visualizer-container">
              <button>Play</button>
              <audio ref={audioRef}>
                <source src={selectedAudio} type="audio/mpeg" />
              </audio>
            </div>
            
          ) : (
            <div className="empty-state">
              <p>Select an audio file to begin visualization</p>
            </div>
          )}
        
        <footer>
          <p>Original space audio recordings provided courtesy of NASA and The University of Iowa. https://space-audio.org/</p>
        </footer>
      </div>
    </>
    
  );
}

export default App;