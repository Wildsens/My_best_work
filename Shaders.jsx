import React, { useState, useEffect, useRef } from 'react';
import { Heatmap } from '@paper-design/shaders-react';
import myImage from './asd.jfif';

export default function MyShader() {
  // Шейдер за замовчуванням увімкнений
  const [isActive, setIsActive] = useState(true);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Якщо шейдер з'явився на екрані — чекаємо 300 мс
          timerRef.current = setTimeout(() => {
            setIsActive(true); // Після 300 мс на екрані — він стабільно працює
          }, 300);
        } else {
          // Якщо проскочили швидко або пішли з секції — скасовуємо таймер і гасимо анімацію
          if (timerRef.current) clearTimeout(timerRef.current);
          setIsActive(false);
        }
      },
      { threshold: 0.2 } // Спрацьовує, коли хоча б 20% шейдера у зоні видимості
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (containerRef.current) observer.unobserve(containerRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <Heatmap 
        speed={isActive ? 1 : 0} // Після 300мс видимості постійно 1 (не гасне і не зупиняється при скролі)
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
        style={{ 
          backgroundColor: '#000000', 
          width: '100%', 
          height: '100%', 
          display: 'block' 
        }} 
      />
    </div>
  );
} 