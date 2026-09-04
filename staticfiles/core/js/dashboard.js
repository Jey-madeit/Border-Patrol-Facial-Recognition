// Border Patrol Dashboard System
class BorderPatrolDashboard {
    constructor() {
        this.currentUser = null;
        this.isSidebarOpen = true; // Sidebar is open by default
        this.isSidebarCollapsed = false; // Sidebar collapsed state
        this.refreshInterval = null;
        
        // DOM Elements
        this.userName = document.getElementById('userName');
        this.badgeId = document.getElementById('badgeId');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.dashboardMain = document.querySelector('.dashboard-main');
        this.notificationContainer = document.getElementById('notificationContainer');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.backendUrl = 'http://127.0.0.1:8000/api';
        
        // Quick action buttons
        this.faceRecognitionBtn = document.getElementById('faceRecognitionBtn');
        this.surveillanceBtn = document.getElementById('surveillanceBtn');
        this.incidentBtn = document.getElementById('incidentBtn');
        this.patrolBtn = document.getElementById('patrolBtn');
        this.userManagementBtn = document.getElementById('userManagementBtn');
        this.systemConfigBtn = document.getElementById('systemConfigBtn');
        this.analyticsBtn = document.getElementById('analyticsBtn');
        this.auditLogsBtn = document.getElementById('auditLogsBtn');
        
        // Refresh buttons
        this.refreshActivity = document.getElementById('refreshActivity');
        this.refreshOverview = document.getElementById('refreshOverview');
        
        // Admin functionality elements
        this.addOfficerBtn = document.getElementById('addOfficerBtn');
        this.refreshOfficersBtn = document.getElementById('refreshOfficersBtn');
        this.uploadImageBtn = document.getElementById('uploadImageBtn');
        this.refreshImagesBtn = document.getElementById('refreshImagesBtn');
        this.viewAllIncidentsBtn = document.getElementById('viewAllIncidentsBtn');
        this.refreshIncidentsBtn = document.getElementById('refreshIncidentsBtn');
        this.resetPasswordBtn = document.getElementById('resetPasswordBtn');
        this.refreshPasswordsBtn = document.getElementById('refreshPasswordsBtn');
        this.viewPasswordsBtn = document.getElementById('viewPasswordsBtn');
        
        // Profile functionality elements
        this.profileMenuItem = document.getElementById('profileMenuItem');
        this.profileModal = document.getElementById('profileModal');
        
        // Officer image upload elements
        this.officerUploadBtn = document.getElementById('uploadImageBtn');
        this.imageFileInput = document.getElementById('imageFileInput');
        this.uploadedImages = document.getElementById('uploadedImages');
        
        // Modals
        this.addOfficerModal = document.getElementById('addOfficerModal');
        this.uploadImageModal = document.getElementById('uploadImageModal');
        this.incidentResponseModal = document.getElementById('incidentResponseModal');
        this.passwordResetModal = document.getElementById('passwordResetModal');
        this.viewPasswordsModal = document.getElementById('viewPasswordsModal');
        
        // Mock data
        this.officers = [];
        this.incidents = [];
        this.images = [];
        this.passwordResets = [];
        
        this.init();
    }
    
    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        // this.startAutoRefresh();
        this.setupInactivityTimer();
        this.initializeSidebar();
    }
    
    checkAuthentication() {
        const session = this.getSessionData();
        if (!session || !session.user) {
            this.redirectToLogin();
            return;
        }
        
        // Check session timeout
        const now = Date.now();
        const sessionTimeout = 30 * 60 * 1000; // 30 minutes
        
        if (now - session.loginTime > sessionTimeout) {
            this.showNotification('Session expired due to inactivity', 'warning');
            this.logout();
            return;
        }
        
        this.currentUser = session.user;
    }
    
    getSessionData() {
        const session = sessionStorage.getItem('borderPatrolSession') || localStorage.getItem('borderPatrolSession');
        return session ? JSON.parse(session) : null;
    }
    
    loadUserData() {
        if (this.currentUser) {
            this.userName.textContent = this.currentUser.name;
            this.badgeId.textContent = this.currentUser.badgeId;
        }
    }
    
    setupEventListeners() {
        // Logout button
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        
        // Sidebar toggle
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        
        // Quick action buttons
        if (this.faceRecognitionBtn) {
            this.faceRecognitionBtn.addEventListener('click', () => this.navigateToFaceRecognition());
        }
        
        if (this.surveillanceBtn) {
            this.surveillanceBtn.addEventListener('click', () => this.navigateToSurveillance());
        }
        
        if (this.incidentBtn) {
            this.incidentBtn.addEventListener('click', () => this.navigateToIncidents());
        }
        
        if (this.patrolBtn) {
            this.patrolBtn.addEventListener('click', () => this.navigateToPatrol());
        }
        
        // Admin-specific buttons
        if (this.userManagementBtn) {
            this.userManagementBtn.addEventListener('click', () => this.navigateToUserManagement());
        }
        
        if (this.systemConfigBtn) {
            this.systemConfigBtn.addEventListener('click', () => this.navigateToSystemConfig());
        }
        
        if (this.analyticsBtn) {
            this.analyticsBtn.addEventListener('click', () => this.navigateToAnalytics());
        }
        
        if (this.auditLogsBtn) {
            this.auditLogsBtn.addEventListener('click', () => this.navigateToAuditLogs());
        }
        
        // Refresh buttons
        if (this.refreshActivity) {
            this.refreshActivity.addEventListener('click', () => this.refreshActivityData());
        }
        
        if (this.refreshOverview) {
            this.refreshOverview.addEventListener('click', () => this.refreshOverviewData());
        }
        
        // Menu navigation
        document.querySelectorAll('.menu-item a').forEach(link => {
            link.addEventListener('click', (e) => this.handleMenuNavigation(e));
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        
        // Admin functionality event listeners
        this.setupAdminEventListeners();
        
        // Officer image upload event listeners
        this.setupOfficerImageUpload();
        
        // Officer-specific event listeners
        this.setupOfficerEventListeners();
    }
    
    setupAdminEventListeners() {
        // Officer management
        if (this.addOfficerBtn) {
            this.addOfficerBtn.addEventListener('click', () => this.openAddOfficerModal());
        }
        
        if (this.refreshOfficersBtn) {
            this.refreshOfficersBtn.addEventListener('click', () => this.refreshOfficers());
        }
        
        // Image management
        if (this.uploadImageBtn) {
            this.uploadImageBtn.addEventListener('click', () => this.openUploadImageModal());
        }
        
        if (this.refreshImagesBtn) {
            this.refreshImagesBtn.addEventListener('click', () => this.refreshImages());
        }
        
        // Incident management
        if (this.viewAllIncidentsBtn) {
            this.viewAllIncidentsBtn.addEventListener('click', () => this.viewAllIncidents());
        }
        
        if (this.refreshIncidentsBtn) {
            this.refreshIncidentsBtn.addEventListener('click', () => this.refreshIncidents());
        }
        
        // Password management
        if (this.resetPasswordBtn) {
            this.resetPasswordBtn.addEventListener('click', () => this.openPasswordResetModal());
        }
        
        if (this.refreshPasswordsBtn) {
            this.refreshPasswordsBtn.addEventListener('click', () => this.refreshPasswordResets());
        }
        
        if (this.viewPasswordsBtn) {
            this.viewPasswordsBtn.addEventListener('click', () => this.openViewPasswordsModal());
        }
        
        // Profile management
        if (this.profileMenuItem) {
            this.profileMenuItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.openProfileModal();
            });
        }
        
        // Sidebar navigation
        this.setupSidebarNavigation();
        
        // Modal event listeners
        this.setupModalEventListeners();
    }
    
    setupModalEventListeners() {
        // Add Officer Modal
        if (this.addOfficerModal) {
            const closeBtn = document.getElementById('closeAddOfficerModal');
            const cancelBtn = document.getElementById('cancelAddOfficer');
            const saveBtn = document.getElementById('saveOfficer');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal('addOfficerModal'));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal('addOfficerModal'));
            if (saveBtn) saveBtn.addEventListener('click', () => this.saveOfficer());
        }
        
        // Upload Image Modal
        if (this.uploadImageModal) {
            const closeBtn = document.getElementById('closeUploadImageModal');
            const cancelBtn = document.getElementById('cancelUploadImage');
            const uploadBtn = document.getElementById('uploadImage');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal('uploadImageModal'));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal('uploadImageModal'));
            if (uploadBtn) uploadBtn.addEventListener('click', () => this.uploadImage());
        }
        
        // Incident Response Modal
        if (this.incidentResponseModal) {
            const closeBtn = document.getElementById('closeIncidentResponseModal');
            const cancelBtn = document.getElementById('cancelIncidentResponse');
            const submitBtn = document.getElementById('submitIncidentResponse');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal('incidentResponseModal'));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal('incidentResponseModal'));
            if (submitBtn) submitBtn.addEventListener('click', () => this.submitIncidentResponse());
        }
        
        // Password Reset Modal
        if (this.passwordResetModal) {
            const closeBtn = document.getElementById('closePasswordResetModal');
            const cancelBtn = document.getElementById('cancelPasswordReset');
            const submitBtn = document.getElementById('submitPasswordReset');
            const generateBtn = document.getElementById('generatePassword');
            const copyBtn = document.getElementById('copyPassword');
            const resetMethodSelect = document.getElementById('resetMethod');
            const resetReasonSelect = document.getElementById('resetReason');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal('passwordResetModal'));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal('passwordResetModal'));
            if (submitBtn) submitBtn.addEventListener('click', () => this.submitPasswordReset());
            if (generateBtn) generateBtn.addEventListener('click', () => this.generateTemporaryPassword());
            if (copyBtn) copyBtn.addEventListener('click', () => this.copyTemporaryPassword());
            if (resetMethodSelect) resetMethodSelect.addEventListener('change', () => this.handleResetMethodChange());
            if (resetReasonSelect) resetReasonSelect.addEventListener('change', () => this.handleResetReasonChange());
        }
        
        // View Passwords Modal
        if (this.viewPasswordsModal) {
            const closeBtn = document.getElementById('closeViewPasswordsModal');
            const cancelBtn = document.getElementById('cancelViewPasswords');
            const searchInput = document.getElementById('passwordSearch');
            const departmentFilter = document.getElementById('departmentFilter');
            const exportBtn = document.getElementById('exportPasswords');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal('viewPasswordsModal'));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal('viewPasswordsModal'));
            if (searchInput) searchInput.addEventListener('input', () => this.filterPasswords());
            if (departmentFilter) departmentFilter.addEventListener('change', () => this.filterPasswords());
            if (exportBtn) exportBtn.addEventListener('click', () => this.exportPasswords());
        }
        
        // Profile Modal
        if (this.profileModal) {
            const closeBtn = document.getElementById('closeProfileModal');
            const cancelBtn = document.getElementById('cancelProfile');
            const saveBtn = document.getElementById('saveProfile');
            const avatarBtn = document.getElementById('avatarUploadBtn');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal('profileModal'));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal('profileModal'));
            if (saveBtn) saveBtn.addEventListener('click', () => this.saveProfile());
            if (avatarBtn) avatarBtn.addEventListener('click', () => this.uploadAvatar());
        }
    }
    
    initializeSidebar() {
        // Initialize sidebar as open by default
        if (this.sidebar && this.dashboardMain) {
            this.sidebar.classList.add('open');
            this.dashboardMain.classList.add('sidebar-open');
        }
        
        // Add click event to toggle sidebar
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
    }
    
    toggleSidebar() {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
        
        if (this.isSidebarCollapsed) {
            this.sidebar.classList.add('collapsed');
            this.dashboardMain.style.marginLeft = '60px';
        } else {
            this.sidebar.classList.remove('collapsed');
            this.dashboardMain.style.marginLeft = '280px';
        }
    }
    
    setupSidebarNavigation() {
        const menuItems = document.querySelectorAll('.sidebar-menu .menu-item a');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const href = item.getAttribute('href');
                this.handleSidebarNavigation(href);
                
                // Update active menu item
                menuItems.forEach(menuItem => menuItem.parentElement.classList.remove('active'));
                item.parentElement.classList.add('active');
            });
        });
    }
    
    handleSidebarNavigation(href) {
        const dashboardWidgets = document.querySelector('.dashboard-widgets');
        const pageInterfaces = document.getElementById('pageInterfaces');
        
        if (!dashboardWidgets || !pageInterfaces) return;
        
        // Hide all page interfaces
        const allPages = pageInterfaces.querySelectorAll('.page-interface');
        allPages.forEach(page => page.style.display = 'none');
        
        // Show dashboard widgets by default
        dashboardWidgets.style.display = 'block';
        pageInterfaces.style.display = 'none';
        
        switch(href) {
            case '#dashboard':
                // Show dashboard widgets
                dashboardWidgets.style.display = 'block';
                pageInterfaces.style.display = 'none';
                break;
            case '#system-overview':
                this.showPageInterface('system-overview-page');
                break;
            case '#system-activity':
                this.showPageInterface('system-activity-page');
                break;
            case '#officer-management':
                this.showPageInterface('officer-management-page');
                break;
            case '#incident-management':
                this.showPageInterface('incident-management-page');
                break;
            case '#image-management':
                this.showPageInterface('image-management-page');
                break;
            case '#password-management':
                this.showPageInterface('password-management-page');
                break;
            case '#image-upload':
                this.showPageInterface('image-upload-page');
                break;
            case '#incidents-reporting':
                this.showPageInterface('incidents-reporting-page');
                break;
            case '#daily-reports':
                this.showPageInterface('daily-reports-page');
                break;
            case '#patrol':
                this.showPageInterface('patrol-page');
                break;
            case '#reports':
                this.showPageInterface('reports-page');
                break;
            case '#surveillance':
                this.showNotification('Surveillance feature coming soon', 'info');
                break;
            case '#face-recognition':
                // Navigate to face recognition page
                this.showLoading(true);
                setTimeout(() => {
                    window.location.href = '/api/face-recognition/';
                }, 500);
                break;
            case '#analytics':
                this.showNotification('Analytics feature coming soon', 'info');
                break;
            case '#audit':
                this.showNotification('Audit logs feature coming soon', 'info');
                break;
            case '#alerts':
                this.showPageInterface('alerts-page');
                break;
            case '#audit-logs':
                this.showPageInterface('audit-logs-page');
                break;
            case '#profile':
                // Open profile modal
                this.openProfileModal();
                break;
        }
    }
    
    showPageInterface(pageId) {
        const dashboardWidgets = document.querySelector('.dashboard-widgets');
        const pageInterfaces = document.getElementById('pageInterfaces');
        const targetPage = document.getElementById(pageId);
        
        if (!dashboardWidgets || !pageInterfaces || !targetPage) return;
        
        // Hide dashboard widgets
        dashboardWidgets.style.display = 'none';
        
        // Show page interfaces
        pageInterfaces.style.display = 'block';
        
        // Show target page
        targetPage.style.display = 'block';
        
        // Load page data
        this.loadPageData(pageId);
    }
    
    loadPageData(pageId) {
        switch(pageId) {
            case 'system-overview-page':
                this.loadSystemOverviewData();
                break;
            case 'system-activity-page':
                this.loadSystemActivityData();
                break;
            case 'officer-management-page':
                this.loadOfficerManagementData();
                break;
            case 'incident-management-page':
                this.loadIncidentManagementData();
                break;
            case 'image-management-page':
                this.loadImageManagementData();
                break;
            case 'password-management-page':
                this.loadPasswordManagementData();
                break;
            case 'alerts-page':
                this.loadAlertsData();
                break;
            case 'analytics-page':
                this.loadAnalyticsData();
                break;
            case 'audit-logs-page':
                this.loadAuditLogsData();
                break;
            case 'image-upload-page':
                this.loadImageUploadData();
                break;
            case 'incidents-page':
                this.loadIncidentsData();
                break;
            case 'incidents-reporting-page':
                this.loadIncidentsReportingData();
                break;
            case 'daily-reports-page':
                this.loadDailyReportsData();
                break;
            case 'patrol-page':
                this.loadPatrolData();
                break;
            case 'reports-page':
                this.loadReportsData();
                break;
        }
    }
    
    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
        
        if (this.isSidebarOpen) {
            this.sidebar.classList.add('open');
            this.dashboardMain.classList.add('sidebar-open');
        } else {
            this.sidebar.classList.remove('open');
            this.dashboardMain.classList.remove('sidebar-open');
        }
    }
    
    handleOutsideClick(e) {
        if (this.isSidebarOpen && !this.sidebar.contains(e.target) && !this.sidebarToggle.contains(e.target)) {
            this.toggleSidebar();
        }
    }
    
    handleMenuNavigation(e) {
        e.preventDefault();
        const href = e.target.closest('a').getAttribute('href');
        
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        e.target.closest('.menu-item').classList.add('active');
        
        // Handle navigation based on href
        switch (href) {
            case '#dashboard':
                this.showNotification('Already on dashboard', 'info');
                break;
            case '#surveillance':
                this.navigateToSurveillance();
                break;
            case '#face-recognition':
                this.navigateToFaceRecognition();
                break;
            case '#incidents':
                this.navigateToIncidents();
                break;
            case '#patrol':
                this.navigateToPatrol();
                break;
            case '#reports':
                this.navigateToReports();
                break;
            case '#settings':
                this.navigateToSettings();
                break;
            case '#users':
                this.navigateToUserManagement();
                break;
            case '#analytics':
                this.navigateToAnalytics();
                break;
            case '#audit':
                this.navigateToAuditLogs();
                break;
            case '#alerts':
                this.navigateToAlerts();
                break;
            default:
                this.showNotification('Feature coming soon', 'info');
        }
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            this.toggleSidebar();
        }
    }
    
    navigateToFaceRecognition() {
        this.showLoading(true);
        setTimeout(() => {
            window.location.href = '/api/face-recognition/';
        }, 1000);
    }
    
    navigateToSurveillance() {
        this.showNotification('Surveillance system loading...', 'info');
        // In a real implementation, this would load the surveillance interface
    }
    
    navigateToIncidents() {
        this.showNotification('Incident reporting system loading...', 'info');
        // In a real implementation, this would load the incident reporting interface
    }
    
    navigateToPatrol() {
        this.showNotification('Patrol route system loading...', 'info');
        // In a real implementation, this would load the patrol route interface
    }
    
    navigateToReports() {
        this.showNotification('Reports system loading...', 'info');
        // In a real implementation, this would load the reports interface
    }
    
    navigateToSettings() {
        this.showNotification('Settings panel loading...', 'info');
        // In a real implementation, this would load the settings interface
    }
    
    navigateToUserManagement() {
        if (this.currentUser.role !== 'admin') {
            this.showNotification('Access denied. Admin privileges required.', 'error');
            return;
        }
        this.showNotification('User management system loading...', 'info');
        // In a real implementation, this would load the user management interface
    }
    
    navigateToSystemConfig() {
        if (this.currentUser.role !== 'admin') {
            this.showNotification('Access denied. Admin privileges required.', 'error');
            return;
        }
        this.showNotification('System configuration loading...', 'info');
        // In a real implementation, this would load the system configuration interface
    }
    
    navigateToAnalytics() {
        if (this.currentUser.role !== 'admin') {
            this.showNotification('Access denied. Admin privileges required.', 'error');
            return;
        }
        this.showNotification('Analytics dashboard loading...', 'info');
        // In a real implementation, this would load the analytics interface
    }
    
    navigateToAuditLogs() {
        if (this.currentUser.role !== 'admin') {
            this.showNotification('Access denied. Admin privileges required.', 'error');
            return;
        }
        this.showNotification('Audit logs loading...', 'info');
        // In a real implementation, this would load the audit logs interface
    }
    
    navigateToAlerts() {
        this.showNotification('Security alerts loading...', 'info');
        // In a real implementation, this would load the alerts interface
    }
    
    refreshActivityData() {
        this.showLoading(true);
        
        // Simulate API call
        setTimeout(() => {
            this.updateActivityList();
            this.showLoading(false);
            this.showNotification('Activity data refreshed', 'success');
        }, 1500);
    }
    
    refreshOverviewData() {
        this.showLoading(true);
        
        // Simulate API call
        setTimeout(() => {
            this.updateOverviewData();
            this.showLoading(false);
            this.showNotification('Overview data refreshed', 'success');
        }, 1500);
    }
    
    updateActivityList() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        const activities = [
            {
                icon: 'fa-check-circle',
                type: 'success',
                text: 'Face recognition completed',
                time: 'Just now'
            },
            {
                icon: 'fa-info-circle',
                type: 'info',
                text: 'System status updated',
                time: '1 minute ago'
            },
            {
                icon: 'fa-exclamation-triangle',
                type: 'warning',
                text: 'New alert received',
                time: '3 minutes ago'
            }
        ];
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-details">
                    <p>${activity.text}</p>
                    <small>${activity.time}</small>
                </div>
            </div>
        `).join('');
    }
    
    updateOverviewData() {
        // Update overview metrics with fresh data
        const overviewValues = document.querySelectorAll('.overview-value');
        if (overviewValues.length > 0) {
            // Simulate data updates
            const newValues = ['26', '49/50', '5', '99.9%'];
            overviewValues.forEach((element, index) => {
                if (newValues[index]) {
                    element.textContent = newValues[index];
                }
            });
        }
    }
    
    startAutoRefresh() {
        // Refresh system activity every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.refreshActivityData();
            this.refreshOverviewData();
        }, 30 * 1000);
    }
    
    setupInactivityTimer() {
        let inactivityTimer;
        
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                this.handleInactivity();
            }, 30 * 60 * 1000); // 30 minutes
        };
        
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });
        
        resetTimer();
    }
    
    handleInactivity() {
        this.showNotification('Session will expire due to inactivity', 'warning');
        setTimeout(() => {
            this.logout();
        }, 60000); // 1 minute warning
    }
    
    handleKeyboardShortcuts(e) {
        // Ctrl + B to toggle sidebar
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            this.toggleSidebar();
        }
        
        // Ctrl + R to refresh data
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            this.refreshActivityData();
        }
        
        // Escape to close sidebar
        if (e.key === 'Escape' && this.isSidebarOpen) {
            this.toggleSidebar();
        }
    }
    
    logout() {
        // Clear session data
        sessionStorage.removeItem('borderPatrolSession');
        localStorage.removeItem('borderPatrolSession');
        
        // Clear refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.showNotification('Logging out...', 'info');
        
        setTimeout(() => {
            window.location.href = '/api/login-page/';
        }, 1000);
    }
    
    redirectToLogin() {
        window.location.href = '/api/login-page/';
    }
    
    showLoading(show) {
        if (show) {
            this.loadingOverlay.classList.add('active');
        } else {
            this.loadingOverlay.classList.remove('active');
        }
    }
    
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.notificationContainer.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
    
    // Admin functionality methods
    openAddOfficerModal() {
        this.showModal('addOfficerModal');
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }
    
    saveOfficer() {
        const form = document.getElementById('addOfficerForm');
        const formData = new FormData(form);
        
        const officerData = {
            name: formData.get('officerName'),
            badgeId: formData.get('officerBadgeId'),
            email: formData.get('officerEmail'),
            department: formData.get('officerDepartment'),
            rank: formData.get('officerRank'),
            phone: formData.get('officerPhone'),
            status: 'Off Duty',
            lastActive: new Date().toISOString()
        };
        
        // Validate form
        if (!this.validateOfficerForm(officerData)) {
            return;
        }
        
        // Add officer to mock data
        this.officers.push(officerData);
        
        // Update UI
        this.updateOfficersTable();
        this.updateOfficerStats();
        
        // Close modal and reset form
        this.closeModal('addOfficerModal');
        form.reset();
        
        this.showNotification('Officer added successfully', 'success');
    }
    
    validateOfficerForm(data) {
        if (!data.name || !data.badgeId || !data.email || !data.department || !data.rank || !data.phone) {
            this.showNotification('Please fill in all required fields', 'error');
            return false;
        }
        
        // Check if badge ID already exists
        if (this.officers.some(officer => officer.badgeId === data.badgeId)) {
            this.showNotification('Badge ID already exists', 'error');
            return false;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return false;
        }
        
        return true;
    }
    
    updateOfficersTable() {
        const tableBody = document.getElementById('officersTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        this.officers.forEach(officer => {
            const row = document.createElement('div');
            row.className = 'table-row';
            row.innerHTML = `
                <div class="table-cell">${officer.name}</div>
                <div class="table-cell">${officer.username || this.generateUsername(officer.name)}</div>
                <div class="table-cell">${officer.badgeId}</div>
                <div class="table-cell">
                    <span class="status-badge ${officer.isOnline ? 'online' : 'offline'}">${officer.isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <div class="table-cell">${new Date(officer.lastActive).toLocaleString()}</div>
                <div class="table-cell">
                    <div class="officer-actions">
                        <button class="action-btn-small" onclick="dashboard.editOfficer('${officer.badgeId}')">Edit</button>
                        <button class="action-btn-small delete" onclick="dashboard.deleteOfficer('${officer.badgeId}')">Delete</button>
                    </div>
                </div>
            `;
            tableBody.appendChild(row);
        });
    }

    generateUsername(name) {
        const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
        return `${base}`;
    }
    
    updateOfficerStats() {
        const totalOfficers = this.officers.length;
        const onDutyOfficers = this.officers.filter(officer => officer.status === 'On Duty').length;
        const offDutyOfficers = totalOfficers - onDutyOfficers;
        
        const totalElement = document.getElementById('totalOfficers');
        const onDutyElement = document.getElementById('onDutyOfficers');
        const offDutyElement = document.getElementById('offDutyOfficers');
        
        if (totalElement) totalElement.textContent = totalOfficers;
        if (onDutyElement) onDutyElement.textContent = onDutyOfficers;
        if (offDutyElement) offDutyElement.textContent = offDutyOfficers;
    }
    
    editOfficer(badgeId) {
        const officer = this.officers.find(o => o.badgeId === badgeId);
        if (officer) {
            // Pre-fill form with officer data
            document.getElementById('officerName').value = officer.name;
            document.getElementById('officerBadgeId').value = officer.badgeId;
            document.getElementById('officerEmail').value = officer.email;
            document.getElementById('officerDepartment').value = officer.department;
            document.getElementById('officerRank').value = officer.rank;
            document.getElementById('officerPhone').value = officer.phone;
            
            this.openAddOfficerModal();
        }
    }
    
    deleteOfficer(badgeId) {
        if (confirm('Are you sure you want to delete this officer?')) {
            this.officers = this.officers.filter(officer => officer.badgeId !== badgeId);
            this.updateOfficersTable();
            this.updateOfficerStats();
            this.showNotification('Officer deleted successfully', 'success');
        }
    }
    
    refreshOfficers() {
        this.showNotification('Officers data refreshed', 'info');
        // In a real app, this would fetch fresh data from the server
    }
    
    openUploadImageModal() {
        this.showModal('uploadImageModal');
    }
    
    uploadImage() {
        const form = document.getElementById('uploadImageForm');
        const formData = new FormData(form);
        const fileInput = document.getElementById('imageFile');

        if (!fileInput.files[0]) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        // Build multipart body for backend
        const body = new FormData();
        body.append('file', fileInput.files[0]);
        body.append('name', fileInput.files[0].name);
        body.append('description', formData.get('imageDescription') || '');
        body.append('category', formData.get('imageCategory') || '');
        body.append('priority', formData.get('imagePriority') || '');

        this.showLoading(true);
        fetch(`${this.backendUrl}/images/upload/`, {
            method: 'POST',
            body
        })
            .then(res => {
                if (!res.ok) throw new Error(`Upload failed (${res.status})`);
                return res.json();
            })
            .then(img => {
                // Refresh images from server
                return this.fetchImages().then(() => {
                    this.showNotification('Image uploaded successfully', 'success');
                    this.closeModal('uploadImageModal');
                    form.reset();
                });
            })
            .catch(err => {
                this.showNotification(`Upload error: ${err.message}`, 'error');
            })
            .finally(() => this.showLoading(false));
    }
    
    updateImagesGrid() {
        const imagesGrid = document.getElementById('imagesGrid');
        if (!imagesGrid) return;
        
        imagesGrid.innerHTML = '';
        
        this.images.forEach(image => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.innerHTML = `
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDE1MCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTIwIiBmaWxsPSIjMzM0MTU1Ii8+CjxwYXRoIGQ9Ik03NSAzMEM4NS4zMzMzIDMwIDkzLjMzMzMgMzggOTMuMzMzMyA0OC41VjcxLjVDOTMuMzMzMyA4MiA4NS4zMzMzIDkwIDc1IDkwQzY0LjY2NjcgOTAgNTYuNjY2NyA4MiA1Ni42NjY3IDcxLjVWNDguNUM1Ni42NjY3IDM4IDY0LjY2NjcgMzAgNzUgMzBaIiBmaWxsPSIjNjA2NjcyIi8+CjxwYXRoIGQ9Ik03NSA0MEM4MC41MjM4IDQwIDg1IDQ0LjQ3NjIgODUgNTBWNTVDODUgNTkuNTIzOCA4MC41MjM4IDY0IDc1IDY0QzY5LjQ3NjIgNjQgNjUgNTkuNTIzOCA2NSA1MFY1MEM2NSA0NC40NzYyIDY5LjQ3NjIgNDAgNzUgNDBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo=" alt="Image Preview" class="image-preview">
                <div class="image-info">
                    <h4>${image.name}</h4>
                    <p>${image.category} - ${image.priority}</p>
                </div>
                <div class="image-actions">
                    <button class="image-action-btn" onclick="dashboard.viewImage('${image.id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="image-action-btn" onclick="dashboard.deleteImage('${image.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            imagesGrid.appendChild(imageItem);
        });
    }
    
    updateImageStats() {
        const totalImages = this.images.length;
        const newToday = this.images.filter(image => {
            const today = new Date().toDateString();
            return new Date(image.uploadDate).toDateString() === today;
        }).length;
        
        const totalElement = document.getElementById('totalImages');
        const newTodayElement = document.getElementById('newToday');
        
        if (totalElement) totalElement.textContent = totalImages;
        if (newTodayElement) newTodayElement.textContent = newToday;
    }
    
    viewImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (image) {
            this.showNotification(`Viewing image: ${image.name}`, 'info');
            // In a real app, this would open an image viewer modal
        }
    }
    
    deleteImage(imageId) {
        if (confirm('Are you sure you want to delete this image?')) {
            this.images = this.images.filter(img => img.id !== imageId);
            this.updateImagesGrid();
            this.updateImageStats();
            this.showNotification('Image deleted successfully', 'success');
        }
    }
    
    refreshImages() {
        this.fetchImages().then(() => this.showNotification('Images data refreshed', 'success'));
    }

    fetchImages() {
        return fetch(`${this.backendUrl}/images/`)
            .then(res => res.json())
            .then(data => {
                this.images = (data.images || []).map(i => ({
                    id: i.id,
                    name: i.name,
                    description: i.description,
                    category: i.category,
                    priority: i.priority,
                    uploadDate: i.uploaded_at,
                    size: i.size,
                    url: i.url
                }));
                this.updateImagesGrid();
                this.updateImageStats();
            })
            .catch(() => {
                this.showNotification('Failed to load images', 'error');
            });
    }
    
    viewAllIncidents() {
        this.showNotification('Opening all incidents view', 'info');
        // In a real app, this would navigate to a full incidents page
    }
    
    refreshIncidents() {
        this.showNotification('Incidents data refreshed', 'info');
        // In a real app, this would fetch fresh data from the server
    }
    
    submitIncidentResponse() {
        const form = document.getElementById('incidentResponseForm');
        const formData = new FormData(form);
        
        const responseData = {
            type: formData.get('responseType'),
            message: formData.get('responseMessage'),
            assignedOfficer: formData.get('assignedOfficer'),
            timestamp: new Date().toISOString()
        };
        
        if (!responseData.type || !responseData.message) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Close modal and reset form
        this.closeModal('incidentResponseModal');
        form.reset();
        
        this.showNotification('Incident response submitted successfully', 'success');
    }
    
    // Password Reset Methods
    openPasswordResetModal() {
        this.populateOfficerSelect();
        this.showModal('passwordResetModal');
    }
    
    populateOfficerSelect() {
        const select = document.getElementById('resetOfficerSelect');
        if (!select) return;
        
        // Clear existing options except the first one
        select.innerHTML = '<option value="">Select Officer to Reset Password</option>';
        
        // Add officers to select
        this.officers.forEach(officer => {
            const option = document.createElement('option');
            option.value = officer.badgeId;
            option.textContent = `${officer.name} (${officer.badgeId})`;
            select.appendChild(option);
        });
    }
    
    handleResetMethodChange() {
        const method = document.getElementById('resetMethod').value;
        const emailMessageGroup = document.getElementById('emailMessageGroup');
        const temporaryPasswordGroup = document.getElementById('temporaryPasswordGroup');
        
        // Hide all conditional groups
        if (emailMessageGroup) emailMessageGroup.style.display = 'none';
        if (temporaryPasswordGroup) temporaryPasswordGroup.style.display = 'none';
        
        // Show relevant group based on method
        if (method === 'email' && emailMessageGroup) {
            emailMessageGroup.style.display = 'block';
        } else if (method === 'temporary' && temporaryPasswordGroup) {
            temporaryPasswordGroup.style.display = 'block';
            this.generateTemporaryPassword();
        }
    }
    
    handleResetReasonChange() {
        const reason = document.getElementById('resetReason').value;
        const customReasonGroup = document.getElementById('customReasonGroup');
        
        if (customReasonGroup) {
            customReasonGroup.style.display = reason === 'other' ? 'block' : 'none';
        }
    }
    
    generateTemporaryPassword() {
        const passwordField = document.getElementById('temporaryPassword');
        const generateBtn = document.getElementById('generatePassword');
        
        if (!passwordField || !generateBtn) return;
        
        // Add loading animation
        generateBtn.classList.add('password-generating');
        
        // Simulate password generation delay
        setTimeout(() => {
            const password = this.createSecurePassword();
            passwordField.value = password;
            generateBtn.classList.remove('password-generating');
        }, 1000);
    }
    
    createSecurePassword() {
        const length = 12;
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        
        // Ensure at least one character from each required type
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
        password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
        password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special char
        
        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
    
    copyTemporaryPassword() {
        const passwordField = document.getElementById('temporaryPassword');
        const copyBtn = document.getElementById('copyPassword');
        
        if (!passwordField || !passwordField.value) {
            this.showNotification('No password to copy', 'warning');
            return;
        }
        
        navigator.clipboard.writeText(passwordField.value).then(() => {
            copyBtn.classList.add('copy-success');
            this.showNotification('Password copied to clipboard', 'success');
            
            setTimeout(() => {
                copyBtn.classList.remove('copy-success');
            }, 1000);
        }).catch(() => {
            this.showNotification('Failed to copy password', 'error');
        });
    }
    
    submitPasswordReset() {
        const form = document.getElementById('passwordResetForm');
        const formData = new FormData(form);
        
        const resetData = {
            officerBadgeId: formData.get('resetOfficerSelect'),
            method: formData.get('resetMethod'),
            reason: formData.get('resetReason'),
            customReason: formData.get('customReason'),
            emailMessage: formData.get('emailMessage'),
            temporaryPassword: formData.get('temporaryPassword')
        };
        
        // Validation
        if (!resetData.officerBadgeId || !resetData.method || !resetData.reason) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        if (resetData.reason === 'other' && !resetData.customReason) {
            this.showNotification('Please provide a custom reason', 'error');
            return;
        }
        
        // Find the officer
        const officer = this.officers.find(o => o.badgeId === resetData.officerBadgeId);
        if (!officer) {
            this.showNotification('Officer not found', 'error');
            return;
        }
        
        // Process the password reset
        this.processPasswordReset(officer, resetData);
        
        // Close modal and reset form
        this.closeModal('passwordResetModal');
        form.reset();
    }
    
    processPasswordReset(officer, resetData) {
        const resetId = 'PR' + Date.now();
        const timestamp = new Date().toISOString();
        
        // Create password reset record
        const passwordReset = {
            id: resetId,
            officerBadgeId: officer.badgeId,
            officerName: officer.name,
            officerEmail: officer.email,
            method: resetData.method,
            reason: resetData.reason === 'other' ? resetData.customReason : resetData.reason,
            status: 'sent',
            timestamp: timestamp,
            adminId: this.currentUser.badgeId,
            adminName: this.currentUser.name
        };
        
        // Add to password resets array
        this.passwordResets.unshift(passwordReset);
        
        // Update UI
        this.updatePasswordResetList();
        this.updatePasswordStats();
        
        // Simulate email sending
        this.simulateEmailSending(officer, resetData, passwordReset);
        
        this.showNotification(`Password reset ${resetData.method} sent to ${officer.name}`, 'success');
    }
    
    simulateEmailSending(officer, resetData, passwordReset) {
        // Simulate email sending delay
        setTimeout(() => {
            // Update status to completed
            passwordReset.status = 'completed';
            this.updatePasswordResetList();
            this.updatePasswordStats();
            
            // Show email preview (for demo purposes)
            this.showEmailPreview(officer, resetData, passwordReset);
        }, 2000);
    }
    
    showEmailPreview(officer, resetData, passwordReset) {
        const emailContent = this.generateEmailContent(officer, resetData, passwordReset);
        
        // Create email preview modal (simplified for demo)
        const preview = document.createElement('div');
        preview.className = 'email-preview';
        preview.innerHTML = `
            <h4>Email Preview - Password Reset</h4>
            <div class="email-header">
                <strong>To:</strong> ${officer.email}<br>
                <strong>From:</strong> admin@borderpatrol.gov<br>
                <strong>Subject:</strong> Password Reset Request - Border Patrol System
            </div>
            <div class="email-body">
                ${emailContent}
            </div>
        `;
        
        // Show notification with email preview
        this.showNotification('Email sent successfully', 'success');
        
        // Remove preview after 5 seconds
        setTimeout(() => {
            if (preview.parentNode) {
                preview.parentNode.removeChild(preview);
            }
        }, 5000);
    }
    
    generateEmailContent(officer, resetData, passwordReset) {
        let content = `
            <p>Dear ${officer.name},</p>
            <p>Your password has been reset by an administrator for the following reason: <strong>${passwordReset.reason}</strong></p>
        `;
        
        if (resetData.method === 'email') {
            content += `
                <p>Please click the following link to reset your password:</p>
                <p><a href="#" style="color: #3b82f6;">Reset Password Link</a></p>
                <p><strong>Note:</strong> This link will expire in 24 hours.</p>
            `;
        } else if (resetData.method === 'temporary') {
            content += `
                <p>Your temporary password is: <strong style="font-family: monospace; background: #f1f5f9; padding: 2px 4px; border-radius: 3px;">${resetData.temporaryPassword}</strong></p>
                <p><strong>Important:</strong> Please change this password immediately after logging in.</p>
            `;
        } else if (resetData.method === 'force') {
            content += `
                <p>You will be required to change your password the next time you log in to the system.</p>
            `;
        }
        
        if (resetData.emailMessage) {
            content += `<p><strong>Additional Message:</strong> ${resetData.emailMessage}</p>`;
        }
        
        content += `
            <p>If you did not request this password reset, please contact your administrator immediately.</p>
            <p>Best regards,<br>Border Patrol Administration</p>
        `;
        
        return content;
    }
    
    refreshPasswordResets() {
        this.updatePasswordResetList();
        this.updatePasswordStats();
        this.showNotification('Password reset data refreshed', 'success');
    }
    
    updatePasswordResetList() {
        const container = document.getElementById('passwordResetList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.passwordResets.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-tertiary); padding: 2rem;">No password resets found</p>';
            return;
        }
        
        this.passwordResets.forEach(reset => {
            const item = document.createElement('div');
            item.className = 'password-reset-item';
            
            const statusClass = reset.status === 'completed' ? 'completed' : 
                               reset.status === 'sent' ? 'sent' : 
                               reset.status === 'failed' ? 'failed' : 'pending';
            
            item.innerHTML = `
                <div class="password-reset-info">
                    <h4>${reset.officerName} (${reset.officerBadgeId})</h4>
                    <p>Method: ${reset.method} | Reason: ${reset.reason}</p>
                    <div class="password-reset-meta">
                        <span>Admin: ${reset.adminName}</span>
                        <span>•</span>
                        <span>${new Date(reset.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                <div class="password-reset-actions">
                    <span class="password-reset-status ${statusClass}">${reset.status}</span>
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    updatePasswordStats() {
        const totalResets = this.passwordResets.length;
        const thisWeek = this.passwordResets.filter(reset => {
            const resetDate = new Date(reset.timestamp);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return resetDate > weekAgo;
        }).length;
        const pending = this.passwordResets.filter(reset => reset.status === 'pending').length;
        
        const totalElement = document.getElementById('passwordResets');
        const weekElement = document.getElementById('resetsThisWeek');
        const pendingElement = document.getElementById('pendingResets');
        
        if (totalElement) totalElement.textContent = totalResets;
        if (weekElement) weekElement.textContent = thisWeek;
        if (pendingElement) pendingElement.textContent = pending;
    }
    
    // Profile Management Methods
    openProfileModal() {
        this.loadProfileData();
        this.showModal('profileModal');
    }
    
    loadProfileData() {
        if (!this.currentUser) return;
        
        // Load current user data into profile form
        const profileData = {
            name: this.currentUser.name || 'Unknown',
            badgeId: this.currentUser.badgeId || 'N/A',
            email: this.currentUser.email || '',
            department: this.currentUser.department || 'Field Operations',
            rank: this.currentUser.rank || 'Agent',
            phone: this.currentUser.phone || '',
            bio: this.currentUser.bio || ''
        };
        
        // Populate form fields
        document.getElementById('profileName').value = profileData.name;
        document.getElementById('profileBadgeId').value = profileData.badgeId;
        document.getElementById('profileEmail').value = profileData.email;
        document.getElementById('profileDepartment').value = profileData.department;
        document.getElementById('profileRank').value = profileData.rank;
        document.getElementById('profilePhone').value = profileData.phone;
        document.getElementById('profileBio').value = profileData.bio;
    }
    
    saveProfile() {
        const form = document.getElementById('profileForm');
        const formData = new FormData(form);
        
        const profileData = {
            name: formData.get('profileName'),
            email: formData.get('profileEmail'),
            department: formData.get('profileDepartment'),
            rank: formData.get('profileRank'),
            phone: formData.get('profilePhone'),
            bio: formData.get('profileBio')
        };
        
        // Validation
        if (!profileData.name || !profileData.email) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Update current user data
        this.currentUser = { ...this.currentUser, ...profileData };
        
        // Update UI
        this.userName.textContent = profileData.name;
        
        // Close modal
        this.closeModal('profileModal');
        
        this.showNotification('Profile updated successfully', 'success');
    }
    
    uploadAvatar() {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const avatar = document.getElementById('profileAvatar');
                    avatar.src = e.target.result;
                    this.showNotification('Avatar updated successfully', 'success');
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    }
    
    // Password Viewing Methods
    openViewPasswordsModal() {
        this.loadPasswordsData();
        this.showModal('viewPasswordsModal');
    }
    
    loadPasswordsData() {
        const tbody = document.getElementById('passwordsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Generate mock passwords for officers
        this.officers.forEach(officer => {
            const row = document.createElement('tr');
            const password = this.generateMockPassword(officer.badgeId);
            const lastChanged = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
            
            row.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <img src="https://via.placeholder.com/32x32/3b82f6/ffffff?text=${officer.name.charAt(0)}" 
                             alt="${officer.name}" style="width: 32px; height: 32px; border-radius: 50%;">
                        <span>${officer.name}</span>
                    </div>
                </td>
                <td>${officer.badgeId}</td>
                <td>${officer.department}</td>
                <td>
                    <div class="password-cell">
                        <span class="password-text">${password}</span>
                    </div>
                </td>
                <td>${lastChanged.toLocaleDateString()}</td>
                <td>
                    <div class="password-actions">
                        <button class="password-action-btn copy" onclick="navigator.clipboard.writeText('${password}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button class="password-action-btn reset" onclick="window.dashboard.resetOfficerPassword('${officer.badgeId}')">
                            <i class="fas fa-key"></i> Reset
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    generateMockPassword(badgeId) {
        // Generate a consistent mock password based on badge ID
        const base = badgeId.toLowerCase().replace('bp', '');
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = base;
        
        // Add random characters to make it look like a real password
        for (let i = 0; i < 8; i++) {
            password += chars[Math.floor(Math.random() * chars.length)];
        }
        
        return password;
    }
    
    filterPasswords() {
        const searchTerm = document.getElementById('passwordSearch').value.toLowerCase();
        const departmentFilter = document.getElementById('departmentFilter').value;
        const rows = document.querySelectorAll('#passwordsTableBody tr');
        
        rows.forEach(row => {
            const name = row.cells[0].textContent.toLowerCase();
            const badgeId = row.cells[1].textContent.toLowerCase();
            const department = row.cells[2].textContent;
            
            const matchesSearch = name.includes(searchTerm) || badgeId.includes(searchTerm);
            const matchesDepartment = !departmentFilter || department === departmentFilter;
            
            row.style.display = (matchesSearch && matchesDepartment) ? '' : 'none';
        });
    }
    
    exportPasswords() {
        const rows = document.querySelectorAll('#passwordsTableBody tr:not([style*="display: none"])');
        let csv = 'Officer,Badge ID,Department,Password,Last Changed\n';
        
        rows.forEach(row => {
            const name = row.cells[0].textContent.trim();
            const badgeId = row.cells[1].textContent.trim();
            const department = row.cells[2].textContent.trim();
            const password = row.cells[3].textContent.trim();
            const lastChanged = row.cells[4].textContent.trim();
            
            csv += `"${name}","${badgeId}","${department}","${password}","${lastChanged}"\n`;
        });
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'officer_passwords.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showNotification('Passwords exported successfully', 'success');
    }
    
    resetOfficerPassword(badgeId) {
        const officer = this.officers.find(o => o.badgeId === badgeId);
        if (officer) {
            this.showNotification(`Password reset initiated for ${officer.name}`, 'success');
            // Close password view modal and open reset modal
            this.closeModal('viewPasswordsModal');
            this.openPasswordResetModal();
            // Pre-select the officer
            document.getElementById('resetOfficerSelect').value = badgeId;
        }
    }
    
    // Sidebar Content Display Methods
    showSystemOverview() {
        this.showNotification('System Overview - Opening management interface', 'info');
        // This would open the system overview modal or navigate to a dedicated page
    }
    
    showSystemActivity() {
        this.showNotification('System Activity - Opening activity logs', 'info');
        // This would show the system activity interface
    }
    
    showOfficerManagement() {
        this.showNotification('Officer Management - Opening officer management interface', 'info');
        // This would open the officer management interface
    }
    
    showIncidentManagement() {
        this.showNotification('Incident Management - Opening incident management interface', 'info');
        // This would open the incident management interface
    }
    
    showImageManagement() {
        this.showNotification('Image Management - Opening image management interface', 'info');
        // This would open the image management interface
    }
    
    showPasswordManagement() {
        this.showNotification('Password Management - Opening password management interface', 'info');
        // This would open the password management interface
    }
    
    showImageUpload() {
        this.showNotification('Image Upload - Opening image upload interface', 'info');
        // This would show the image upload interface for officers
    }
    
    // Page Data Loading Methods
    loadSystemOverviewData() {
        this.showNotification('Loading system overview data...', 'info');
        // Implementation would load real system overview data
    }
    
    loadSystemActivityData() {
        this.showNotification('Loading system activity logs...', 'info');
        // Implementation would load real activity data
    }
    
    loadOfficerManagementData() {
        this.showNotification('Loading officer management data...', 'info');
        // Implementation would load real officer data
    }
    
    loadIncidentManagementData() {
        this.showNotification('Loading incident management data...', 'info');
        // Implementation would load real incident data
    }
    
    loadImageManagementData() {
        this.showNotification('Loading image management data...', 'info');
        // Implementation would load real image data
    }
    
    loadPasswordManagementData() {
        this.showNotification('Loading password management data...', 'info');
        // Implementation would load real password data
    }
    
    loadImageUploadData() {
        this.showNotification('Preparing image upload interface...', 'info');
        // Implementation would prepare upload interface
    }
    
    loadIncidentsData() {
        this.showNotification('Loading your incidents...', 'info');
        // Implementation would load officer-specific incident data
    }
    
    loadPatrolData() {
        this.showNotification('Loading patrol route data...', 'info');
        // Implementation would load patrol data
    }
    
    loadReportsData() {
        this.showNotification('Loading reports data...', 'info');
        // Implementation would load report data
    }
    
    loadIncidentsReportingData() {
        this.showNotification('Loading incident reporting data...', 'info');
        // Load officer's incidents for reporting
        this.loadOfficerIncidents();
    }
    
    loadDailyReportsData() {
        this.showNotification('Loading daily reports data...', 'info');
        // Load officer's daily reports
        this.loadOfficerDailyReports();
    }
    
    loadOfficerIncidents() {
        const incidentsList = document.getElementById('officerIncidentsList');
        if (!incidentsList) return;
        
        // Mock data for officer incidents
        const officerIncidents = [
            {
                id: 'INC001',
                title: 'Suspicious Activity at Checkpoint Alpha',
                description: 'Unusual behavior detected at northern checkpoint',
                priority: 'high',
                status: 'Open',
                timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                location: 'Checkpoint Alpha',
                assignedOfficer: this.currentUser?.name || 'Current Officer'
            },
            {
                id: 'INC002',
                title: 'Vehicle Inspection Required',
                description: 'Vehicle flagged for detailed inspection',
                priority: 'medium',
                status: 'In Progress',
                timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
                location: 'Checkpoint Beta',
                assignedOfficer: this.currentUser?.name || 'Current Officer'
            },
            {
                id: 'INC003',
                title: 'Border Crossing Violation',
                description: 'Individual attempted unauthorized crossing',
                priority: 'high',
                status: 'Resolved',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                location: 'Sector C',
                assignedOfficer: this.currentUser?.name || 'Current Officer'
            }
        ];
        
        incidentsList.innerHTML = '';
        
        officerIncidents.forEach(incident => {
            const incidentItem = document.createElement('div');
            incidentItem.className = 'incident-item';
            incidentItem.innerHTML = `
                <div class="incident-header">
                    <h4>${incident.title}</h4>
                    <span class="incident-priority ${incident.priority}">${incident.priority.toUpperCase()}</span>
                </div>
                <div class="incident-details">
                    <p>${incident.description}</p>
                    <div class="incident-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${incident.location}</span>
                        <span><i class="fas fa-clock"></i> ${new Date(incident.timestamp).toLocaleString()}</span>
                        <span class="incident-status ${incident.status.toLowerCase().replace(' ', '-')}">${incident.status}</span>
                    </div>
                </div>
                <div class="incident-actions">
                    <button class="btn btn-sm btn-primary" onclick="dashboard.viewIncidentDetails('${incident.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="dashboard.updateIncidentStatus('${incident.id}')">
                        <i class="fas fa-edit"></i> Update Status
                    </button>
                </div>
            `;
            incidentsList.appendChild(incidentItem);
        });
    }
    
    loadOfficerDailyReports() {
        const reportsList = document.getElementById('dailyReportsList');
        if (!reportsList) return;
        
        // Mock data for daily reports
        const dailyReports = [
            {
                id: 'DR001',
                date: new Date().toISOString().split('T')[0],
                title: 'Daily Patrol Report - Sector A',
                status: 'Draft',
                incidents: 3,
                arrests: 1,
                inspections: 15
            },
            {
                id: 'DR002',
                date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                title: 'Daily Patrol Report - Sector B',
                status: 'Submitted',
                incidents: 2,
                arrests: 0,
                inspections: 12
            },
            {
                id: 'DR003',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                title: 'Daily Patrol Report - Sector C',
                status: 'Approved',
                incidents: 1,
                arrests: 1,
                inspections: 18
            }
        ];
        
        reportsList.innerHTML = '';
        
        dailyReports.forEach(report => {
            const reportItem = document.createElement('div');
            reportItem.className = 'daily-report-item';
            reportItem.innerHTML = `
                <div class="report-header">
                    <h4>${report.title}</h4>
                    <span class="report-date">${new Date(report.date).toLocaleDateString()}</span>
                </div>
                <div class="report-stats">
                    <div class="stat">
                        <span class="stat-number">${report.incidents}</span>
                        <span class="stat-label">Incidents</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${report.arrests}</span>
                        <span class="stat-label">Arrests</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${report.inspections}</span>
                        <span class="stat-label">Inspections</span>
                    </div>
                </div>
                <div class="report-actions">
                    <span class="report-status ${report.status.toLowerCase()}">${report.status}</span>
                    <div class="report-buttons">
                        <button class="btn btn-sm btn-primary" onclick="dashboard.viewDailyReport('${report.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${report.status === 'Draft' ? `
                            <button class="btn btn-sm btn-success" onclick="dashboard.editDailyReport('${report.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            reportsList.appendChild(reportItem);
        });
    }
    
    // Initialize mock data
    initializeMockData() {
        // Mock officers data
        this.officers = [
            {
                name: 'Officer Martinez',
                username: 'o.martinez',
                badgeId: 'BP001',
                email: 'martinez@borderpatrol.gov',
                department: 'Field Operations',
                rank: 'Senior Agent',
                phone: '(555) 123-4567',
                isOnline: true,
                lastActive: new Date(Date.now() - 1000 * 60 * 30).toISOString()
            },
            {
                name: 'Officer Chen',
                username: 'c.chen',
                badgeId: 'BP002',
                email: 'chen@borderpatrol.gov',
                department: 'Intelligence',
                rank: 'Agent',
                phone: '(555) 234-5678',
                isOnline: false,
                lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
            }
        ];
        
        // Mock incidents data
        this.incidents = [
            {
                id: 'INC001',
                title: 'Suspicious Activity at Checkpoint Alpha',
                description: 'Unusual behavior detected at northern checkpoint',
                priority: 'high',
                status: 'Open',
                timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
            },
            {
                id: 'INC002',
                title: 'Vehicle Inspection Required',
                description: 'Vehicle flagged for detailed inspection',
                priority: 'medium',
                status: 'Open',
                timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
            }
        ];
        
        // Mock images data
        this.images = [
            {
                id: 'IMG001',
                name: 'suspect_001.jpg',
                description: 'Suspicious individual at border crossing',
                category: 'Suspect',
                priority: 'High',
                uploadDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                size: 2048000
            }
        ];
        
        // Mock password reset data
        this.passwordResets = [
            {
                id: 'PR001',
                officerBadgeId: 'BP001',
                officerName: 'Officer Martinez',
                officerEmail: 'martinez@borderpatrol.gov',
                method: 'email',
                reason: 'Officer Forgot Password',
                status: 'completed',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                adminId: 'ADMIN001',
                adminName: 'Administrator'
            },
            {
                id: 'PR002',
                officerBadgeId: 'BP002',
                officerName: 'Officer Chen',
                officerEmail: 'chen@borderpatrol.gov',
                method: 'temporary',
                reason: 'Security Breach',
                status: 'completed',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                adminId: 'ADMIN001',
                adminName: 'Administrator'
            }
        ];
        
        // Mock alerts data
        this.alerts = [
            { id: 'ALR001', severity: 'critical', title: 'Unauthorized access attempt', description: 'Multiple failed login attempts detected from IP 10.0.1.24 targeting admin accounts.', time: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
            { id: 'ALR002', severity: 'high', title: 'Camera offline', description: 'Surveillance camera CAM-12 in Sector B lost connection. Last ping 4 minutes ago.', time: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
            { id: 'ALR003', severity: 'medium', title: 'Unusual traffic volume', description: 'Higher than normal API traffic detected on /recognize endpoint.', time: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
            { id: 'ALR004', severity: 'low', title: 'Scheduled maintenance', description: 'Planned database maintenance at 02:00 UTC.', time: new Date(Date.now() - 1000 * 60 * 60).toISOString() }
        ];

        // Mock audit logs
        this.auditLogs = [
            { id: 'LOG001', ts: new Date(Date.now() - 1000 * 60 * 3).toISOString(), user: 'Administrator', role: 'admin', action: 'create', target: 'Officer BP010', details: 'Added new officer record' },
            { id: 'LOG002', ts: new Date(Date.now() - 1000 * 60 * 12).toISOString(), user: 'Officer Martinez', role: 'officer', action: 'update', target: 'Report REP221', details: 'Updated incident description' },
            { id: 'LOG003', ts: new Date(Date.now() - 1000 * 60 * 25).toISOString(), user: 'Administrator', role: 'admin', action: 'delete', target: 'Image IMG104', details: 'Removed outdated image' },
            { id: 'LOG004', ts: new Date(Date.now() - 1000 * 60 * 28).toISOString(), user: 'Officer Chen', role: 'officer', action: 'login', target: 'Dashboard', details: 'Successful login' },
            { id: 'LOG005', ts: new Date(Date.now() - 1000 * 60 * 45).toISOString(), user: 'Administrator', role: 'admin', action: 'reset', target: 'Password BP001', details: 'Password reset issued' }
        ];
        
        // Update UI with mock data
        this.updateOfficersTable();
        this.updateOfficerStats();
        this.updateImagesGrid();
        this.updateImageStats();
        this.updatePasswordResetList();
        this.updatePasswordStats();
    }

    // Alerts page population
    loadAlertsData() {
        const list = document.getElementById('alertsList');
        if (!list) return;
        list.innerHTML = '';
        this.alerts.forEach(a => {
            const item = document.createElement('div');
            item.className = `alert-item ${a.severity}`;
            item.innerHTML = `
                <div class="alert-icon"><i class="fas ${a.severity === 'critical' ? 'fa-exclamation-triangle' : a.severity === 'high' ? 'fa-exclamation-circle' : a.severity === 'medium' ? 'fa-info-circle' : 'fa-bell'}"></i></div>
                <div class="alert-details">
                    <h4>${a.title}</h4>
                    <p>${a.description}</p>
                    <div class="alert-time">${new Date(a.time).toLocaleString()}</div>
                </div>
                <button class="alert-action" onclick="dashboard.dismissAlert('${a.id}')">Dismiss</button>
            `;
            list.appendChild(item);
        });
    }

    dismissAlert(id) {
        this.alerts = this.alerts.filter(a => a.id !== id);
        this.loadAlertsData();
        this.showNotification('Alert dismissed', 'success');
    }

    // Analytics placeholder
    loadAnalyticsData() {
        fetch(`${this.backendUrl}/analytics/overview/`)
            .then(res => res.json())
            .then(data => {
                // Optionally update UI values if present
                this.showNotification('Analytics data loaded', 'success');
            })
            .catch(() => this.showNotification('Failed to load analytics', 'error'));
    }

    // Audit logs with sorting and privilege filter
    loadAuditLogsData() {
        const list = document.getElementById('auditLogsList');
        if (!list) return;
        list.innerHTML = '';

        const start = document.getElementById('auditStartDate')?.value;
        const end = document.getElementById('auditEndDate')?.value;
        const userFilter = document.getElementById('auditUserFilter')?.value || '';
        const actionFilter = document.getElementById('auditActionFilter')?.value || '';

        const url = new URL(`${this.backendUrl}/audit-logs/`);
        if (start) url.searchParams.set('start', start);
        if (end) url.searchParams.set('end', end);
        if (userFilter) url.searchParams.set('role', userFilter);
        if (actionFilter) url.searchParams.set('action', actionFilter);

        fetch(url.toString())
            .then(res => res.json())
            .then(data => {
                const logs = (data.logs || []).sort((a,b) => new Date(b.ts) - new Date(a.ts));
                logs.forEach(log => {
                    const item = document.createElement('div');
                    item.className = 'audit-log-item';
                    item.innerHTML = `
                        <div class="audit-log-icon ${log.action}"><i class="fas ${this.getAuditIcon(log.action)}"></i></div>
                        <div class="audit-log-details">
                            <h4>${log.user} • ${log.action.toUpperCase()} • ${log.target}</h4>
                            <p>${log.details}</p>
                        </div>
                        <div class="audit-log-meta">
                            <div class="audit-log-time">${new Date(log.ts).toLocaleString()}</div>
                            <div class="audit-log-user">${log.role}</div>
                        </div>
                    `;
                    list.appendChild(item);
                });

                ['auditStartDate','auditEndDate','auditUserFilter','auditActionFilter'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el && !el._auditBound) {
                        el.addEventListener('change', () => this.loadAuditLogsData());
                        el._auditBound = true;
                    }
                });
            })
            .catch(() => this.showNotification('Failed to load audit logs', 'error'));
    }

    getAuditIcon(action) {
        switch(action) {
            case 'login': return 'fa-sign-in-alt';
            case 'logout': return 'fa-sign-out-alt';
            case 'create': return 'fa-plus-circle';
            case 'update': return 'fa-edit';
            case 'delete': return 'fa-trash';
            case 'reset': return 'fa-key';
            default: return 'fa-info-circle';
        }
    }
    
    setupOfficerEventListeners() {
        // New Incident button
        const newIncidentBtn = document.getElementById('newIncidentBtn');
        if (newIncidentBtn) {
            newIncidentBtn.addEventListener('click', () => this.createNewIncident());
        }
        
        // New Daily Report button
        const newDailyReportBtn = document.getElementById('newDailyReportBtn');
        if (newDailyReportBtn) {
            newDailyReportBtn.addEventListener('click', () => this.createNewDailyReport());
        }
        
        // Start Patrol button
        const startPatrolBtn = document.getElementById('startPatrolBtn');
        if (startPatrolBtn) {
            startPatrolBtn.addEventListener('click', () => this.startPatrol());
        }
        
        // Generate Report button
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateReport());
        }
        
        // Refresh buttons for officer pages
        const refreshIncidentsBtn = document.getElementById('refreshIncidentsBtn');
        if (refreshIncidentsBtn) {
            refreshIncidentsBtn.addEventListener('click', () => this.loadIncidentsReportingData());
        }
        
        const refreshDailyReportsBtn = document.getElementById('refreshDailyReportsBtn');
        if (refreshDailyReportsBtn) {
            refreshDailyReportsBtn.addEventListener('click', () => this.loadDailyReportsData());
        }
        
        const refreshRoutesBtn = document.getElementById('refreshRoutesBtn');
        if (refreshRoutesBtn) {
            refreshRoutesBtn.addEventListener('click', () => this.loadPatrolData());
        }
        
        const refreshReportsBtn = document.getElementById('refreshReportsBtn');
        if (refreshReportsBtn) {
            refreshReportsBtn.addEventListener('click', () => this.loadReportsData());
        }
    }
    
    setupOfficerImageUpload() {
        // Officer image upload button
        if (this.officerUploadBtn) {
            this.officerUploadBtn.addEventListener('click', () => this.triggerImageUpload());
        }
        
        // File input change
        if (this.imageFileInput) {
            this.imageFileInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        
        // Drag and drop functionality
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
            uploadArea.addEventListener('click', () => this.triggerImageUpload());
        }
    }
    
    triggerImageUpload() {
        if (this.imageFileInput) {
            this.imageFileInput.click();
        }
    }
    
    handleImageUpload(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    this.uploadOfficerImage(file);
                } else {
                    this.showNotification('Please select only image files', 'error');
                }
            });
        }
    }
    
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.style.borderColor = 'var(--secondary-blue)';
        event.currentTarget.style.background = 'var(--bg-card-hover)';
    }
    
    handleDragLeave(event) {
        event.preventDefault();
        event.currentTarget.style.borderColor = 'var(--border-primary)';
        event.currentTarget.style.background = 'transparent';
    }
    
    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.style.borderColor = 'var(--border-primary)';
        event.currentTarget.style.background = 'transparent';
        
        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    this.uploadOfficerImage(file);
                } else {
                    this.showNotification('Please select only image files', 'error');
                }
            });
        }
    }
    
    uploadOfficerImage(file) {
        // Create image data object
        const imageData = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            uploadDate: new Date().toISOString(),
            description: '', // Officers can add description later
            category: 'Officer Upload',
            priority: 'Medium'
        };
        
        // Create FileReader to preview image
        const reader = new FileReader();
        reader.onload = (e) => {
            imageData.preview = e.target.result;
            
            // Add to images array
            this.images.push(imageData);
            
            // Update UI
            this.updateOfficerUploadedImages();
            
            this.showNotification(`Image "${file.name}" uploaded successfully`, 'success');
        };
        
        reader.readAsDataURL(file);
    }
    
    updateOfficerUploadedImages() {
        if (!this.uploadedImages) return;
        
        // Filter images uploaded by officers
        const officerImages = this.images.filter(img => img.category === 'Officer Upload');
        
        this.uploadedImages.innerHTML = '';
        
        officerImages.forEach(image => {
            const imageItem = document.createElement('div');
            imageItem.className = 'uploaded-image-item';
            imageItem.innerHTML = `
                <img src="${image.preview}" alt="${image.name}" class="uploaded-image-preview">
                <div class="uploaded-image-info">
                    <h4>${image.name}</h4>
                    <p>${this.formatFileSize(image.size)}</p>
                </div>
                <div class="uploaded-image-actions">
                    <button class="uploaded-image-action-btn" onclick="dashboard.viewOfficerImage('${image.id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="uploaded-image-action-btn" onclick="dashboard.deleteOfficerImage('${image.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            this.uploadedImages.appendChild(imageItem);
        });
    }
    
    viewOfficerImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (image) {
            this.showNotification(`Viewing image: ${image.name}`, 'info');
            // In a real app, this would open an image viewer modal
        }
    }
    
    deleteOfficerImage(imageId) {
        if (confirm('Are you sure you want to delete this image?')) {
            this.images = this.images.filter(img => img.id !== imageId);
            this.updateOfficerUploadedImages();
            this.showNotification('Image deleted successfully', 'success');
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Officer-specific action methods
    viewIncidentDetails(incidentId) {
        this.showNotification(`Viewing incident details for ${incidentId}`, 'info');
        // In a real app, this would open a detailed incident view modal
    }
    
    updateIncidentStatus(incidentId) {
        this.showNotification(`Updating status for incident ${incidentId}`, 'info');
        // In a real app, this would open a status update modal
    }
    
    viewDailyReport(reportId) {
        this.showNotification(`Viewing daily report ${reportId}`, 'info');
        // In a real app, this would open a detailed report view modal
    }
    
    editDailyReport(reportId) {
        this.showNotification(`Editing daily report ${reportId}`, 'info');
        // In a real app, this would open a report editor modal
    }
    
    createNewIncident() {
        this.showNotification('Creating new incident report...', 'info');
        // In a real app, this would open a new incident form modal
    }
    
    createNewDailyReport() {
        this.showNotification('Creating new daily report...', 'info');
        // In a real app, this would open a new report form modal
    }
    
    startPatrol() {
        this.showNotification('Starting patrol route...', 'info');
        // In a real app, this would start GPS tracking and patrol monitoring
    }
    
    generateReport() {
        this.showNotification('Generating report...', 'info');
        // In a real app, this would open a report generation interface
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new BorderPatrolDashboard();
    window.dashboard.initializeMockData();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        window.dashboard.destroy();
    });
});

// Prevent right-click and F12 in production
if (window.location.hostname !== 'localhost') {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
            e.preventDefault();
        }
    });
}
