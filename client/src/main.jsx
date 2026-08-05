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
          background: '#0A1526',
          color: '#FFFFFF',
          border: '1px solid rgba(11, 107, 216, 0.40)',
          borderRadius: '0',
          padding: '16px',
          fontSize: '14px',
          fontFamily: "'Archivo', system-ui, sans-serif",
        },
        success: {
          iconTheme: {
            primary: '#0A8046',
            secondary: '#FFFFFF',
          },
        },
        error: {
          iconTheme: {
            primary: '#D62839',
            secondary: '#FFFFFF',
          },
        },
      }}
    />
  </StrictMode>
);