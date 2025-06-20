
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

  async syncEmails(): Promise<{ message: string; emailsSynced: number; totalFetched: number }> {
    const startTime = Date.now();
    logger.email('Starting email sync');
    
    const response = await authService.makeAuthenticatedRequest(`${API_URL}/api/emails/sync`, {
      method: 'POST',
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      logger.api(`POST /api/emails/sync → ${response.status} (${duration}ms)`, { status: response.status, duration });
      throw new Error('Failed to sync emails');
    }
    
    const data = await response.json();
    logger.email('Email sync completed', { 
      emailsSynced: data.emailsSynced, 
      totalFetched: data.totalFetched, 
      duration 
    });
    return data;
  }
}; 
