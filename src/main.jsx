import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { FluentProvider, createLightTheme } from '@fluentui/react-components';
import { AuthProvider } from './context/AuthContext';
import App from './App';

const mondayTheme = createLightTheme({
  10: '#030305', 20: '#0d0d2a', 30: '#141445', 40: '#1a1a5f',
  50: '#21217a', 60: '#272796', 70: '#2e2eb3', 80: '#3535cf',
  90: '#3d3de8', 100: '#4a4af0', 110: '#5959f3', 120: '#6a6af5',
  130: '#7c7cf7', 140: '#9090f9', 150: '#a7a7fb', 160: '#c0c0fc',
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FluentProvider theme={mondayTheme}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </FluentProvider>
  </React.StrictMode>
);
