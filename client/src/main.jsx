import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#232755',
          color: '#F4F3FC',
          border: '1px solid rgba(192, 144, 63, 0.25)',
          borderRadius: '10px',
          padding: '16px',
          fontSize: '14px',
          fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        },
        success: {
          iconTheme: {
            primary: '#C0903F',
            secondary: '#181B3D',
          },
        },
        error: {
          iconTheme: {
            primary: '#C1503A',
            secondary: '#fff',
          },
        },
      }}
    />
  </StrictMode>
);