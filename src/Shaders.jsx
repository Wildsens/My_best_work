import { useEffect, useRef, useState } from 'react';
import { Heatmap } from '@paper-design/shaders-react';
import myImage from './asd.jfif';

export default function MyShader() {
  const container = useRef(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    const update = () => setAnimate(visible && !media.matches && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(container.current);
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <div className="jester" ref={container}>
      <img src={myImage} alt="" />
      {animate && (
        <Heatmap className="heatmap" speed={0.7} contour={0.867} angle={-216}
          noise={0.49} innerGlow={0.4} outerGlow={0.4} scale={0.95} fit="contain"
          image={myImage} frame={401572.025}
          colors={['#5E0001', '#AD1125', '#FF493F']} colorBack="#00000000" />
      )}
    </div>
  );
}
