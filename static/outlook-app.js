// Microsoft Outlook Web Clone - JavaScript Implementation
class OutlookApp {
    constructor() {
        this.currentUser = null;
        this.emails = [];
        this.selectedEmail = null;
        this.selectedFolder = 'inbox';
        this.token = localStorage.getItem('auth_token');
        this.currentView = 'messages';
        this.selectedEmails = new Set();
        
        this.init();
    }

    init() {
        // Check authentication
        if (this.token) {
            this.showMainScreen();
            this.loadUserData();
            this.loadEmails();
            this.startAutoSync();
        } else {
            this.showLoginScreen();
        }

        this.attachEventListeners();
        this.initializeResizablePanels();
    }

    attachEventListeners() {
        // Login
        const loginBtn = document.getElementById('googleLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

        // Profile/Logout
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => this.showProfileMenu());
        }

        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });
        }

        // New Mail
        const newMailBtn = document.getElementById('newMailBtn');
        if (newMailBtn) {
            newMailBtn.addEventListener('click', () => this.composeNewEmail());
        }

        // Sync
        const syncBtn = document.getElementById('syncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.syncEmails());
        }

        // Folder items
        document.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectFolder(e.currentTarget.dataset.folder);
            });
        });

        // Select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                this.selectAllEmails(e.target.checked);
            });
        }

        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeView(e.currentTarget);
            });
        });

        // Command bar buttons
        document.querySelectorAll('.cmd-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('title');
                if (action) {
                    this.handleCommand(action.toLowerCase());
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    initializeResizablePanels() {
        const leftSplitter = document.getElementById('leftSplitter');
        const rightSplitter = document.getElementById('rightSplitter');
        const leftNav = document.getElementById('leftNav');
        const emailListPane = document.getElementById('emailListPane');
        const readingPane = document.getElementById('readingPane');

        if (leftSplitter && leftNav) {
            this.makeResizable(leftSplitter, leftNav, 'width', 180, 400);
        }

        if (rightSplitter && emailListPane) {
            this.makeResizable(rightSplitter, emailListPane, 'width', 320, 800);
        }
    }

    makeResizable(splitter, element, property, minSize, maxSize) {
        let isResizing = false;
        let startPos = 0;
        let startSize = 0;

        splitter.addEventListener('mousedown', (e) => {
            isResizing = true;
            startPos = property === 'width' ? e.clientX : e.clientY;
            startSize = parseInt(window.getComputedStyle(element)[property], 10);
            document.body.style.cursor = property === 'width' ? 'col-resize' : 'row-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const currentPos = property === 'width' ? e.clientX : e.clientY;
            const diff = currentPos - startPos;
            let newSize = startSize + diff;
            
            newSize = Math.max(minSize, Math.min(newSize, maxSize));
            element.style[property] = newSize + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
            }
        });
    }

    // Authentication methods
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

    showProfileMenu() {
        // Create profile dropdown
        const menu = document.createElement('div');
        menu.className = 'profile-menu';
        menu.innerHTML = `
            <div class="profile-menu-header">
                <img src="${this.currentUser?.picture || ''}" alt="Profile" />
                <div class="profile-info">
                    <div class="profile-name">${this.currentUser?.name || 'User'}</div>
                    <div class="profile-email">${this.currentUser?.email || ''}</div>
                </div>
            </div>
            <div class="profile-menu-divider"></div>
            <button class="profile-menu-item" onclick="app.handleLogout()">
                Sign out
            </button>
        `;
        
        // Position and show menu
        const profileBtn = document.getElementById('profileBtn');
        const rect = profileBtn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = rect.bottom + 'px';
        menu.style.right = '20px';
        
        document.body.appendChild(menu);
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }, { once: true });
        }, 0);
    }

    handleLogout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        this.token = null;
        this.currentUser = null;
        this.showLoginScreen();
        this.showToast('Signed out successfully', 'success');
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

    // User data management
    loadUserData() {
        const userData = localStorage.getItem('user_data');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUserUI();
        }
    }

    updateUserUI() {
        if (this.currentUser) {
            const userAvatar = document.getElementById('userAvatar');
            if (userAvatar) {
                userAvatar.src = this.currentUser.picture || this.generateAvatar(this.currentUser.name);
            }
        }
    }

    generateAvatar(name) {
        const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '?';
        return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="%230078d4"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Segoe UI" font-size="14">${initials}</text></svg>`;
    }

    // Email operations
    async loadEmails() {
        try {
            const response = await fetch('/api/emails', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.emails = await response.json();
                this.renderEmailList();
                this.updateFolderCounts();
                this.updateStatusBar();
            } else if (response.status === 401) {
                this.handleLogout();
            }
        } catch (error) {
            this.showToast('Failed to load emails', 'error');
        }
    }

    async syncEmails() {
        const syncBtn = document.getElementById('syncBtn');
        const icon = syncBtn.querySelector('svg');
        
        // Add spinning animation
        icon.style.animation = 'spin 1s linear infinite';
        syncBtn.disabled = true;

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
            }
        } catch (error) {
            this.showToast('Sync failed', 'error');
        } finally {
            icon.style.animation = '';
            syncBtn.disabled = false;
        }
    }

    renderEmailList() {
        const emailList = document.getElementById('emailList');
        const filteredEmails = this.filterEmailsByFolder();
        
        if (filteredEmails.length === 0) {
            emailList.innerHTML = `
                <div class="no-emails">
                    <p>No messages in this folder</p>
                </div>
            `;
            return;
        }

        emailList.innerHTML = filteredEmails.map(email => `
            <div class="email-item ${email.status === 'unread' ? 'unread' : ''}" data-id="${email.id}">
                <input type="checkbox" class="email-checkbox" data-id="${email.id}" />
                <div class="email-content">
                    <div class="email-header">
                        <span class="email-sender">${email.sender}</span>
                        <span class="email-time">${this.formatTime(email.timestamp)}</span>
                    </div>
                    <div class="email-subject">${email.subject}</div>
                    <div class="email-preview">${email.summary || email.fullContent.substring(0, 100)}</div>
                </div>
            </div>
        `).join('');

        // Add click listeners
        document.querySelectorAll('.email-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('email-checkbox')) {
                    this.selectEmail(item.dataset.id);
                }
            });
        });

        // Add checkbox listeners
        document.querySelectorAll('.email-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedEmails.add(e.target.dataset.id);
                } else {
                    this.selectedEmails.delete(e.target.dataset.id);
                }
                this.updateCommandBarState();
            });
        });
    }

    filterEmailsByFolder() {
        switch (this.selectedFolder) {
            case 'inbox':
                return this.emails.filter(e => e.status !== 'sent' && e.status !== 'deleted');
            case 'sent':
                return this.emails.filter(e => e.status === 'sent');
            case 'drafts':
                return this.emails.filter(e => e.status === 'draft');
            case 'deleted':
                return this.emails.filter(e => e.status === 'deleted');
            case 'junk':
                return this.emails.filter(e => e.category === 'spam' || e.category === 'junk');
            case 'archive':
                return this.emails.filter(e => e.status === 'archived');
            default:
                return this.emails;
        }
    }

    selectFolder(folder) {
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
            item.classList.remove('selected');
            if (item.dataset.id === emailId) {
                item.classList.add('selected');
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
                this.renderEmailContent(email);
                
                // Mark as read
                const emailItem = document.querySelector(`.email-item[data-id="${emailId}"]`);
                if (emailItem) {
                    emailItem.classList.remove('unread');
                }
            }
        } catch (error) {
            this.showToast('Failed to load email', 'error');
        }
    }

    renderEmailContent(email) {
        const readingPane = document.getElementById('readingPane');
        
        readingPane.innerHTML = `
            <div class="email-content">
                <div class="email-toolbar">
                    <button class="cmd-btn" title="Reply">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path d="M8.5 2.5a.5.5 0 00-.5.5v3.5H4.5a3 3 0 000 6H8a.5.5 0 000-1H4.5a2 2 0 110-4H8v3.5a.5.5 0 00.85.35l4-4a.5.5 0 000-.7l-4-4a.5.5 0 00-.35-.15z" fill="currentColor"/>
                        </svg>
                        Reply
                    </button>
                    <button class="cmd-btn" title="Reply all">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path d="M8.5 2.5a.5.5 0 00-.5.5v3.5H4.5a3 3 0 000 6H8a.5.5 0 000-1H4.5a2 2 0 110-4H8v3.5a.5.5 0 00.85.35l4-4a.5.5 0 000-.7l-4-4a.5.5 0 00-.35-.15z" fill="currentColor"/>
                        </svg>
                        Reply all
                    </button>
                    <button class="cmd-btn" title="Forward">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path d="M7.5 2.5a.5.5 0 01.5.5v3.5h3.5a3 3 0 010 6H8a.5.5 0 010-1h3.5a2 2 0 100-4H8v3.5a.5.5 0 01-.85.35l-4-4a.5.5 0 010-.7l4-4a.5.5 0 01.35-.15z" fill="currentColor"/>
                        </svg>
                        Forward
                    </button>
                    <div class="cmd-separator"></div>
                    <button class="cmd-btn" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 00-1.492-.149l-.66 6.6a.25.25 0 01-.249.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                <div class="email-header-detail">
                    <div class="email-subject-detail">${email.subject}</div>
                    <div class="email-sender-detail">
                        <div class="sender-avatar">${this.getInitials(email.sender)}</div>
                        <div class="sender-info">
                            <div class="sender-name">${email.sender}</div>
                            <div class="sender-email">${email.senderEmail}</div>
                        </div>
                        <div class="email-date">${this.formatFullDate(email.timestamp)}</div>
                    </div>
                </div>
                <div class="email-body">
                    ${email.fullContent.replace(/\n/g, '<br>')}
                    ${email.attachments && email.attachments.length > 0 ? `
                        <div class="attachments">
                            <h4>Attachments (${email.attachments.length})</h4>
                            ${email.attachments.map(att => `
                                <div class="attachment-item">
                                    <svg width="16" height="16" viewBox="0 0 16 16">
                                        <path d="M4.5 3A1.5 1.5 0 003 4.5v8A1.5 1.5 0 004.5 14h7A1.5 1.5 0 0013 12.5v-8A1.5 1.5 0 0011.5 3h-7z" fill="currentColor"/>
                                    </svg>
                                    ${att.name} (${att.size})
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    clearEmailSelection() {
        this.selectedEmail = null;
        const readingPane = document.getElementById('readingPane');
        readingPane.innerHTML = `
            <div class="no-message">
                <svg width="48" height="48" viewBox="0 0 48 48" opacity="0.3">
                    <path d="M4 8v32h40V8H4zm20 16L8 12h32L24 24zm0 2l16-12v24H8V14l16 12z" fill="currentColor"/>
                </svg>
                <p>Select an item to read</p>
                <span>Nothing is selected</span>
            </div>
        `;
    }

    // UI helpers
    updateFolderCounts() {
        const inboxCount = this.emails.filter(e => e.status === 'unread').length;
        const draftsCount = this.emails.filter(e => e.status === 'draft').length;
        
        document.getElementById('inboxCount').textContent = inboxCount || '';
        document.getElementById('draftsCount').textContent = draftsCount || '';
    }

    updateStatusBar() {
        const itemCount = document.getElementById('itemCount');
        const connectionStatus = document.getElementById('connectionStatus');
        
        itemCount.textContent = `${this.emails.length} items`;
        connectionStatus.textContent = 'Connected';
    }

    updateCommandBarState() {
        // Enable/disable command bar buttons based on selection
        const hasSelection = this.selectedEmails.size > 0 || this.selectedEmail;
        document.querySelectorAll('.cmd-btn:not(.primary)').forEach(btn => {
            if (btn.getAttribute('title') !== 'Sync') {
                btn.disabled = !hasSelection;
            }
        });
    }

    // Search functionality
    handleSearch(query) {
        // Live search preview
        if (query.length > 2) {
            this.performSearch(query);
        } else if (query.length === 0) {
            this.renderEmailList();
        }
    }

    performSearch(query) {
        const filtered = this.emails.filter(email => 
            email.subject.toLowerCase().includes(query.toLowerCase()) ||
            email.sender.toLowerCase().includes(query.toLowerCase()) ||
            email.fullContent.toLowerCase().includes(query.toLowerCase())
        );
        
        const emailList = document.getElementById('emailList');
        if (filtered.length === 0) {
            emailList.innerHTML = '<div class="no-emails"><p>No results found</p></div>';
        } else {
            // Temporarily set emails to filtered results
            const originalEmails = this.emails;
            this.emails = filtered;
            this.renderEmailList();
            this.emails = originalEmails;
        }
    }

    // Commands
    handleCommand(action) {
        switch (action) {
            case 'delete':
                this.deleteSelectedEmails();
                break;
            case 'archive':
                this.archiveSelectedEmails();
                break;
            case 'junk':
                this.markAsJunk();
                break;
            case 'move to':
                this.showMoveToDialog();
                break;
            case 'undo':
                this.undoLastAction();
                break;
        }
    }

    async deleteSelectedEmails() {
        const emailsToDelete = this.selectedEmails.size > 0 ? 
            Array.from(this.selectedEmails) : 
            (this.selectedEmail ? [this.selectedEmail.id] : []);
        
        for (const emailId of emailsToDelete) {
            try {
                await fetch(`/api/emails/${emailId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
            } catch (error) {
                console.error('Failed to delete email:', error);
            }
        }
        
        this.showToast(`${emailsToDelete.length} email(s) deleted`, 'success');
        await this.loadEmails();
        this.clearEmailSelection();
    }

    archiveSelectedEmails() {
        this.showToast('Emails archived', 'success');
    }

    markAsJunk() {
        this.showToast('Marked as junk', 'success');
    }

    showMoveToDialog() {
        this.showToast('Move to folder', 'info');
    }

    undoLastAction() {
        this.showToast('Nothing to undo', 'info');
    }

    composeNewEmail() {
        this.showToast('Opening new email composer...', 'info');
        // In a real app, this would open a compose window
    }

    selectAllEmails(checked) {
        document.querySelectorAll('.email-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
            if (checked) {
                this.selectedEmails.add(checkbox.dataset.id);
            } else {
                this.selectedEmails.delete(checkbox.dataset.id);
            }
        });
        this.updateCommandBarState();
    }

    changeView(button) {
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const view = button.getAttribute('title').toLowerCase();
        this.currentView = view;
        
        if (view === 'conversations') {
            this.showToast('Conversation view coming soon', 'info');
        }
    }

    // Keyboard shortcuts
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + N: New email
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.composeNewEmail();
        }
        
        // Delete key: Delete selected
        if (e.key === 'Delete' && this.selectedEmail) {
            this.deleteSelectedEmails();
        }
        
        // Ctrl/Cmd + R: Reply
        if ((e.ctrlKey || e.metaKey) && e.key === 'r' && this.selectedEmail) {
            e.preventDefault();
            this.showToast('Reply to email', 'info');
        }
        
        // Ctrl/Cmd + Shift + R: Reply all
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'r' && this.selectedEmail) {
            e.preventDefault();
            this.showToast('Reply all', 'info');
        }
        
        // Ctrl/Cmd + F: Search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
    }

    // Utility methods
    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
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
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Auto sync
    startAutoSync() {
        // Sync every 5 minutes
        setInterval(() => {
            this.syncEmails();
        }, 5 * 60 * 1000);
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
        document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Segoe UI;"><div>Signing in to Outlook...</div></div>';
        
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
        window.app = new OutlookApp();
    }
});

// Add slide out animation
const style = document.createElement('style');
style.textContent = `
@keyframes slideOut {
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

.profile-menu {
    position: fixed;
    background: white;
    border: 1px solid #e1dfdd;
    border-radius: 2px;
    box-shadow: 0 6.4px 14.4px 0 rgba(0,0,0,.132);
    width: 320px;
    z-index: 1000;
}

.profile-menu-header {
    padding: 16px;
    display: flex;
    gap: 12px;
    align-items: center;
}

.profile-menu-header img {
    width: 48px;
    height: 48px;
    border-radius: 50%;
}

.profile-info {
    flex: 1;
}

.profile-name {
    font-weight: 600;
    font-size: 14px;
    color: #323130;
}

.profile-email {
    font-size: 12px;
    color: #605e5c;
}

.profile-menu-divider {
    height: 1px;
    background: #e1dfdd;
}

.profile-menu-item {
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: transparent;
    text-align: left;
    font-size: 14px;
    color: #323130;
    cursor: pointer;
    transition: background 0.1s ease;
}

.profile-menu-item:hover {
    background: #f3f2f1;
}

.no-emails {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #605e5c;
    font-size: 14px;
}

.email-checkbox {
    margin-right: 12px;
    cursor: pointer;
}

.attachments {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e1dfdd;
}

.attachments h4 {
    font-size: 14px;
    margin-bottom: 12px;
}

.attachment-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f3f2f1;
    border-radius: 2px;
    margin-right: 8px;
    margin-bottom: 8px;
    font-size: 13px;
}
`;
document.head.appendChild(style);