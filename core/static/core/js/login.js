// Border Patrol Login System
class BorderPatrolLogin {
    constructor() {
        this.currentRole = null;
        this.attempts = 0;
        this.maxAttempts = 3;
        this.lockoutTime = 5 * 60 * 1000; // 5 minutes
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        
        // DOM Elements
        this.roleSelection = document.getElementById('roleSelection');
        this.loginForm = document.getElementById('loginForm');
        this.backBtn = document.getElementById('backBtn');
        this.formTitle = document.getElementById('formTitle');
        this.roleIndicator = document.getElementById('roleIndicator');
        this.badgeIdInput = document.getElementById('badgeId');
        this.passwordInput = document.getElementById('password');
        this.togglePasswordBtn = document.getElementById('togglePassword');
        this.rememberMeCheckbox = document.getElementById('rememberMe');
        this.loginBtn = document.getElementById('loginBtn');
        this.btnLoading = document.getElementById('btnLoading');
        this.forgotPasswordLink = document.getElementById('forgotPassword');
        
        // Error elements
        this.badgeError = document.getElementById('badgeError');
        this.passwordError = document.getElementById('passwordError');
        this.passwordStrength = document.getElementById('passwordStrength');
        this.strengthFill = document.getElementById('strengthFill');
        this.strengthText = document.getElementById('strengthText');
        
        // Notification and loading
        this.notificationContainer = document.getElementById('notificationContainer');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSavedCredentials();
        this.checkSession();
        this.startSecurityChecks();
        
        // Add reset button for development
        this.addResetButton();
    }
    
    setupEventListeners() {
        // Role selection
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectRole(e.target.closest('.role-btn').dataset.role));
        });
        
        // Back button
        this.backBtn.addEventListener('click', () => this.goBackToRoleSelection());
        
        // Form submission
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Password toggle
        this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
        
        // Password strength checking
        this.passwordInput.addEventListener('input', () => this.checkPasswordStrength());
        
        // Input validation
        this.badgeIdInput.addEventListener('blur', () => this.validateBadgeId());
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        
        // Forgot password
        this.forgotPasswordLink.addEventListener('click', (e) => this.handleForgotPassword(e));
        
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Auto-logout on inactivity
        this.setupInactivityTimer();
    }
    
    selectRole(role) {
        this.currentRole = role;
        
        // Update UI
        this.roleSelection.style.display = 'none';
        this.loginForm.style.display = 'block';
        
        // Update form title and role indicator
        const roleNames = {
            'officer': 'Border Patrol Officer',
            'admin': 'Administrator'
        };
        
        this.formTitle.textContent = `${roleNames[role]} Login`;
        
        const roleIcon = role === 'officer' ? 'fa-user-tie' : 'fa-user-cog';
        this.roleIndicator.innerHTML = `<i class="fas ${roleIcon}"></i><span>${roleNames[role]}</span>`;
        
        // Focus on first input
        setTimeout(() => this.badgeIdInput.focus(), 100);
        
        this.showNotification(`Selected ${roleNames[role]} role`, 'info');
    }
    
    goBackToRoleSelection() {
        this.currentRole = null;
        this.loginForm.style.display = 'none';
        this.roleSelection.style.display = 'block';
        this.clearForm();
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        if (this.isAccountLocked()) {
            this.showNotification('Account temporarily locked due to multiple failed attempts', 'error');
            return;
        }
        
        if (!this.validateForm()) {
            return;
        }
        
        this.setLoading(true);
        
        try {
            const credentials = {
                badgeId: this.badgeIdInput.value.trim(),
                password: this.passwordInput.value,
                role: this.currentRole,
                rememberMe: this.rememberMeCheckbox.checked
            };
            
            // Simulate API call
            const result = await this.authenticateUser(credentials);
            
            if (result.success) {
                this.handleSuccessfulLogin(result);
            } else {
                this.handleFailedLogin(result.message);
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.handleFailedLogin('Authentication service unavailable');
        } finally {
            this.setLoading(false);
        }
    }
    
    async authenticateUser(credentials) {
        try {
            // Call Django backend API
            const response = await fetch('http://127.0.0.1:8000/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: credentials.badgeId,
                    password: credentials.password
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Store tokens
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('refresh_token', data.refresh);
                
                // Get user profile
                const profileResponse = await fetch('http://127.0.0.1:8000/api/profile/', {
                    headers: {
                        'Authorization': `Bearer ${data.access}`
                    }
                });
                
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    const userProfile = profileData.user; // Extract user data from the response
                    
                    // Debug logging
                    console.log('Profile data:', profileData);
                    console.log('User profile:', userProfile);
                    console.log('User role:', userProfile.role);
                    console.log('Selected role:', credentials.role);
                    console.log('Role comparison:', userProfile.role, '===', credentials.role, '?', userProfile.role === credentials.role);
                    
                    // Check if user role matches selected role
                    if (userProfile.role !== credentials.role) {
                        this.attempts++;
                        const userRole = userProfile.role || 'unknown';
                        const selectedRole = credentials.role || 'unknown';
                        return {
                            success: false,
                            message: `Access denied. This account is for ${userRole}s, not ${selectedRole}s.`
                        };
                    }
                    
                    return {
                        success: true,
                        user: {
                            badgeId: userProfile.badge_id,
                            role: userProfile.role,
                            name: `${userProfile.first_name} ${userProfile.last_name}`,
                            permissions: this.getUserPermissions(userProfile.role)
                        }
                    };
                } else {
                    throw new Error('Failed to get user profile');
                }
            } else {
                this.attempts++;
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: errorData.detail || 'Invalid credentials. Please check your Badge ID and password.'
                };
            }
        } catch (error) {
            console.error('Authentication error:', error);
            this.attempts++;
            return {
                success: false,
                message: 'Authentication service unavailable. Please try again.'
            };
        }
    }
    
    getUserName(badgeId, role) {
        const names = {
            'officer': {
                'BP001': 'Officer John Martinez',
                'BP002': 'Officer Sarah Chen',
                'BP003': 'Officer Michael Rodriguez'
            },
            'admin': {
                'ADMIN001': 'Admin Jennifer Walsh',
                'ADMIN002': 'Super Admin David Thompson'
            }
        };
        
        return names[role]?.[badgeId] || `${role.charAt(0).toUpperCase() + role.slice(1)} ${badgeId}`;
    }
    
    getUserPermissions(role) {
        const permissions = {
            'officer': [
                'view_surveillance',
                'access_face_recognition',
                'log_incidents',
                'view_patrol_routes'
            ],
            'admin': [
                'view_surveillance',
                'access_face_recognition',
                'log_incidents',
                'view_patrol_routes',
                'manage_users',
                'view_analytics',
                'system_configuration',
                'audit_logs'
            ]
        };
        
        return permissions[role] || [];
    }
    
    handleSuccessfulLogin(result) {
        // Store session data
        const sessionData = {
            user: result.user,
            loginTime: Date.now(),
            rememberMe: this.rememberMeCheckbox.checked
        };
        
        if (this.rememberMeCheckbox.checked) {
            localStorage.setItem('borderPatrolSession', JSON.stringify(sessionData));
        } else {
            sessionStorage.setItem('borderPatrolSession', JSON.stringify(sessionData));
        }
        
        // Reset attempts
        this.attempts = 0;
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('accountLockout');
        
        this.showNotification(`Welcome, ${result.user.name}!`, 'success');
        
        // Redirect to appropriate dashboard
        setTimeout(() => {
            this.redirectToDashboard(result.user.role);
        }, 1500);
    }
    
    handleFailedLogin(message) {
        this.showNotification(message, 'error');
        
        // Store failed attempt
        localStorage.setItem('loginAttempts', this.attempts.toString());
        
        if (this.attempts >= this.maxAttempts) {
            localStorage.setItem('accountLockout', Date.now().toString());
            this.showNotification(`Account locked for ${this.lockoutTime / 60000} minutes due to multiple failed attempts`, 'error');
        }
        
        // Clear password field
        this.passwordInput.value = '';
        this.passwordInput.focus();
    }
    
    redirectToDashboard(role) {
        const dashboards = {
            'officer': '/api/officer-dashboard/',
            'admin': '/api/admin-dashboard/'
        };
        
        const dashboardUrl = dashboards[role] || '/api/';
        window.location.href = dashboardUrl;
    }
    
    validateForm() {
        let isValid = true;
        
        // Validate Badge ID
        if (!this.validateBadgeId()) {
            isValid = false;
        }
        
        // Validate Password
        if (!this.validatePassword()) {
            isValid = false;
        }
        
        return isValid;
    }
    
    validateBadgeId() {
        const badgeId = this.badgeIdInput.value.trim();
        const pattern = this.currentRole === 'officer' ? /^BP\d{3}$/ : /^ADMIN\d{3}$/;
        
        if (!badgeId) {
            this.showInputError(this.badgeError, 'Badge ID is required');
            return false;
        }
        
        if (!pattern.test(badgeId)) {
            const format = this.currentRole === 'officer' ? 'BP### (e.g., BP001)' : 'ADMIN### (e.g., ADMIN001)';
            this.showInputError(this.badgeError, `Invalid format. Use ${format}`);
            return false;
        }
        
        this.clearInputError(this.badgeError);
        return true;
    }
    
    validatePassword() {
        const password = this.passwordInput.value;
        
        if (!password) {
            this.showInputError(this.passwordError, 'Password is required');
            return false;
        }
        
        if (password.length < 8) {
            this.showInputError(this.passwordError, 'Password must be at least 8 characters long');
            return false;
        }
        
        this.clearInputError(this.passwordError);
        return true;
    }
    
    checkPasswordStrength() {
        const password = this.passwordInput.value;
        const strength = this.calculatePasswordStrength(password);
        
        this.strengthFill.className = `strength-fill ${strength.level}`;
        this.strengthText.textContent = strength.text;
        this.strengthText.style.color = strength.color;
    }
    
    calculatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        score = Object.values(checks).filter(Boolean).length;
        
        if (score < 2) return { level: 'weak', text: 'Weak', color: '#ef4444' };
        if (score < 4) return { level: 'fair', text: 'Fair', color: '#f59e0b' };
        if (score < 5) return { level: 'good', text: 'Good', color: '#10b981' };
        return { level: 'strong', text: 'Strong', color: '#059669' };
    }
    
    togglePasswordVisibility() {
        const type = this.passwordInput.type === 'password' ? 'text' : 'password';
        this.passwordInput.type = type;
        
        const icon = this.togglePasswordBtn.querySelector('i');
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    }
    
    handleForgotPassword(e) {
        e.preventDefault();
        this.showNotification('Please contact your system administrator to reset your password', 'info');
    }
    
    handleKeyboardShortcuts(e) {
        // Enter key on role selection
        if (e.key === 'Enter' && this.roleSelection.style.display !== 'none') {
            const activeRole = document.querySelector('.role-btn:focus');
            if (activeRole) {
                activeRole.click();
            }
        }
        
        // Escape key to go back
        if (e.key === 'Escape' && this.loginForm.style.display !== 'none') {
            this.goBackToRoleSelection();
        }
    }
    
    setupInactivityTimer() {
        let inactivityTimer;
        
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                this.handleInactivity();
            }, this.sessionTimeout);
        };
        
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });
        
        resetTimer();
    }
    
    handleInactivity() {
        if (this.isLoggedIn()) {
            this.showNotification('Session expired due to inactivity', 'warning');
            this.logout();
        }
    }
    
    isLoggedIn() {
        const session = this.getSessionData();
        return session && session.user;
    }
    
    getSessionData() {
        const session = sessionStorage.getItem('borderPatrolSession') || localStorage.getItem('borderPatrolSession');
        return session ? JSON.parse(session) : null;
    }
    
    async logout() {
        try {
            // Call Django backend logout endpoint
            const token = localStorage.getItem('access_token');
            if (token) {
                await fetch('http://127.0.0.1:8000/api/logout/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage
            sessionStorage.removeItem('borderPatrolSession');
            localStorage.removeItem('borderPatrolSession');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/api/login-page/';
        }
    }
    
    loadSavedCredentials() {
        const session = this.getSessionData();
        if (session && session.rememberMe) {
            this.badgeIdInput.value = session.user.badgeId;
            this.rememberMeCheckbox.checked = true;
        }
    }
    
    checkSession() {
        const session = this.getSessionData();
        if (session) {
            const now = Date.now();
            const loginTime = session.loginTime;
            
            if (now - loginTime > this.sessionTimeout) {
                this.logout();
            }
        }
    }
    
    isAccountLocked() {
        const lockoutTime = localStorage.getItem('accountLockout');
        if (!lockoutTime) return false;
        
        const now = Date.now();
        const lockoutEnd = parseInt(lockoutTime) + this.lockoutTime;
        
        if (now > lockoutEnd) {
            localStorage.removeItem('accountLockout');
            localStorage.removeItem('loginAttempts');
            this.attempts = 0;
            return false;
        }
        
        return true;
    }
    
    startSecurityChecks() {
        // Check for suspicious activity
        setInterval(() => {
            this.performSecurityChecks();
        }, 30000); // Every 30 seconds
    }
    
    performSecurityChecks() {
        // Check for multiple tabs
        if (this.isLoggedIn()) {
            const session = this.getSessionData();
            if (session) {
                // In a real implementation, you would check with the server
                console.log('Performing security checks...');
            }
        }
    }
    
    setLoading(loading) {
        this.loginBtn.disabled = loading;
        
        if (loading) {
            this.btnLoading.classList.add('active');
            this.loginBtn.querySelector('span').textContent = 'Authenticating...';
        } else {
            this.btnLoading.classList.remove('active');
            this.loginBtn.querySelector('span').textContent = 'Secure Login';
        }
    }
    
    showInputError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }
    
    clearInputError(element) {
        element.textContent = '';
        element.style.display = 'none';
    }
    
    clearForm() {
        this.badgeIdInput.value = '';
        this.passwordInput.value = '';
        this.rememberMeCheckbox.checked = false;
        this.clearInputError(this.badgeError);
        this.clearInputError(this.passwordError);
        this.checkPasswordStrength();
    }
    
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.notificationContainer.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
    
    showLoading(show) {
        if (show) {
            this.loadingOverlay.classList.add('active');
        } else {
            this.loadingOverlay.classList.remove('active');
        }
    }
    
    addResetButton() {
        // Add a reset button for development (only in localhost)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const resetBtn = document.createElement('button');
            resetBtn.textContent = 'Reset Lockout';
            resetBtn.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: #dc3545;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                z-index: 9999;
            `;
            resetBtn.onclick = () => {
                localStorage.removeItem('accountLockout');
                localStorage.removeItem('loginAttempts');
                this.attempts = 0;
                this.showNotification('Account lockout reset!', 'success');
                setTimeout(() => location.reload(), 1000);
            };
            document.body.appendChild(resetBtn);
        }
    }
}

// Initialize login system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BorderPatrolLogin();
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
