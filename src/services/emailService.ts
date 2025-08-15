import { authService } from './authService';
import { logger } from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export interface Email {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  summary: string;
  fullContent: string;
  category: string;
  datetime: string | null;
  timestamp: string;
  priority: string;
  attachments?: Array<{ name: string; size: string }>;
  tags?: string[];
  status?: string;
}

export interface EmailStats {
  totalEmails: number;
  unreadEmails: number;
  categorizedEmails: number;
  pendingActions: number;
}

export interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  isPrimary: boolean;
  lastSyncAt?: string;
  createdAt?: string;
}

export interface EmailAccountsResponse {
  accounts: EmailAccount[];
}

export interface SwitchAccountResponse {
  message: string;
  activeAccount: EmailAccount;
}

export const emailService = {
  async healthCheck(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) {
      throw new Error('Backend health check failed');
    }
    return response.json();
  },
  async fetchEmails(): Promise<Email[]> {
    const startTime = Date.now();
    logger.api('GET /api/emails', { url: `${API_URL}/api/emails` });
    
    const response = await authService.makeAuthenticatedRequest(`${API_URL}/api/emails`);
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      logger.api(`GET /api/emails → ${response.status} (${duration}ms)`, { status: response.status, duration });
      throw new Error('Failed to fetch emails');
    }
    
    const data = await response.json();
    const emails = data.emails || data; // Handle both formats: {emails, total} or direct array
    logger.api(`GET /api/emails → 200 (${duration}ms)`, { emailCount: emails.length, total: data.total, duration });
    return emails;
  },

  async fetchEmailById(id: string): Promise<Email> {
    const startTime = Date.now();
    logger.api(`GET /api/emails/${id}`);
    
    const response = await authService.makeAuthenticatedRequest(`${API_URL}/api/emails/${id}`);
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      logger.api(`GET /api/emails/${id} → ${response.status} (${duration}ms)`, { status: response.status, duration });
      throw new Error('Failed to fetch email details');
    }
    
    const data = await response.json();
    logger.api(`GET /api/emails/${id} → 200 (${duration}ms)`, { duration });
    return data;
  },

  async fetchEmailStats(): Promise<EmailStats> {
    const startTime = Date.now();
    logger.api('GET /api/emails/stats');
    
    const response = await authService.makeAuthenticatedRequest(`${API_URL}/api/emails/stats`);
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      logger.api(`GET /api/emails/stats → ${response.status} (${duration}ms)`, { status: response.status, duration });
      throw new Error('Failed to fetch email statistics');
    }
    
    const data = await response.json();
    logger.api(`GET /api/emails/stats → 200 (${duration}ms)`, { stats: data, duration });
    return data;
  },

  /**
   * Sync emails from Gmail for the specified account
   */
  async syncEmails(accountId?: string): Promise<{ message: string; emailsSynced: number; totalFetched: number; accountId?: string }> {
    const startTime = Date.now();
    logger.email('Starting email sync', { accountId });
    
    const body: { accountId?: string } = {};
    if (accountId) body.accountId = accountId;
    
    const response = await authService.makeAuthenticatedRequest(`${API_URL}/api/emails/sync`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      logger.api(`POST /api/emails/sync → ${response.status} (${duration}ms)`, { status: response.status, duration, accountId });
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to sync emails: ${response.status}`);
    }
    
    const data = await response.json();
    logger.email('Email sync completed', { 
      emailsSynced: data.emailsSynced, 
      totalFetched: data.totalFetched, 
      accountId: data.accountId,
      duration 
    });
    return data;
  },

  /**
   * Get all email accounts for the authenticated user
   */
  async getEmailAccounts(): Promise<EmailAccountsResponse> {
    const response = await fetch(`${API_URL}/api/emails/accounts`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      authService.handleAuthError(response);
      throw new Error(`Failed to fetch email accounts: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Switch to a different email account
   */
  async switchAccount(accountId: string): Promise<SwitchAccountResponse> {
    const response = await fetch(`${API_URL}/api/emails/accounts/switch`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ accountId }),
    });

    if (!response.ok) {
      authService.handleAuthError(response);
      throw new Error(`Failed to switch account: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Add a new email account (initiate OAuth flow)
   */
  async addEmailAccount(userId: string): Promise<{ authUrl: string }> {
    const response = await fetch(`${API_URL}/api/auth/add-account/google?userId=${userId}`, {
      method: 'GET',
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to initiate add account flow: ${response.status}`);
    }

    const data = await response.json();
    return data;
  },

  /**
   * Get emails with filtering options
   */
  async getEmails(filters: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    accountId?: string;
  } = {}): Promise<{ emails: Email[]; total: number }> {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.accountId) params.append('accountId', filters.accountId);

    const response = await fetch(`${API_URL}/api/emails?${params}`, {
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      authService.handleAuthError(response);
      throw new Error(`Failed to fetch emails: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Get email statistics
   */
  async getStats(accountId?: string): Promise<EmailStats> {
    const params = new URLSearchParams();
    if (accountId) params.append('accountId', accountId);

    const response = await fetch(`${API_URL}/api/emails/stats?${params}`, {
      headers: authService.getAuthHeaders(),
    });

    if (!response.ok) {
      authService.handleAuthError(response);
      throw new Error(`Failed to fetch email stats: ${response.status}`);
    }

    return response.json();
  },


}; 
