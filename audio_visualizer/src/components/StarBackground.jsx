import React from "react";
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

const StarBackground = () => {
    return (
        <Canvas style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }}>
            <ambientLight intensity={0.5}/>
            <Stars
                radius={50}
                depth={40}
                count={1000}
                fade
            />
        </Canvas>
    );
}


export default StarBackground;