import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface GlobalLoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export const GlobalLoadingProvider: React.FC<GlobalLoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [activeRequests, setActiveRequests] = useState(0);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
    if (!loading) {
      setLoadingMessage('Loading...');
    }
  };

  const updateLoadingMessage = (message: string) => {
    setLoadingMessage(message);
  };

  useEffect(() => {
    // Request interceptor
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        setActiveRequests(prev => {
          const newCount = prev + 1;
          if (newCount === 1) {
            setIsLoading(true);
            // Set loading message based on request
            if (config.url?.includes('/auth/')) {
              updateLoadingMessage('Authenticating...');
            } else if (config.url?.includes('/emails/sync')) {
              updateLoadingMessage('Syncing emails...');
            } else if (config.url?.includes('/emails/')) {
              updateLoadingMessage('Loading emails...');
            } else if (config.url?.includes('/admin/')) {
              updateLoadingMessage('Loading admin data...');
            } else {
              updateLoadingMessage('Loading...');
            }
          }
          return newCount;
        });
        return config;
      },
      (error) => {
        setActiveRequests(prev => {
          const newCount = Math.max(0, prev - 1);
          if (newCount === 0) {
            setIsLoading(false);
          }
          return newCount;
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        setActiveRequests(prev => {
          const newCount = Math.max(0, prev - 1);
          if (newCount === 0) {
            setIsLoading(false);
          }
          return newCount;
        });
        return response;
      },
      (error) => {
        setActiveRequests(prev => {
          const newCount = Math.max(0, prev - 1);
          if (newCount === 0) {
            setIsLoading(false);
          }
          return newCount;
        });
        return Promise.reject(error);
      }
    );

    // Cleanup interceptors on unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  return (
    <GlobalLoadingContext.Provider
      value={{
        isLoading,
        loadingMessage,
        setLoading,
        setLoadingMessage: updateLoadingMessage,
      }}
    >
      {children}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white py-2 px-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            <span className="text-sm font-medium">{loadingMessage}</span>
          </div>
        </div>
      )}
    </GlobalLoadingContext.Provider>
  );
};

export const useGlobalLoading = (): GlobalLoadingContextType => {
  const context = useContext(GlobalLoadingContext);
  if (context === undefined) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
}; 