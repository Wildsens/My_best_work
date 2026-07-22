/** @paper-design/shaders-react@0.0.76 */
import React from 'react';
import { Heatmap } from '@paper-design/shaders-react';
import myImage from './asd.jfif';

export default function MyShader() {
  return (
    <Heatmap 
      speed={1} 
      contour={0.867} 
      angle={-216} 
      noise={0.49} 
      innerGlow={0.4} 
      outerGlow={0.4} 
      scale={0.42} 
      image={myImage} 
      frame={401572.025} 
      colors={['#5E0001', '#9D0002F0', '#FF0005']} 
      colorBack="#00000000" 
      style={{ backgroundColor: '#000000', width: '100%', height: '100%', display: 'block' }} 
    />
  );
}
