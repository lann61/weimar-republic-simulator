import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { VisitCounter } from './components/VisitCounter';
import { BgmPlayer } from './components/BgmPlayer';
import { SfxController } from './components/SfxController';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <VisitCounter />
    <BgmPlayer />
    <SfxController />
  </React.StrictMode>
);
