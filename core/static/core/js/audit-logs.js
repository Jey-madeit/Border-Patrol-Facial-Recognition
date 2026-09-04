// Audit Logs Management System
class AuditLogsSystem {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.currentActionFilter = 'all';
        this.currentUserFilter = 'all';
        this.currentSearch = '';
        this.startDate = '';
        this.endDate = '';
        this.allLogs = [];
        this.searchTimeout = null;
        this.totalPages = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAuditLogs();
        this.loadStatistics();
        this.loadUsers();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('logSearch').addEventListener('input', (e) => {
            this.currentSearch = e.target.value;
            this.currentPage = 1;
            
            // Debounce search
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.loadAuditLogs();
            }, 500);
        });

        // Filter functionality
        document.getElementById('actionFilter').addEventListener('change', (e) => {
            this.currentActionFilter = e.target.value;
            this.currentPage = 1;
            this.loadAuditLogs();
        });

        document.getElementById('userFilter').addEventListener('change', (e) => {
            this.currentUserFilter = e.target.value;
            this.currentPage = 1;
            this.loadAuditLogs();
        });

        // Date range filters
        document.getElementById('startDate').addEventListener('change', (e) => {
            this.startDate = e.target.value;
            this.currentPage = 1;
            this.loadAuditLogs();
        });

        document.getElementById('endDate').addEventListener('change', (e) => {
            this.endDate = e.target.value;
            this.currentPage = 1;
            this.loadAuditLogs();
        });

        // Refresh button
        document.getElementById('refreshLogs').addEventListener('click', () => {
            this.currentPage = 1;
            this.loadAuditLogs();
            this.loadStatistics();
        });

        // Export button
        document.getElementById('exportLogsBtn').addEventListener('click', () => {
            this.exportLogs();
        });

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadAuditLogs();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadAuditLogs();
            }
        });
    }

    async loadAuditLogs() {
        try {
            this.showLoading();
            
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/audit-logs/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load audit logs: ${response.status}`);
            }

            const logs = await response.json();
            this.allLogs = logs.results || logs || [];
            
            // Apply filters
            let filteredLogs = this.allLogs;
            
            if (this.currentActionFilter !== 'all') {
                filteredLogs = filteredLogs.filter(log => log.action === this.currentActionFilter);
            }
            
            if (this.currentUserFilter !== 'all') {
                filteredLogs = filteredLogs.filter(log => log.user === this.currentUserFilter);
            }
            
            if (this.currentSearch.trim()) {
                const searchTerm = this.currentSearch.toLowerCase();
                filteredLogs = filteredLogs.filter(log => 
                    log.user.toLowerCase().includes(searchTerm) ||
                    log.action.toLowerCase().includes(searchTerm) ||
                    log.details.toLowerCase().includes(searchTerm) ||
                    log.target_type.toLowerCase().includes(searchTerm)
                );
            }
            
            if (this.startDate) {
                filteredLogs = filteredLogs.filter(log => 
                    new Date(log.timestamp) >= new Date(this.startDate)
                );
            }
            
            if (this.endDate) {
                filteredLogs = filteredLogs.filter(log => 
                    new Date(log.timestamp) <= new Date(this.endDate + 'T23:59:59')
                );
            }
            
            this.totalPages = Math.ceil(filteredLogs.length / this.pageSize);
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
            
            this.displayLogs(paginatedLogs);
            this.updatePagination();

        } catch (error) {
            console.error('Error loading audit logs:', error);
            this.showError('Failed to load audit logs. Please try again.');
        }
    }

    async loadStatistics() {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('/api/audit-logs/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const logs = await response.json();
                const logList = logs.results || logs || [];
                
                // Calculate statistics
                const totalLogs = logList.length;
                const today = new Date().toDateString();
                const todayLogs = logList.filter(log => 
                    new Date(log.timestamp).toDateString() === today
                ).length;
                
                const warningLogs = logList.filter(log => 
                    log.details.toLowerCase().includes('warning') || 
                    log.details.toLowerCase().includes('caution')
                ).length;
                
                const errorLogs = logList.filter(log => 
                    log.details.toLowerCase().includes('error') || 
                    log.details.toLowerCase().includes('failed') ||
                    log.details.toLowerCase().includes('exception')
                ).length;

                // Update UI
                document.getElementById('totalLogs').textContent = totalLogs;
                document.getElementById('todayLogs').textContent = todayLogs;
                document.getElementById('warningLogs').textContent = warningLogs;
                document.getElementById('errorLogs').textContent = errorLogs;
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    async loadUsers() {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('/api/users/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const users = await response.json();
                const userList = users.results || users || [];
                
                const userFilter = document.getElementById('userFilter');
                userFilter.innerHTML = '<option value="all">All Users</option>';
                
                userList.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.get_display_name || user.username;
                    userFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    displayLogs(logs) {
        const container = document.getElementById('logsList');
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No audit logs found</h3>
                    <p>Try adjusting your search criteria or check back later.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        logs.forEach(log => {
            const logItem = this.createLogItem(log);
            container.appendChild(logItem);
        });
    }

    createLogItem(log) {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        
        const timestamp = new Date(log.timestamp).toLocaleString();
        const actionIcon = this.getActionIcon(log.action);
        const actionClass = this.getActionClass(log.action);
        
        logItem.innerHTML = `
            <div class="log-header">
                <div class="log-action">
                    <div class="action-icon ${actionClass}">
                        <i class="fas fa-${actionIcon}"></i>
                    </div>
                    <div class="action-details">
                        <h4>${this.formatAction(log.action)}</h4>
                        <p>${log.user} - ${log.target_type}</p>
                    </div>
                </div>
                <div class="log-timestamp">${timestamp}</div>
            </div>
            <div class="log-details">
                <h5>Details</h5>
                <p>${log.details || 'No additional details available'}</p>
            </div>
            <div class="log-meta">
                <span>
                    <i class="fas fa-user"></i>
                    ${log.user}
                </span>
                <span>
                    <i class="fas fa-tag"></i>
                    ${log.target_type}
                </span>
                <span>
                    <i class="fas fa-globe"></i>
                    ${log.ip_address || 'Unknown IP'}
                </span>
                <span>
                    <i class="fas fa-desktop"></i>
                    ${this.formatUserAgent(log.user_agent)}
                </span>
            </div>
        `;
        
        return logItem;
    }

    getActionIcon(action) {
        const iconMap = {
            'create': 'plus',
            'update': 'edit',
            'delete': 'trash',
            'login': 'sign-in-alt',
            'logout': 'sign-out-alt',
            'view': 'eye',
            'download': 'download',
            'upload': 'upload'
        };
        return iconMap[action] || 'info-circle';
    }

    getActionClass(action) {
        const classMap = {
            'create': 'create',
            'update': 'update',
            'delete': 'delete',
            'login': 'login',
            'logout': 'logout'
        };
        return classMap[action] || 'default';
    }

    formatAction(action) {
        return action.charAt(0).toUpperCase() + action.slice(1);
    }

    formatUserAgent(userAgent) {
        if (!userAgent) return 'Unknown';
        
        // Extract browser name from user agent
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Other';
    }

    updatePagination() {
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');
        
        if (this.totalPages > 1) {
            pagination.style.display = 'flex';
            prevBtn.disabled = this.currentPage === 1;
            nextBtn.disabled = this.currentPage === this.totalPages;
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        } else {
            pagination.style.display = 'none';
        }
    }

    exportLogs() {
        try {
            // Create CSV content
            const headers = ['Timestamp', 'User', 'Action', 'Target Type', 'Details', 'IP Address', 'User Agent'];
            const csvContent = [
                headers.join(','),
                ...this.allLogs.map(log => [
                    new Date(log.timestamp).toISOString(),
                    log.user,
                    log.action,
                    log.target_type,
                    `"${(log.details || '').replace(/"/g, '""')}"`,
                    log.ip_address || '',
                    `"${(log.user_agent || '').replace(/"/g, '""')}"`
                ].join(','))
            ].join('\n');

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showSuccess('Audit logs exported successfully!');

        } catch (error) {
            console.error('Error exporting logs:', error);
            this.showError('Failed to export audit logs.');
        }
    }

    showLoading() {
        const container = document.getElementById('logsList');
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner"></i>
                <p>Loading audit logs...</p>
            </div>
        `;
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.error, .success');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            max-width: 400px;
        `;
        
        if (type === 'error') {
            messageDiv.style.background = '#dc3545';
        } else {
            messageDiv.style.background = '#28a745';
        }
        
        messageDiv.textContent = message;

        document.body.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Global instance
let auditLogsManager;

// Initialize audit logs system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    auditLogsManager = new AuditLogsSystem();
});
