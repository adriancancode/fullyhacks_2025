import { useState, useEffect, useRef } from 'react';

const AudioVisualizer = ({ audioFile }) => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualizationType, setVisualizationType] = useState('waveform'); // 'waveform', 'bars', 'circular'

  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (audioFile) {
      // Reset audio element if audioFile changes
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }
      
      setupAudio();
    }
  }, [audioFile]);

  const setupAudio = async () => {
    try {
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Create audio element
      const audio = new Audio();
      audio.src = audioFile;
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
      
      // Create analyser node
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      
      // Connect audio to analyser
      const source = audioContextRef.current.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContextRef.current.destination);
      
      // Set up event listeners
      audio.addEventListener('play', () => {
        setIsPlaying(true);
        draw();
      });
      
      audio.addEventListener('pause', () => {
        setIsPlaying(false);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      });
    } catch (error) {
      console.error("Error setting up audio:", error);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Resume audio context if suspended (needed for some browsers)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      audioRef.current.play();
    }
  };

  const draw = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    switch (visualizationType) {
      case 'waveform':
        drawWaveform(ctx, width, height);
        break;
      case 'bars':
        drawFrequencyBars(ctx, width, height);
        break;
      case 'circular':
        drawCircularVisualization(ctx, width, height);
        break;
      default:
        drawWaveform(ctx, width, height);
    }
    
    animationRef.current = requestAnimationFrame(draw);
  };

  const drawWaveform = (ctx, width, height) => {
    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteTimeDomainData(dataArray);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 217, 255)';
    ctx.beginPath();
    
    const sliceWidth = width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * height / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  const drawFrequencyBars = (ctx, width, height) => {
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);
    
    const barWidth = (width / bufferLength) * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * height;
      
      // Create a gradient effect for the bars
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, '#4a148c');
      gradient.addColorStop(0.5, '#7b1fa2');
      gradient.addColorStop(1, '#e040fb');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
  };

  const drawCircularVisualization = (ctx, width, height) => {
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius / 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#111';
    ctx.fill();
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * (radius / 2);
      const angle = (i * 2 * Math.PI) / bufferLength;
      
      const x1 = centerX + Math.cos(angle) * radius / 2;
      const y1 = centerY + Math.sin(angle) * radius / 2;
      const x2 = centerX + Math.cos(angle) * (radius / 2 + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius / 2 + barHeight);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 2;
      
      // Create a color based on frequency
      const hue = (i / bufferLength) * 360;
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.stroke();
    }
    
    // Add some stars in the background for space theme
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 2;
      const opacity = Math.random();
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();
    }
  };

  return (
    <div className="audio-visualizer">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={400} 
        style={{ 
          background: '#000', 
          borderRadius: '8px',
          width: '100%',
          height: 'auto'
        }}
      />
      
      <div className="controls">
        <button onClick={togglePlay}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        <select 
          value={visualizationType} 
          onChange={(e) => setVisualizationType(e.target.value)}
        >
          <option value="waveform">Waveform</option>
          <option value="bars">Frequency Bars</option>
          <option value="circular">Circular (Space Theme)</option>
        </select>
      </div>
    </div>
  );
};

export default AudioVisualizer;