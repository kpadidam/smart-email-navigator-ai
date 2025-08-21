// Smart Email Navigator AI - Frontend Application
class EmailApp {
    constructor() {
        this.currentUser = null;
        this.emails = [];
        this.selectedEmail = null;
        this.selectedCategory = 'all';
        this.token = localStorage.getItem('auth_token');
        
        this.init();
    }

    init() {
        // Check if user is authenticated
        if (this.token) {
            this.showMainScreen();
            this.loadUserData();
            this.loadEmails();
            this.loadStats();
        } else {
            this.showLoginScreen();
        }

        this.attachEventListeners();
    }

    attachEventListeners() {
        // Login
        document.getElementById('googleLoginBtn').addEventListener('click', () => this.handleGoogleLogin());
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Sync
        document.getElementById('syncBtn').addEventListener('click', () => this.syncEmails());
        
        // Categories
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => this.selectCategory(e.target.dataset.category));
        });
        
        // Sort
        document.getElementById('sortSelect').addEventListener('change', (e) => this.sortEmails(e.target.value));
        
        // Mobile menu
        document.getElementById('menuToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        // Close sidebar when clicking overlay
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    // Authentication
    async handleGoogleLogin() {
        try {
            const response = await fetch('/api/auth/google');
            const data = await response.json();
            
            if (data.authUrl) {
                window.location.href = data.authUrl;
            }
        } catch (error) {
            this.showToast('Failed to initiate Google login', 'error');
        }
    }


    handleLogout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        this.token = null;
        this.currentUser = null;
        this.showLoginScreen();
        this.showToast('Logged out successfully', 'success');
    }

    // Screen Management
    showLoginScreen() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('mainScreen').classList.remove('active');
    }

    showMainScreen() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('mainScreen').classList.add('active');
    }

    // User Data
    loadUserData() {
        const userData = localStorage.getItem('user_data');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUserUI();
        }
    }

    updateUserUI() {
        if (this.currentUser) {
            document.getElementById('userEmail').textContent = this.currentUser.email;
            document.getElementById('userAvatar').src = this.currentUser.picture || this.generateAvatar(this.currentUser.name);
        }
    }

    generateAvatar(name) {
        // Generate a simple avatar with initials
        const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
        // Return a data URL or placeholder
        return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="%23667eea"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="14">${initials}</text></svg>`;
    }

    // Email Operations
    async loadEmails() {
        try {
            const response = await fetch('/api/emails', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.emails = await response.json();
                this.renderEmails();
                this.updateCategoryCounts();
            } else if (response.status === 401) {
                this.handleLogout();
            }
        } catch (error) {
            this.showToast('Failed to load emails', 'error');
        }
    }

    async syncEmails() {
        const syncBtn = document.getElementById('syncBtn');
        syncBtn.disabled = true;
        syncBtn.textContent = '⏳ Syncing...';

        try {
            const response = await fetch('/api/emails/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.showToast(`Synced ${result.emailsSynced} emails`, 'success');
                await this.loadEmails();
                await this.loadStats();
            }
        } catch (error) {
            this.showToast('Sync failed', 'error');
        } finally {
            syncBtn.disabled = false;
            syncBtn.textContent = '🔄 Sync';
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/emails/stats', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const stats = await response.json();
                document.getElementById('statTotal').textContent = stats.totalEmails;
                document.getElementById('statUnread').textContent = stats.unreadEmails;
                document.getElementById('statCategorized').textContent = stats.categorizedEmails;
                
                // Update category counts from loaded emails
                this.updateCategoryCounts();
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }
    
    updateCategoryCounts() {
        // Count emails by category
        const categoryCounts = {
            'Meetings': 0,
            'Deliveries': 0,
            'Important': 0,
            'Phishing/Spam/Scam': 0
        };
        
        this.emails.forEach(email => {
            if (email.category && categoryCounts.hasOwnProperty(email.category)) {
                categoryCounts[email.category]++;
            }
        });
        
        // Update UI counts
        document.getElementById('meetingsCount').textContent = categoryCounts['Meetings'];
        document.getElementById('deliveriesCount').textContent = categoryCounts['Deliveries'];
        document.getElementById('importantCount').textContent = categoryCounts['Important'];
        document.getElementById('threatsCount').textContent = categoryCounts['Phishing/Spam/Scam'];
        
        // Update inbox count (total unread)
        const unreadCount = this.emails.filter(e => e.status === 'unread').length;
        document.getElementById('inboxCount').textContent = unreadCount;
    }

    renderEmails() {
        const emailList = document.getElementById('emailList');
        const filteredEmails = this.filterEmails();
        
        if (filteredEmails.length === 0) {
            emailList.innerHTML = '<div class="no-emails">No emails found</div>';
            return;
        }

        emailList.innerHTML = filteredEmails.map(email => `
            <div class="email-item" data-id="${email.id}">
                <div class="email-avatar">${this.getInitials(email.sender)}</div>
                <div class="email-content">
                    <div class="email-header">
                        <span class="email-sender">${email.sender}</span>
                        <span class="email-time">${this.formatTime(email.timestamp)}</span>
                    </div>
                    <div class="email-subject">${email.subject}</div>
                    <div class="email-preview">${email.summary || email.fullContent.substring(0, 100)}...</div>
                    <div class="email-meta">
                        ${email.category ? `<span class="email-badge badge-category">${email.category}</span>` : ''}
                        <span class="email-badge badge-priority-${email.priority}">${email.priority}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click listeners
        document.querySelectorAll('.email-item').forEach(item => {
            item.addEventListener('click', () => this.selectEmail(item.dataset.id));
        });
    }

    filterEmails() {
        let filtered = [...this.emails];
        
        // Filter by category
        if (this.selectedCategory !== 'all') {
            filtered = filtered.filter(email => {
                // Exact match for new categories (case-sensitive)
                if (email.category === this.selectedCategory) {
                    return true;
                }
                // Fallback for lowercase legacy categories
                if (email.category && email.category.toLowerCase() === this.selectedCategory.toLowerCase()) {
                    return true;
                }
                return false;
            });
        }

        // Filter by search
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(email => 
                email.subject.toLowerCase().includes(searchTerm) ||
                email.sender.toLowerCase().includes(searchTerm) ||
                email.fullContent.toLowerCase().includes(searchTerm)
            );
        }

        return filtered;
    }

    selectCategory(category) {
        this.selectedCategory = category;
        
        // Update UI
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.category === category) {
                item.classList.add('active');
            }
        });
        
        // Update title with new categories
        const titles = {
            'all': 'All Emails',
            'Meetings': 'Meeting Invitations',
            'Deliveries': 'Package Deliveries',
            'Important': 'Important Emails',
            'Phishing/Spam/Scam': 'Threats Blocked',
            // Legacy categories (if any exist in DB)
            'work': 'Work Emails',
            'personal': 'Personal Emails',
            'promotions': 'Promotions'
        };
        document.getElementById('categoryTitle').textContent = titles[category] || 'Emails';
        
        this.renderEmails();
        
        // Close sidebar on mobile after selection
        if (window.innerWidth <= 768) {
            this.closeSidebar();
        }
    }

    async selectEmail(emailId) {
        // Update UI
        document.querySelectorAll('.email-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.id === emailId) {
                item.classList.add('active');
            }
        });

        try {
            const response = await fetch(`/api/emails/${emailId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const email = await response.json();
                this.selectedEmail = email;
                this.renderEmailDetail(email);
                
                // Show detail view on mobile/tablet
                if (window.innerWidth <= 1024) {
                    this.showEmailDetail();
                }
            }
        } catch (error) {
            this.showToast('Failed to load email details', 'error');
        }
    }

    renderEmailDetail(email) {
        const detailContainer = document.getElementById('emailDetail');
        
        detailContainer.innerHTML = `
            <div class="detail-header">
                <h2 class="detail-subject">${email.subject}</h2>
                <div class="detail-sender">
                    <div class="detail-avatar email-avatar">${this.getInitials(email.sender)}</div>
                    <div class="sender-info">
                        <div class="sender-name">${email.sender}</div>
                        <div class="sender-email">${email.senderEmail}</div>
                    </div>
                </div>
                <div class="detail-time">${this.formatFullDate(email.timestamp)}</div>
            </div>
            <div class="detail-body">${email.fullContent}</div>
            ${email.attachments && email.attachments.length > 0 ? `
                <div class="attachments">
                    <h4>Attachments</h4>
                    ${email.attachments.map(att => `
                        <div class="attachment-item">📎 ${att.name} (${att.size})</div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    sortEmails(sortBy) {
        switch(sortBy) {
            case 'date':
                this.emails.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                break;
            case 'sender':
                this.emails.sort((a, b) => a.sender.localeCompare(b.sender));
                break;
            case 'subject':
                this.emails.sort((a, b) => a.subject.localeCompare(b.subject));
                break;
            case 'priority':
                const priorityOrder = { high: 0, medium: 1, low: 2, normal: 3 };
                this.emails.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
                break;
        }
        this.renderEmails();
    }

    handleSearch(searchTerm) {
        this.renderEmails();
    }

    // Utility Functions
    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    formatFullDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    // Mobile Navigation
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Prevent body scroll when sidebar is open
        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
    
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    handleResize() {
        // Close sidebar on resize to desktop
        if (window.innerWidth > 768) {
            this.closeSidebar();
        }
        
        // Adjust email detail view for tablets
        if (window.innerWidth > 768 && window.innerWidth <= 1024) {
            const detail = document.getElementById('emailDetail');
            if (detail && this.selectedEmail) {
                detail.classList.add('active');
            }
        }
    }
    
    // Mobile Email Detail
    showEmailDetail() {
        const detail = document.getElementById('emailDetail');
        if (window.innerWidth <= 1024) {
            detail.classList.add('active');
            
            // Add close button for mobile
            if (!detail.querySelector('.detail-close')) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'detail-close';
                closeBtn.innerHTML = '← Back';
                closeBtn.onclick = () => this.closeEmailDetail();
                detail.insertBefore(closeBtn, detail.firstChild);
            }
        }
    }
    
    closeEmailDetail() {
        const detail = document.getElementById('emailDetail');
        detail.classList.remove('active');
    }
}

// Handle OAuth callback
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
        console.error('OAuth error:', error);
        alert('Authentication failed: ' + error);
        window.location.href = '/';
    } else if (code) {
        // Show loading message
        document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;"><div>Authenticating...</div></div>';
        
        // Exchange code for token
        fetch('/api/auth/google/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Authentication failed');
            }
            return response.json();
        })
        .then(data => {
            if (data.access_token) {
                localStorage.setItem('auth_token', data.access_token);
                localStorage.setItem('user_data', JSON.stringify(data.user));
                window.location.href = '/';
            }
        })
        .catch(error => {
            console.error('OAuth callback failed:', error);
            alert('Authentication failed. Please try again.');
            window.location.href = '/';
        });
    } else {
        // Initialize the app
        new EmailApp();
    }
});