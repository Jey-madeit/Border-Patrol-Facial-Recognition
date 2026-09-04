class PasswordReset {
    constructor() {
        this.currentStep = 1;
        this.badgeId = '';
        this.securityQuestions = [
            "What was the name of your first pet?",
            "What city were you born in?",
            "What was your mother's maiden name?",
            "What was the name of your elementary school?",
            "What was your first car's make and model?"
        ];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSecurityQuestions();
    }

    setupEventListeners() {
        // Badge ID form
        document.getElementById('badgeForm').addEventListener('submit', (e) => this.handleBadgeSubmit(e));
        
        // Security questions form
        document.getElementById('securityForm').addEventListener('submit', (e) => this.handleSecuritySubmit(e));
        
        // New password form
        document.getElementById('newPasswordForm').addEventListener('submit', (e) => this.handleNewPasswordSubmit(e));
        
        // Back buttons
        document.getElementById('backToStep1').addEventListener('click', () => this.goToStep(1));
        document.getElementById('backToStep2').addEventListener('click', () => this.goToStep(2));
        
        // Password toggles
        document.getElementById('toggleNewPassword').addEventListener('click', () => this.togglePassword('newPassword', 'toggleNewPassword'));
        document.getElementById('toggleConfirmPassword').addEventListener('click', () => this.togglePassword('confirmPassword', 'toggleConfirmPassword'));
        
        // Password strength checker
        document.getElementById('newPassword').addEventListener('input', () => this.checkPasswordStrength());
        document.getElementById('confirmPassword').addEventListener('input', () => this.validatePasswordMatch());
    }

    loadSecurityQuestions() {
        // Randomly select 2 security questions
        const shuffled = [...this.securityQuestions].sort(() => 0.5 - Math.random());
        document.getElementById('question1Text').textContent = shuffled[0];
        document.getElementById('question2Text').textContent = shuffled[1];
    }

    async handleBadgeSubmit(e) {
        e.preventDefault();
        
        const badgeId = document.getElementById('badgeId').value.trim();
        const errorElement = document.getElementById('badgeError');
        
        // Clear previous errors
        this.clearError('badgeError');
        
        if (!badgeId) {
            this.showError('badgeError', 'Badge ID is required');
            return;
        }
        
        // Validate badge ID format
        if (!/^BP\d{3,6}$/i.test(badgeId)) {
            this.showError('badgeError', 'Invalid badge ID format. Format should be BP followed by 3-6 digits');
            return;
        }
        
        try {
            // Simulate API call to verify badge ID
            const isValid = await this.verifyBadgeId(badgeId);
            
            if (isValid) {
                this.badgeId = badgeId;
                this.goToStep(2);
            } else {
                this.showError('badgeError', 'Badge ID not found. Please contact your administrator.');
            }
        } catch (error) {
            this.showError('badgeError', 'Error verifying badge ID. Please try again.');
        }
    }

    async handleSecuritySubmit(e) {
        e.preventDefault();
        
        const answer1 = document.getElementById('answer1').value.trim();
        const answer2 = document.getElementById('answer2').value.trim();
        
        // Clear previous errors
        this.clearError('answer1Error');
        this.clearError('answer2Error');
        
        if (!answer1 || !answer2) {
            if (!answer1) this.showError('answer1Error', 'Please answer the first security question');
            if (!answer2) this.showError('answer2Error', 'Please answer the second security question');
            return;
        }
        
        try {
            // Simulate API call to verify security answers
            const isValid = await this.verifySecurityAnswers(this.badgeId, answer1, answer2);
            
            if (isValid) {
                this.goToStep(3);
            } else {
                this.showError('answer1Error', 'Security answers do not match our records');
                this.showError('answer2Error', 'Security answers do not match our records');
            }
        } catch (error) {
            this.showError('answer1Error', 'Error verifying security answers. Please try again.');
        }
    }

    async handleNewPasswordSubmit(e) {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Clear previous errors
        this.clearError('newPasswordError');
        this.clearError('confirmPasswordError');
        
        // Validate password strength
        const strengthResult = this.validatePasswordStrength(newPassword);
        if (!strengthResult.isValid) {
            this.showError('newPasswordError', strengthResult.message);
            return;
        }
        
        // Validate password match
        if (newPassword !== confirmPassword) {
            this.showError('confirmPasswordError', 'Passwords do not match');
            return;
        }
        
        try {
            // Simulate API call to reset password
            const success = await this.resetPassword(this.badgeId, newPassword);
            
            if (success) {
                this.showSuccess();
            } else {
                this.showError('newPasswordError', 'Failed to reset password. Please try again.');
            }
        } catch (error) {
            this.showError('newPasswordError', 'Error resetting password. Please try again.');
        }
    }

    goToStep(step) {
        // Hide all steps
        document.querySelectorAll('.reset-steps').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        document.getElementById(`step${step}Content`).classList.add('active');
        
        // Update step indicators
        for (let i = 1; i <= 3; i++) {
            const stepElement = document.getElementById(`step${i}`);
            const lineElement = document.getElementById(`line${i}`);
            
            if (i < step) {
                stepElement.classList.add('completed');
                if (lineElement) lineElement.classList.add('completed');
            } else if (i === step) {
                stepElement.classList.add('active');
                stepElement.classList.remove('completed');
            } else {
                stepElement.classList.remove('active', 'completed');
                if (lineElement) lineElement.classList.remove('completed');
            }
        }
        
        this.currentStep = step;
    }

    checkPasswordStrength() {
        const password = document.getElementById('newPassword').value;
        const strengthResult = this.validatePasswordStrength(password);
        
        // Update strength bar
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        
        strengthFill.style.width = `${strengthResult.score * 20}%`;
        strengthText.textContent = strengthResult.text;
        
        // Update strength bar color
        strengthFill.className = 'strength-fill';
        if (strengthResult.score >= 4) {
            strengthFill.classList.add('strong');
        } else if (strengthResult.score >= 3) {
            strengthFill.classList.add('medium');
        } else if (strengthResult.score >= 2) {
            strengthFill.classList.add('weak');
        }
        
        // Update requirements
        this.updatePasswordRequirements(password);
    }

    validatePasswordStrength(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        const score = Object.values(requirements).filter(Boolean).length;
        
        let text = 'Enter a password';
        if (score === 0) text = 'Enter a password';
        else if (score <= 2) text = 'Weak';
        else if (score <= 3) text = 'Medium';
        else if (score <= 4) text = 'Strong';
        else text = 'Very Strong';
        
        return {
            isValid: score >= 4,
            score,
            text,
            message: score < 4 ? 'Password does not meet security requirements' : ''
        };
    }

    updatePasswordRequirements(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        Object.keys(requirements).forEach(req => {
            const element = document.getElementById(`req-${req}`);
            if (element) {
                element.classList.toggle('met', requirements[req]);
            }
        });
    }

    validatePasswordMatch() {
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.showError('confirmPasswordError', 'Passwords do not match');
        } else {
            this.clearError('confirmPasswordError');
        }
    }

    togglePassword(inputId, buttonId) {
        const input = document.getElementById(inputId);
        const button = document.getElementById(buttonId);
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    showSuccess() {
        this.goToStep(4);
        this.startCountdown();
    }

    startCountdown() {
        let countdown = 5;
        const countdownElement = document.getElementById('countdownNumber');
        
        const timer = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(timer);
                window.location.href = 'login.html';
            }
        }, 1000);
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    clearError(elementId) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }

    // Mock API methods (replace with actual API calls)
    async verifyBadgeId(badgeId) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock validation - in real app, this would call your API
        const validBadgeIds = ['BP001', 'BP002', 'BP003', 'BP123', 'BP456'];
        return validBadgeIds.includes(badgeId.toUpperCase());
    }

    async verifySecurityAnswers(badgeId, answer1, answer2) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock validation - in real app, this would call your API
        // For demo purposes, accept any non-empty answers
        return answer1.length > 0 && answer2.length > 0;
    }

    async resetPassword(badgeId, newPassword) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock password reset - in real app, this would call your API
        console.log(`Password reset for ${badgeId} with new password`);
        return true;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PasswordReset();
});
