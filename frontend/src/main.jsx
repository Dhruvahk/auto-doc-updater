import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#1c2030',
          color: '#f1f5f9',
          border: '0.5px solid rgba(255,255,255,0.1)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px'
        }
      }}
    />
  </React.StrictMode>
);
