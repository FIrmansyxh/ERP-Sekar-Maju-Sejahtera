import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { DialogHost } from './components/common/DialogHost';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary area="aplikasi">
      <App />
    </ErrorBoundary>
    <DialogHost />
  </StrictMode>,
);
