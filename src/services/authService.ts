import { logger } from '../utils/logger';

// In production, use relative URLs since frontend and backend are served from same origin
const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:5001' : '');

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load token and user from localStorage on initialization
    this.token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
  }

  async initiateGoogleOAuth(): Promise<void> {
    try {
      logger.auth('Initiating Google OAuth', { apiUrl: `${API_URL}/api/auth/google` });
      
      // Get the OAuth URL from the backend
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OAuth URL request failed', { status: response.status, error: errorText });
        throw new Error(`Failed to get OAuth URL: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      logger.auth('OAuth URL received, redirecting to Google');
      
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      logger.error('Error initiating Google OAuth', { error });
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(`Cannot connect to backend server at ${API_URL}. Please ensure the backend is running on port 5001.`);
      }
      throw error;
    }
  }

  async handleOAuthCallback(code: string): Promise<AuthResponse> {
    try {
      logger.auth('Handling OAuth callback', { hasCode: !!code });
      
      const response = await fetch(`${API_URL}/api/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        logger.error('OAuth callback failed', { status: response.status });
        throw new Error('OAuth callback failed');
      }

      const authData: AuthResponse = await response.json();
      
      // Store token and user data
      this.token = authData.token;
      this.user = authData.user;
      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));

      logger.auth('User logged in successfully', { email: authData.user.email });

      return authData;
    } catch (error) {
      logger.error('Error handling OAuth callback', { error });
      throw error;
    }
  }

  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  /**
   * Force clear all authentication data (useful for debugging)
   */
  clearAuthData(): void {
    logger.auth('Clearing all authentication data');
    this.logout();
  }

  /**
   * Set authentication data (used for OAuth callback handling)
   */
  setAuthData(token: string, user: User): void {
    logger.auth('Setting authentication data', { 
      email: user.email, 
      tokenPrefix: token.substring(0, 20) + '...',
      tokenLength: token.length
    });
    this.token = token;
    this.user = user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    logger.auth('Authentication data set successfully', { email: user.email });
  }

  /**
   * Refresh authentication state from localStorage
   */
  refreshAuthState(): void {
    this.token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
        this.user = null;
      }
    } else {
      this.user = null;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    // If internal state is null, try refreshing from localStorage
    if (!this.token || !this.user) {
      this.refreshAuthState();
    }
    return !!this.token && !!this.user;
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Handle authentication errors by clearing invalid tokens
   */
  handleAuthError(response: Response): void {
    if (response.status === 401) {
      logger.auth('Authentication failed, clearing tokens', { status: response.status });
      this.logout();
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  /**
   * Make an authenticated API request with automatic error handling
   */
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Debug logging
    logger.auth('Making authenticated request', { 
      url, 
      hasToken: !!this.token, 
      tokenPrefix: this.token ? this.token.substring(0, 20) + '...' : 'none',
      hasUser: !!this.user 
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    logger.auth('Request response', { 
      url, 
      status: response.status, 
      statusText: response.statusText 
    });

    // Handle authentication errors
    if (response.status === 401) {
      logger.auth('401 Authentication error - clearing tokens and redirecting', { 
        url,
        hadToken: !!this.token,
        hadUser: !!this.user
      });
      this.handleAuthError(response);
      throw new Error('Authentication required. Please log in again.');
    }

    return response;
  }
}

export const authService = new AuthService();
