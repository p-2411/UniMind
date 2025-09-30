import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ProtectedRoute({ children } : { children: ReactNode }) {
    const { isAuthenticated, loading } = useAuth();

   // While checking authentication status, show a loading state
  // This prevents flashing the wrong content
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  // The replace prop replaces the current history entry instead of adding a new one
  // This means clicking back won't take them to the protected page again
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If authenticated, render the protected content
  return <>{children}</>;
}