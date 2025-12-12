import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('SmashMaster Application Starting...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("FATAL: Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('React root rendered successfully.');
} catch (error) {
  console.error('Error rendering React app:', error);
}