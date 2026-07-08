import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && (e.reason.message === 'Failed to fetch' || e.reason.message?.includes('fetch') || e.reason.message === 'Load failed' || e.reason.message?.includes('Load failed'))) {
    e.preventDefault();
  }
});

window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('Load failed'))) {
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
