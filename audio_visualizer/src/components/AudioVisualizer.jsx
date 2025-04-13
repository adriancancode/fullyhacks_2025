import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const AudioVisualizer = ({ audioFile = '/audio/SKR-03-324.wav' }) => {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const mountRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const sceneRef = useRef(null);
  const sphereRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    // Initialize scene, camera, and renderer for glowing sphere
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      75, // Field of view
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    
    // Create renderer with transparent background
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.6); // Set to a fixed proportion of the window
    renderer.setClearColor(0x000000, 0);
    
    if (mountRef.current) {
      // Clear previous content
      while (mountRef.current.firstChild) {
        mountRef.current.removeChild(mountRef.current.firstChild);
      }
      mountRef.current.appendChild(renderer.domElement);
    }

    // Create a glowing sphere
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffa500, // Sun-like color
      emissive: 0xff7700,
      emissiveIntensity: 0.5
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereRef.current = sphere;
    scene.add(sphere);

    // Create a glow effect using a shader material
    const glowGeometry = new THREE.SphereGeometry(1.2, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xffa500) },
        viewVector: { value: camera.position }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormView = normalize(viewVector - modelViewMatrix * vec4(position, 1.0)).xyz;
          intensity = pow(0.6 - dot(vNormal, vNormView), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, 1.0);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glowRef.current = glow;
    scene.add(glow);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Position the camera
    camera.position.z = 5;

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth * 0.8;
      const height = window.innerHeight * 0.6;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      // Rotate the sphere and glow for a dynamic effect
      if (sphereRef.current && glowRef.current) {
        sphereRef.current.rotation.y += 0.005;
        glowRef.current.rotation.y += 0.005;
        
        // If audio is playing, pulse the sphere based on audio data
        if (isPlaying && analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average frequency value
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          
          // Scale factor to make the effect more visible
          const scaleFactor = 1 + (avg / 255) * 0.3; 
          
          sphereRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
          glowRef.current.scale.set(scaleFactor + 0.2, scaleFactor + 0.2, scaleFactor + 0.2);
          
          // Change color based on frequency
          const hue = (avg / 255) * 0.1; // Small hue shift
          sphereRef.current.material.color.setHSL(0.1 + hue, 1, 0.5);
          glowMaterial.uniforms.glowColor.value.setHSL(0.1 + hue, 1, 0.5);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Dispose of Three.js objects and renderer
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      if (renderer) {
        renderer.dispose();
      }

      // Cancel any ongoing animation frames
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    // Clean up audio on unmount
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
      });

      audio.addEventListener('pause', () => {
        setIsPlaying(false);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
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
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      audioRef.current.play();
    }
  };

  return (
    <div className="audio-visualizer">
      <div 
        ref={mountRef} 
        style={{ 
          width: '80%', 
          height: '60vh', 
          margin: '0 auto',
          borderRadius: '8px',
          background: 'rgba(0, 0, 0, 0.8)',
          overflow: 'hidden'
        }} 
      />

      <div className="controls" style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          onClick={togglePlay}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            borderRadius: '20px',
            background: '#ffa500',
            color: '#000',
            border: 'none',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );
};

export default AudioVisualizer;
