import React from 'react';
import ReactDOM from 'react-dom/client';
import MyShader from './shaders'; 

import './style.css'; 

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      <MyShader />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);