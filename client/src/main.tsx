import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { primeDefaultAirQuality } from './services/api';
import { DEFAULT_LOCATION } from './constants/locations';

primeDefaultAirQuality({
  latitude: DEFAULT_LOCATION.latitude,
  longitude: DEFAULT_LOCATION.longitude,
  city: DEFAULT_LOCATION.name
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
