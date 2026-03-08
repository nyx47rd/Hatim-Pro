import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import App from './App.tsx';
import './index.css';
import {AuthProvider} from './contexts/AuthContext';

// Global Error Handler for Chunk Loading Issues
window.addEventListener('error', (e) => {
  const msg = (e.message || '').toLowerCase();
  if (msg.includes('chunk') || msg.includes('loading') || msg.includes('script error')) {
    console.warn('Chunk error detected in main.tsx, reloading...');
    window.location.reload();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  const msg = (e.reason && e.reason.message || '').toLowerCase();
  if (msg.includes('chunk')) {
    console.warn('Unhandled chunk rejection in main.tsx, reloading...');
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* @ts-ignore */}
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
