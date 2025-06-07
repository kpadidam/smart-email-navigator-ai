
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export interface Email {
  id: number;
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

export const emailService = {
  async fetchEmails(): Promise<Email[]> {
    const response = await fetch(`${API_URL}/api/emails`, {
      headers: authService.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch emails');
    }
    return response.json();
  },

  async fetchEmailById(id: number): Promise<Email> {
    const response = await fetch(`${API_URL}/api/emails/${id}`, {
      headers: authService.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch email details');
    }
    return response.json();
  }
}; 
