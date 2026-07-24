import React from 'react';
import ReactDOM from 'react-dom/client';
import MyShader from './Shaders'; 

import './fonts/BespokeStencil_Complete/Fonts/WEB/css/bespoke-stencil.css';
import './style.css'; 
import convertorImg from './IMAGES/Convertor.webp';
import WildsenChannelImg from './IMAGES/wildsen_channel_image.jpg';

function App() {
  return (
    <div className="page-wrapper">
      <section className="section-one">
        <div className="shader-container">
          <MyShader />
        </div>
        <div className="text-container">
          <h1 id="logo">WILDSEN</h1>
        </div>
      </section>
      
      <section className="section-two">
        <div className="content-box">
          <h1 id="h1_upsize">LIST OF TOOLS</h1>
          <p id="p_sizeup">Here you can chose what u need use</p>
        </div>
        <div id="second_canvas">
          <div className="Block-Project">
            <p>CONVERTOR</p>
            {/* Використовуємо змінну з імпорту замість звичайного рядка */}
            <img src={convertorImg} alt="Convertor" />
            <a href='./convertor/index.html'>INACTIVE</a>
          </div>
        </div>
      </section>

      <section className="section-three">
        <div id="second_canvas">
          <div className="Block-Project">
            {/* Використовуємо змінну з імпорту замість звичайного рядка */}
            <img src={WildsenChannelImg} alt="Convertor" />
            <div>INFO</div>
          </div>
        </div>
        <div className="content-box">
          <h1 id="h1_upsize">WILDSEN | NEWS DOTA 2</h1>
          <p id="p_sizeup">MY CHANNEL</p>
        </div>
      </section>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);