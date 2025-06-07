const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      console.log('Attempting to connect to:', `${API_URL}/api/auth/google`);
      
      // Get the OAuth URL from the backend
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OAuth URL request failed:', response.status, errorText);
        throw new Error(`Failed to get OAuth URL: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error initiating Google OAuth:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(`Cannot connect to backend server at ${API_URL}. Please ensure the backend is running.`);
      }
      throw error;
    }
  }

  async handleOAuthCallback(code: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/api/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('OAuth callback failed');
      }

      const authData: AuthResponse = await response.json();
      
      // Store token and user data
      this.token = authData.token;
      this.user = authData.user;
      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));

      return authData;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      throw error;
    }
  }

  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
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
}

export const authService = new AuthService();
