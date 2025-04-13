import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const AudioVisualizer = ({ audioFile = '/audio/SKR-03-324.wav' }) => {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const mountRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const rendererRef = useRef(null);
  const composerRef = useRef(null);
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const sourceRef = useRef(null);
  const [audioIsSetup, setAudioIsSetup] = useState(false);
  const [lastFrequency, setLastFrequency] = useState(0); // Track frequency for debugging

  // Set up Three.js scene
  useEffect(() => {
    console.log("Initializing Three.js scene");

    // Initialize scene, camera, and renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.6);
    renderer.setClearColor(0x000000);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    if (mountRef.current) {
      // Clear previous content
      while (mountRef.current.firstChild) {
        mountRef.current.removeChild(mountRef.current.firstChild);
      }
      mountRef.current.appendChild(renderer.domElement);
    }

    // Set up post-processing for glow effect
    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth * 0.8, window.innerHeight * 0.6),
      0.8,
      0.8, // radius
      0.35
    );

    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    const outputPass = new OutputPass();
    bloomComposer.addPass(outputPass);

    composerRef.current = bloomComposer;

    // Position the camera
    camera.position.set(0, -2, 14);
    camera.lookAt(0, 0, 0);

    // Create uniforms for shaders
    const uniforms = {
      u_time: { type: 'f', value: 0.0 },
      u_frequency: { type: 'f', value: 10.0 }, // Default non-zero value
      u_red: { type: 'f', value: 1.0 },
      u_green: { type: 'f', value: 0.5 },
      u_blue: { type: 'f', value: 0.1 }
    };

    // Custom shader material
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: `
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

        // Classic Perlin noise
        float cnoise(vec3 P) {
          vec3 Pi0 = floor(P); // Integer part for indexing
          vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
          Pi0 = mod289(Pi0);
          Pi1 = mod289(Pi1);
          vec3 Pf0 = fract(P); // Fractional part for interpolation
          vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
          vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
          vec4 iy = vec4(Pi0.yy, Pi1.yy);
          vec4 iz0 = Pi0.zzzz;
          vec4 iz1 = Pi1.zzzz;

          vec4 ixy = permute(permute(ix) + iy);
          vec4 ixy0 = permute(ixy + iz0);
          vec4 ixy1 = permute(ixy + iz1);

          vec4 gx0 = ixy0 * (1.0 / 7.0);
          vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
          gx0 = fract(gx0);
          vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
          vec4 sz0 = step(gz0, vec4(0.0));
          gx0 -= sz0 * (step(0.0, gx0) - 0.5);
          gy0 -= sz0 * (step(0.0, gy0) - 0.5);

          vec4 gx1 = ixy1 * (1.0 / 7.0);
          vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
          gx1 = fract(gx1);
          vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
          vec4 sz1 = step(gz1, vec4(0.0));
          gx1 -= sz1 * (step(0.0, gx1) - 0.5);
          gy1 -= sz1 * (step(0.0, gy1) - 0.5);

          vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
          vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
          vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
          vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
          vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
          vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
          vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

          vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
          g000 *= norm0.x;
          g010 *= norm0.y;
          g100 *= norm0.z;
          g110 *= norm0.w;
          vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
          g001 *= norm1.x;
          g011 *= norm1.y;
          g101 *= norm1.z;
          g111 *= norm1.w;

          float n000 = dot(g000, Pf0);
          float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
          float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
          float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
          float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
          float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
          float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
          float n111 = dot(g111, Pf1);

          vec3 fade_xyz = fade(Pf0);
          vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
          vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
          float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
          return 2.2 * n_xyz;
        }

        uniform float u_time;
        uniform float u_frequency;

        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;

          // Add oscillation based on audio frequency and Perlin noise
          float noise = cnoise(position * 0.5 + u_time * 0.1);

          // Greatly amplify the displacement effect
          float displacement = 0.01 * u_frequency * noise;

          // Create displaced position
          vec3 newPosition = position + normal * displacement;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform float u_frequency;
        uniform float u_red;
        uniform float u_green;
        uniform float u_blue;

        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Make color more responsive to audio - much larger multiplier
          float intensity = u_frequency * 0.02;
          vec3 color = vec3(u_red, u_green * (0.5 + intensity), u_blue * (0.3 + intensity));

          // Add stronger pulsing
          color *= 1.0 + 0.5 * sin(u_time * 2.0);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      wireframe: true
    });

    materialRef.current = material;

    // Create a blobby sphere geometry using IcosahedronGeometry
    const geometry = new THREE.IcosahedronGeometry(4, 30);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Add rotation to the mesh
    mesh.rotation.x = Math.PI * 0.1;

    // Mouse movement for dynamic camera positioning
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = function (e) {
      let windowHalfX = window.innerWidth / 2;
      let windowHalfY = window.innerHeight / 2;
      mouseX = (e.clientX - windowHalfX) / 100;
      mouseY = (e.clientY - windowHalfY) / 100;
    };

    document.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      // Rotate the mesh
      if (meshRef.current) {
        meshRef.current.rotation.y += 0.001;
        meshRef.current.rotation.z += 0.0005;
      }

      // Dynamic camera movement based on mouse position (from reference code)
      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      // Update shader uniforms with time
      if (materialRef.current) {
        materialRef.current.uniforms.u_time.value = clockRef.current.getElapsedTime();

        // If audio is playing, update the frequency uniform
        if (isPlaying && analyserRef.current) {
          try {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate average frequency with more weight to lower frequencies
            let sum = 0;
            let weightedCount = 0;
            for (let i = 0; i < dataArray.length; i++) {
              // Weight lower frequencies higher
              const weight = 1 - (i / dataArray.length) * 0.5;
              sum += dataArray[i] * weight;
              weightedCount += weight;
            }
            const average = sum / weightedCount;

            // Log frequency data occasionally for debugging
            if (Math.random() < 0.01) { // Only log 1% of the time to avoid console spam
              console.log("Audio frequency data:", average);
              setLastFrequency(average);
            }

            // Apply multiplier to make the effect more visible
            const amplifiedFreq = average * 3.0; // Amplify by 3x

            // Apply smoothing for more fluid motion
            const currentFreq = materialRef.current.uniforms.u_frequency.value;
            const smoothingFactor = 0.2;
            const newFreq = currentFreq * (1 - smoothingFactor) + amplifiedFreq * smoothingFactor;

            materialRef.current.uniforms.u_frequency.value = newFreq;

            // Add stronger scaling effect based on bass frequencies
            if (meshRef.current) {
              // Get the bass frequencies (first 1/4 of frequency bins)
              const bassEnd = Math.floor(dataArray.length / 4);
              let bassSum = 0;
              for (let i = 0; i < bassEnd; i++) {
                bassSum += dataArray[i];
              }
              const bassAvg = bassSum / bassEnd;

              // Scale based on bass, with much larger effect
              const baseScale = 1.0;
              const scaleAmount = 0.02; // 4x stronger scaling (was 0.005)
              const targetScale = baseScale + (bassAvg / 255) * scaleAmount;

              // Smooth the scale transition
              meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.2; // Faster response
              meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * 0.2;
              meshRef.current.scale.z += (targetScale - meshRef.current.scale.z) * 0.2;
            }
          } catch (error) {
            console.error("Error updating audio frequency data:", error);
          }
        } else {
          // Add subtle animation when not playing to ensure the sun isn't static
          const pulseFactor = 10.0 + 5.0 * Math.sin(clockRef.current.getElapsedTime() * 0.5);
          materialRef.current.uniforms.u_frequency.value = pulseFactor;
        }
      }

      // Render with composer for bloom effect
      if (composerRef.current) {
        composerRef.current.render();
      }
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth * 0.8;
      const height = window.innerHeight * 0.6;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (composerRef.current) {
        composerRef.current.setSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);

      // Dispose of Three.js objects
      geometry.dispose();
      material.dispose();

      if (renderer) {
        renderer.dispose();
      }

      // Cancel any ongoing animation frames
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying]); // Re-create the scene when playing state changes

  // Setup audio
  useEffect(() => {
    console.log("Setting up audio with file:", audioFile);

    // Immediate function to fix audio context suspension issues
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        // Create new context and resume it immediately (fix for Chrome autoplay policy)
        const newContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = newContext;

        if (newContext.state === 'suspended') {
          newContext.resume().then(() => {
            console.log("AudioContext resumed on initialization");
          });
        }
      }
    };

    // Try to initialize audio context
    initAudioContext();

    const setupAudio = async () => {
      try {
        initAudioContext(); // Make sure context is created

        // Create audio element
        const audio = new Audio();
        audio.src = audioFile;
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto'; // Preload the audio
        audioRef.current = audio;

        // Create analyser node with larger FFT size
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256; // Increased from 64 for better frequency resolution
        analyserRef.current = analyser;

        // Disconnect any existing audio source
        if (sourceRef.current) {
          try {
            sourceRef.current.disconnect();
          } catch (e) {
            console.log("No previous source to disconnect");
          }
        }

        // Connect audio to analyser
        const source = audioContextRef.current.createMediaElementSource(audio);
        sourceRef.current = source;
        source.connect(analyser);
        analyser.connect(audioContextRef.current.destination);

        // Set up event listeners
        audio.addEventListener('play', () => {
          console.log('Audio playing');
          setIsPlaying(true);
        });

        audio.addEventListener('pause', () => {
          console.log('Audio paused');
          setIsPlaying(false);
        });

        audio.addEventListener('ended', () => {
          console.log('Audio ended');
          setIsPlaying(false);
        });

        audio.addEventListener('error', (e) => {
          console.error('Audio error:', e);
        });

        audio.load(); // Explicitly load the audio

        setAudioIsSetup(true);
        console.log("Audio setup complete");
      } catch (error) {
        console.error("Error setting up audio:", error);
      }
    };

    setupAudio();

    // Clean up audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          console.log("No source to disconnect on cleanup");
        }
      }
    };
  }, [audioFile]);

  const togglePlay = () => {
    console.log("Toggle play called, audio setup:", audioIsSetup);

    // Fix for audio context suspension (browsers require user interaction)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log("AudioContext resumed");
      });
    }

    if (!audioRef.current || !audioIsSetup) {
      console.error("Audio not set up properly");
      return;
    }

    if (isPlaying) {
      console.log("Pausing audio");
      audioRef.current.pause();
    } else {
      console.log("Playing audio");

      // Play the audio with a promise to catch any errors
      audioRef.current.play()
        .then(() => {
          console.log("Audio playback started successfully");
        })
        .catch(error => {
          console.error("Error playing audio:", error);

          // Add a click handler to the document that will play audio on user interaction
          document.addEventListener('click', function playOnClick() {
            // Resume context first
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume();
            }

            // Then play audio
            audioRef.current.play()
              .then(() => {
                console.log("Audio playback started on click");
                document.removeEventListener('click', playOnClick);
              })
              .catch(e => console.error("Still can't play audio:", e));
          }, { once: true });

          alert("Please click anywhere on the page to start audio (browser autoplay policy)");
        });
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

        {lastFrequency > 0 && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            Audio frequency: {Math.round(lastFrequency)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioVisualizer;
