import React from 'react';
import ReactDOM from 'react-dom/client';
import MyShader from './shaders'; 

import './fonts/BespokeStencil_Complete/Fonts/WEB/css/bespoke-stencil.css';
import './style.css'; 

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
          <div className='Block-Project'>
            <p>СONVERTOR</p>
            <img src="./IMAGES/Convertor.webp" alt="UPS!" />
            <div>INACTIVE</div>
          </div>
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