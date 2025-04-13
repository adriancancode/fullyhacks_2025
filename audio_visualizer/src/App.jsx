import { useRef, useState } from 'react';
import StarBackground from './components/StarBackground';
import Saturn from './assets/audio/Saturn-radio-emissions.mp3';
import Jupiter from './assets/audio/Voyager-2-Jupiter-Arrival.mp3';
import './App.css';

function App() {
  const audioRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const audios = [
    {name: 'Saturn radio emissions', url: Saturn},
    {name: 'Voyager 2 arrival to Jupiter', url: Jupiter}
  ];
    
  const handlePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };
  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.load();
      setIsPlaying(true);
    }
  }

  const handleFileChange = (e) => {
    setSelectedFile(e.target.value);
    if (audioRef.current) {
      audioRef.current.pause(); // Stop current playback before switching
      audioRef.current.load();  // Load new source
    }
  };

  return (
    <>
      
      <div className="app-container" style={{ position: 'relative', zIndex: 1 }}>
        <StarBackground/>
        
        <header>
          <h1>Space Sound Visualizer🪐</h1>
          <p>Sounds that are out-of-this-world!</p>
        </header>

        <select onChange={handleFileChange} value={selectedFile || ''}>
          <option value="">Select a sound</option>
          {audios.map((audio, index) => (
            <option key={index} value={audio.url}>{audio.name}</option>
          ))}
        </select>

        
        {selectedFile ? (
          <div className="visualizer-container">
            <button onClick={handlePlay}>{isPlaying ? "Pause" : "Play"}</button>
            <button onCLick={handleRestart}>Restart</button>
            <audio ref={audioRef}>
              <source src={selectedFile} type="audio/mpeg" />
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