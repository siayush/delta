import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { TooltipProvider } from '@/components/ui/tooltip';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </React.StrictMode>
);
