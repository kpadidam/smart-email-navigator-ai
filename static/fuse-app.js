// Fuse Material Design - Email Application JavaScript

class FuseMailApp {
    constructor() {
        this.accounts = this.loadAccounts();
        this.currentAccountIndex = parseInt(localStorage.getItem('current_account_index') || '0');
        this.currentUser = this.accounts[this.currentAccountIndex] || null;
        this.emails = [];
        this.selectedEmail = null;
        this.selectedFolder = 'inbox';
        this.token = this.currentUser?.token || localStorage.getItem('auth_token');
        
        // Mock data for demo
        this.mockEmails = [
            {
                id: '1',
                sender: 'Maya Dudley',
                senderEmail: 'maya@example.com',
                subject: 'Quote for a new web design project',
                preview: 'Please review and sign the attached e-document.',
                fullContent: 'Hi Brian,\n\nPlease review and sign the attached e-document.\n\nImpsum deserunt deserunt quis eiusmod. Laborum sint labore officia mollit voluplate velit dolore quis commodo dolore...',
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                status: 'unread',
                avatar: 'MD',
                avatarColor: 'avatar-purple'
            },
            {
                id: '2',
                sender: 'Brian Hughes',
                senderEmail: 'brian@example.com',
                subject: 'Delivery address confirmation',
                preview: 'Dear Brian, Dolore consectetur est cupidatat cupidatat enim reprehenderit dolor ea veniam dolor.',
                fullContent: 'Dear Brian,\n\nDolore consectetur est cupidatat cupidatat enim reprehenderit dolor ea veniam dolor et nisi. Consectetur deserunt laborum sit sint.',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                status: 'read',
                avatar: 'BH',
                avatarColor: 'avatar-blue'
            },
            {
                id: '3',
                sender: 'Sanders Beck',
                senderEmail: 'sanders@example.com',
                subject: 'Insurance documents',
                preview: 'Hi Brian, Please ipsum dolor sit amet.',
                fullContent: 'Hi Brian,\n\nPlease ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                status: 'read',
                avatar: 'SB',
                avatarColor: 'avatar-green'
            },
            {
                id: '4',
                sender: 'Zimmerman Gould',
                senderEmail: 'zimmerman@example.com',
                subject: 'Previous clients and their invoices',
                preview: 'Dear Brian, Do aute eu dolore officia dolore laboris in id elit ipsum...',
                fullContent: 'Dear Brian,\n\nDo aute eu dolore officia dolore laboris in id elit ipsum. Elit Lorem aute occaecat occaecat non incididunt velit nulla.',
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                status: 'read',
                avatar: 'ZG',
                avatarColor: 'avatar-yellow'
            },
            {
                id: '5',
                sender: 'Karina Alford',
                senderEmail: 'karina@example.com',
                subject: 'Quote for a new web design project',
                preview: 'Hey Brian, this officia aliqua ex nino cupidatat...',
                fullContent: 'Hey Brian,\n\nThis officia aliqua ex nino cupidatat tempor dolore quis commodo dolore quis officia id fugiat.',
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                status: 'unread',
                avatar: 'KA',
                avatarColor: 'avatar-red',
                hasAttachment: true
            },
            {
                id: '6',
                sender: 'Rice Cash',
                senderEmail: 'rice@example.com',
                subject: 'Ipsum laborum minim quis labore in',
                preview: 'Dear Brian, Labore non est et aute sint mollit voluptate velit dolore magna...',
                fullContent: 'Dear Brian,\n\nLabore non est et aute sint mollit voluptate velit dolore magna fugiat ex nisi eiusmod culpa cillum.',
                timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                status: 'read',
                avatar: 'RC',
                avatarColor: 'avatar-pink',
                hasAttachment: true
            },
            {
                id: '7',
                sender: 'Elaine Ortiz',
                senderEmail: 'elaine@example.com',
                subject: 'Ipsum fugiat ad deserunt cilum sunt fugiat',
                preview: 'Hello Brian, Id Lorem laborum eiusmod eiusmod mollit magna...',
                fullContent: 'Hello Brian,\n\nId Lorem laborum eiusmod eiusmod mollit magna labore. Et commodo officia fugiat...',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                status: 'read',
                avatar: 'EO',
                avatarColor: 'avatar-indigo'
            },
            {
                id: '8',
                sender: 'Fleming Stone',
                senderEmail: 'fleming@example.com',
                subject: 'Deserunt exercitation ut nulla est Lorem',
                preview: 'Hi Brian, Est labore sunt sunt Lorem dolore. In excepteur esse...',
                fullContent: 'Hi Brian,\n\nEst labore sunt sunt Lorem dolore. In excepteur esse proident ut consectetur dolore...',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'read',
                avatar: 'FS',
                avatarColor: 'avatar-teal'
            },
            {
                id: '9',
                sender: 'England Wiley',
                senderEmail: 'england@example.com',
                subject: 'Minim do reprehenderit dolor ipsum officia',
                preview: 'Dear Brian, Ad do minim ut ad ad est reprehenderit...',
                fullContent: 'Dear Brian,\n\nAd do minim ut ad ad est reprehenderit labore do occaecat fugiat ut laboris cupidatat nure id dolor deseruct nisi et aute ex...',
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'read',
                avatar: 'EW',
                avatarColor: 'avatar-blue'
            },
            {
                id: '10',
                sender: 'Carla Gray',
                senderEmail: 'carla@example.com',
                subject: 'Nulla culpa consectetur aute ex eu nulla ipsum',
                preview: 'Hey Brian, Do pariatur occaecat tempor duis. Aute occaecat...',
                fullContent: 'Hey Brian,\n\nDo pariatur occaecat tempor duis. Aute occaecat non consequat sit occaecat sint. Aute occaecat mollit quis id...',
                timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'read',
                avatar: 'CG',
                avatarColor: 'avatar-green'
            }
        ];
        
        this.init();
    }

    init() {
        if (this.token) {
            this.showMainScreen();
            this.updateAccountsUI();
            this.loadEmails();
        } else {
            this.showLoginScreen();
        }

        this.attachEventListeners();
    }

    loadAccounts() {
        const accounts = localStorage.getItem('user_accounts');
        if (accounts) {
            return JSON.parse(accounts);
        }
        
        // Migrate old single account format
        const userData = localStorage.getItem('user_data');
        const token = localStorage.getItem('auth_token');
        if (userData && token) {
            const user = JSON.parse(userData);
            const account = { ...user, token };
            localStorage.setItem('user_accounts', JSON.stringify([account]));
            return [account];
        }
        
        return [];
    }

    saveAccounts() {
        localStorage.setItem('user_accounts', JSON.stringify(this.accounts));
        localStorage.setItem('current_account_index', this.currentAccountIndex.toString());
    }

    attachEventListeners() {
        // Login
        const loginBtn = document.getElementById('googleLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

        // Menu toggle
        const menuBtn = document.getElementById('menuBtn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Compose button
        const composeBtn = document.getElementById('composeBtn');
        if (composeBtn) {
            composeBtn.addEventListener('click', () => this.openCompose());
        }

        // User avatar dropdown
        const userAvatarBtn = document.getElementById('userAvatarBtn');
        if (userAvatarBtn) {
            userAvatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserDropdown();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            const dropdown = document.getElementById('userDropdown');
            if (dropdown && dropdown.classList.contains('active')) {
                dropdown.classList.remove('active');
            }
        });

        // Folder navigation
        document.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectFolder(item.dataset.folder);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCompose();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.openCompose();
            }
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
            this.showToast('Failed to initiate login', 'error');
        }
    }

    toggleUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        dropdown.classList.toggle('active');
        
        if (dropdown.classList.contains('active')) {
            this.updateAccountsUI();
        }
    }

    updateAccountsUI() {
        // Update avatar
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar && this.currentUser) {
            userAvatar.src = this.currentUser.picture || this.generateAvatar(this.currentUser.name);
        }

        // Update dropdown current account
        const currentAccount = document.getElementById('currentAccount');
        if (currentAccount && this.currentUser) {
            currentAccount.innerHTML = `
                <div class="account-avatar">
                    <img src="${this.currentUser.picture || this.generateAvatar(this.currentUser.name)}" alt="${this.currentUser.name}">
                </div>
                <div class="account-info">
                    <div class="account-name">${this.currentUser.name}</div>
                    <div class="account-email">${this.currentUser.email}</div>
                </div>
            `;
        }

        // Update accounts list
        const accountsList = document.getElementById('accountsList');
        if (accountsList && this.accounts.length > 1) {
            accountsList.innerHTML = this.accounts.map((account, index) => `
                <button class="account-item ${index === this.currentAccountIndex ? 'active' : ''}" 
                        onclick="app.switchAccount(${index})">
                    <div class="account-avatar">
                        <img src="${account.picture || this.generateAvatar(account.name)}" alt="${account.name}">
                    </div>
                    <div class="account-info">
                        <div class="account-name">${account.name}</div>
                        <div class="account-email">${account.email}</div>
                    </div>
                </button>
            `).join('');
            accountsList.style.display = 'block';
        } else {
            accountsList.style.display = 'none';
        }
    }

    switchAccount(index) {
        if (index === this.currentAccountIndex) {
            this.toggleUserDropdown();
            return;
        }

        this.currentAccountIndex = index;
        this.currentUser = this.accounts[index];
        this.token = this.currentUser.token;
        
        // Save current account
        this.saveAccounts();
        
        // Update UI
        this.updateAccountsUI();
        this.toggleUserDropdown();
        
        // Reload emails for new account
        this.emails = [];
        this.selectedEmail = null;
        this.loadEmails();
        
        this.showToast(`Switched to ${this.currentUser.email}`);
    }

    async addAccount() {
        // Close dropdown
        this.toggleUserDropdown();
        
        // Initiate new Google login
        try {
            const response = await fetch('/api/auth/google');
            const data = await response.json();
            
            if (data.authUrl) {
                // Store flag to indicate we're adding account
                localStorage.setItem('adding_account', 'true');
                window.location.href = data.authUrl;
            }
        } catch (error) {
            this.showToast('Failed to add account', 'error');
        }
    }

    handleLogout() {
        if (confirm(`Sign out from ${this.currentUser?.email}?`)) {
            // Remove current account
            this.accounts.splice(this.currentAccountIndex, 1);
            
            if (this.accounts.length > 0) {
                // Switch to first remaining account
                this.currentAccountIndex = 0;
                this.currentUser = this.accounts[0];
                this.token = this.currentUser.token;
                this.saveAccounts();
                this.updateAccountsUI();
                this.loadEmails();
                this.showToast('Account removed');
            } else {
                // No accounts left, clear everything
                localStorage.clear();
                this.token = null;
                this.currentUser = null;
                this.showLoginScreen();
            }
        }
    }

    // Screen management
    showLoginScreen() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('mainScreen').classList.remove('active');
    }

    showMainScreen() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('mainScreen').classList.add('active');
    }


    generateAvatar(name) {
        const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
        return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="%236366f1"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Inter" font-size="14" font-weight="600">${initials}</text></svg>`;
    }

    // Email operations
    async loadEmails() {
        // Clear existing emails when switching accounts
        const emailList = document.getElementById('emailList');
        if (emailList) {
            emailList.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading emails for ${this.currentUser?.email || 'your account'}...</p>
                </div>
            `;
        }

        try {
            const response = await fetch('/api/emails', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const apiEmails = await response.json();
                // Merge API emails with mock data for demo
                this.emails = apiEmails.length > 0 ? apiEmails : this.mockEmails;
            } else {
                // Use mock data if API fails
                this.emails = this.mockEmails;
            }
            
            this.renderEmailList();
            this.updateFolderCounts();
        } catch (error) {
            // Use mock data on error
            this.emails = this.mockEmails;
            this.renderEmailList();
            this.updateFolderCounts();
        }
    }

    renderEmailList() {
        const emailList = document.getElementById('emailList');
        const filteredEmails = this.filterEmailsByFolder();
        
        if (filteredEmails.length === 0) {
            emailList.innerHTML = `
                <div class="loading-state">
                    <span class="material-icons">inbox</span>
                    <p>No emails in ${this.selectedFolder}</p>
                </div>
            `;
            return;
        }

        emailList.innerHTML = filteredEmails.map(email => `
            <div class="email-item ${email.status === 'unread' ? 'unread' : ''}" data-id="${email.id}">
                <div class="email-header">
                    <div class="email-avatar ${email.avatarColor || this.getRandomAvatarColor()}">
                        ${email.avatar || this.getInitials(email.sender)}
                    </div>
                    <div class="email-content">
                        <div class="email-sender">${email.sender}</div>
                        <div class="email-subject">
                            ${email.subject}
                            ${email.hasAttachment ? '<span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-left: 4px;">attach_file</span>' : ''}
                        </div>
                        <div class="email-preview">${email.preview || email.summary || ''}</div>
                    </div>
                    <div class="email-time">${this.formatTime(email.timestamp)}</div>
                </div>
            </div>
        `).join('');

        // Add click listeners
        document.querySelectorAll('.email-item').forEach(item => {
            item.addEventListener('click', () => this.selectEmail(item.dataset.id));
        });
    }

    filterEmailsByFolder() {
        switch (this.selectedFolder) {
            case 'inbox':
                return this.emails.filter(e => !['sent', 'draft', 'spam', 'trash'].includes(e.status));
            case 'sent':
                return this.emails.filter(e => e.status === 'sent');
            case 'drafts':
                return this.emails.filter(e => e.status === 'draft');
            case 'spam':
                return this.emails.filter(e => e.status === 'spam');
            case 'trash':
                return this.emails.filter(e => e.status === 'trash' || e.status === 'deleted');
            default:
                return this.emails;
        }
    }

    selectFolder(folder) {
        if (!folder) return;
        
        this.selectedFolder = folder;
        
        // Update UI
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.folder === folder) {
                item.classList.add('active');
            }
        });
        
        this.renderEmailList();
        this.clearEmailSelection();
    }

    async selectEmail(emailId) {
        // Update selection UI
        document.querySelectorAll('.email-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.id === emailId) {
                item.classList.add('active');
                item.classList.remove('unread');
            }
        });

        // Find email in our data
        let email = this.emails.find(e => e.id === emailId);
        
        if (!email) {
            // Try to fetch from API if not in local data
            try {
                const response = await fetch(`/api/emails/${emailId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (response.ok) {
                    email = await response.json();
                }
            } catch (error) {
                console.error('Failed to load email:', error);
            }
        }

        if (email) {
            this.selectedEmail = email;
            this.renderEmailDetail(email);
        }
    }

    renderEmailDetail(email) {
        const detailContainer = document.getElementById('emailDetailContainer');
        
        detailContainer.innerHTML = `
            <div class="email-detail">
                <div class="email-detail-header">
                    <div class="email-detail-subject">${email.subject}</div>
                    <div class="email-detail-meta">
                        <div class="sender-avatar ${email.avatarColor || this.getRandomAvatarColor()}">
                            ${email.avatar || this.getInitials(email.sender)}
                        </div>
                        <div class="sender-info">
                            <div class="sender-name">${email.sender}</div>
                            <div class="sender-email">${email.senderEmail}</div>
                        </div>
                        <div class="email-date">${this.formatFullDate(email.timestamp)}</div>
                    </div>
                </div>
                <div class="email-detail-actions">
                    <button class="btn btn-secondary" onclick="app.replyToEmail()">
                        <span class="material-icons" style="font-size: 18px;">reply</span>
                        Reply
                    </button>
                    <button class="btn btn-secondary" onclick="app.replyAllToEmail()">
                        <span class="material-icons" style="font-size: 18px;">reply_all</span>
                        Reply All
                    </button>
                    <button class="btn btn-secondary" onclick="app.forwardEmail()">
                        <span class="material-icons" style="font-size: 18px;">forward</span>
                        Forward
                    </button>
                </div>
                <div class="email-detail-body">
                    ${email.fullContent.replace(/\n/g, '<br>')}
                    ${email.hasAttachment ? `
                        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-light);">
                            <h4 style="margin-bottom: 12px;">Attachments</h4>
                            <div style="display: flex; gap: 12px;">
                                <div style="padding: 12px 16px; background: var(--bg-secondary); border-radius: 8px; display: inline-flex; align-items: center; gap: 8px;">
                                    <span class="material-icons" style="font-size: 20px;">attach_file</span>
                                    document.pdf
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    clearEmailSelection() {
        this.selectedEmail = null;
        const detailContainer = document.getElementById('emailDetailContainer');
        detailContainer.innerHTML = `
            <div class="no-email-selected">
                <span class="material-icons">mail_outline</span>
                <p>Select an email to read</p>
            </div>
        `;
    }

    // UI Actions
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('active');
    }

    openCompose() {
        const dialog = document.getElementById('composeDialog');
        dialog.classList.add('active');
    }

    closeCompose() {
        const dialog = document.getElementById('composeDialog');
        dialog.classList.remove('active');
    }

    replyToEmail() {
        this.showToast('Opening reply composer...');
        this.openCompose();
    }

    replyAllToEmail() {
        this.showToast('Opening reply all composer...');
        this.openCompose();
    }

    forwardEmail() {
        this.showToast('Opening forward composer...');
        this.openCompose();
    }

    updateFolderCounts() {
        const inboxCount = this.emails.filter(e => e.status === 'unread').length;
        const draftsCount = this.emails.filter(e => e.status === 'draft').length;
        const spamCount = this.emails.filter(e => e.status === 'spam').length;
        
        document.querySelectorAll('.folder-count').forEach(el => {
            const folder = el.closest('.folder-item').dataset.folder;
            if (folder === 'inbox') el.textContent = inboxCount || '';
            if (folder === 'drafts') el.textContent = draftsCount || '';
            if (folder === 'spam') el.textContent = spamCount || '';
        });
    }

    // Utility methods
    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }

    getRandomAvatarColor() {
        const colors = ['avatar-purple', 'avatar-blue', 'avatar-green', 'avatar-yellow', 'avatar-red', 'avatar-pink', 'avatar-indigo', 'avatar-teal'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
                const minutes = Math.floor(diff / (1000 * 60));
                return minutes === 0 ? 'Just now' : `${minutes}m ago`;
            }
            return `${hours}h ago`;
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    formatFullDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', { 
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Add slide down animation
const style = document.createElement('style');
style.textContent = `
@keyframes slideDown {
    to {
        transform: translateY(100%);
        opacity: 0;
    }
}
`;
document.head.appendChild(style);

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
        document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Inter,sans-serif;"><div>Authenticating...</div></div>';
        
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
                // Check if we're adding an account or logging in fresh
                const addingAccount = localStorage.getItem('adding_account') === 'true';
                localStorage.removeItem('adding_account');
                
                // Create account object
                const newAccount = {
                    ...data.user,
                    token: data.access_token
                };
                
                // Load existing accounts
                let accounts = [];
                const existingAccounts = localStorage.getItem('user_accounts');
                if (existingAccounts) {
                    accounts = JSON.parse(existingAccounts);
                }
                
                // Check if account already exists
                const existingIndex = accounts.findIndex(a => a.email === newAccount.email);
                
                if (existingIndex >= 0) {
                    // Update existing account
                    accounts[existingIndex] = newAccount;
                    localStorage.setItem('current_account_index', existingIndex.toString());
                } else {
                    // Add new account
                    accounts.push(newAccount);
                    if (!addingAccount || accounts.length === 1) {
                        // Set as current account if first account or not adding
                        localStorage.setItem('current_account_index', (accounts.length - 1).toString());
                    }
                }
                
                // Save accounts
                localStorage.setItem('user_accounts', JSON.stringify(accounts));
                
                // Keep legacy format for compatibility
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
        window.app = new FuseMailApp();
    }
});