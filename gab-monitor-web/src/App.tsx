// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Principal } from './pages/Principal';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Principal />} />
        <Route path="*" element={<Principal />} />
      </Routes>
    </BrowserRouter>
  );
}
