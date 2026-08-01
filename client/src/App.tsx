import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/feedback/ErrorBoundary';
import Toaster from './components/feedback/Toaster';
import AppRoutes from './routes/AppRoutes';
import { SocketProvider } from './context/SocketContext';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SocketProvider>
          {/* Main Application Routes */}
          <AppRoutes />
        </SocketProvider>
        
        {/* Toast Notification Provider */}
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
