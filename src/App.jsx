import { Routes, Route } from 'react-router-dom';
import Home from '/src/pages/Home';
import Info_git_Dota from '/src/pages/Info_git_Dota';
import TailBot from '/src/pages/TailBot';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/info" element={<Info_git_Dota />} />
      <Route path="/tail-bot" element={<TailBot />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
