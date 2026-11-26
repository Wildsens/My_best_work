import React, { useState, useEffect } from 'react';
import { Dithering } from '@paper-design/shaders-react';

export default function MyShader() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Перевіряємо ширину екрана або мобільний User-Agent
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Dithering 
      // На мобільних зменшуємо швидкість для економії батареї
      speed={isMobile ? 0.08 : 0.17} 
      shape="swirl" 
      type="4x4" 
      size={isMobile ? 0.2 : 0.1} // Більший розмір точок = менше навантаження на GPU
      scale={isMobile ? 0.7 : 1} 
      colorBack="#00000000" 
      colorFront="#6D0C08" 
      style={{ 
        backgroundColor: '#000000', 
        width: '100%', 
        height: '100%', 
        display: 'block' 
      }} 
    />
  );
}