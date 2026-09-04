// Main Application Class
class FaceRecognitionApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        this.stream = null;
        this.currentImage = null;
        this.isProcessing = false;
        
        // DOM Elements
        this.captureBtn = document.getElementById('captureBtn');
        this.switchBtn = document.getElementById('switchBtn');
        this.recognizeBtn = document.getElementById('recognizeBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.themeBtn = document.getElementById('themeBtn');
        this.statusText = document.getElementById('statusText');
        this.statusIcon = document.getElementById('statusIcon');
        this.faceFrame = document.getElementById('faceFrame');
        this.captureIndicator = document.getElementById('captureIndicator');
        this.resultContent = document.getElementById('resultContent');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.notificationContainer = document.getElementById('notificationContainer');
        
        // New layout elements
        this.welcomeMessage = document.getElementById('welcomeMessage');
        this.analyzingAnimation = document.getElementById('analyzingAnimation');
        this.faceMatchResult = document.getElementById('faceMatchResult');
        this.matchDetails = document.getElementById('matchDetails');
        
        // Configuration
        this.backendUrl = 'http://127.0.0.1:8000/api';
        this.faceDetectionInterval = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.loadTheme();
        await this.startCamera();
        this.updateStatus('Camera ready', 'success');
    }
    
    setupEventListeners() {
        // Button event listeners
        this.captureBtn.addEventListener('click', () => this.captureImage());
        this.switchBtn.addEventListener('click', () => this.switchCamera());
        this.recognizeBtn.addEventListener('click', () => this.recognizeFace());
        this.clearBtn.addEventListener('click', () => this.clearResults());
        this.themeBtn.addEventListener('click', () => this.toggleTheme());
        
        // Video event listeners
        this.video.addEventListener('loadedmetadata', () => {
            this.startFaceDetection();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isProcessing) {
                e.preventDefault();
                this.captureImage();
            }
        });
    }
    
    async startCamera() {
        try {
            this.updateStatus('Starting camera...', 'info');
            
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            this.video.play();
            
            this.updateStatus('Camera active', 'success');
            this.showNotification('Camera started successfully!', 'success');
            
        } catch (error) {
            console.error('Camera error:', error);
            this.updateStatus('Camera access denied', 'error');
            this.showNotification('Camera access denied. Please check permissions.', 'error');
        }
    }
    
    async switchCamera() {
        if (!this.stream) return;
        
        try {
            this.updateStatus('Switching camera...', 'info');
            
            // Stop current stream
            this.stream.getTracks().forEach(track => track.stop());
            
            // Get available cameras
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length < 2) {
                this.showNotification('No additional cameras found', 'warning');
                return;
            }
            
            // Switch to next camera
            const currentDeviceId = this.stream.getVideoTracks()[0].getSettings().deviceId;
            const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
            const nextIndex = (currentIndex + 1) % videoDevices.length;
            const nextDevice = videoDevices[nextIndex];
            
            const constraints = {
                video: {
                    deviceId: { exact: nextDevice.deviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            this.video.play();
            
            this.updateStatus('Camera switched', 'success');
            this.showNotification(`Switched to ${nextDevice.label || 'camera'}`, 'success');
            
        } catch (error) {
            console.error('Switch camera error:', error);
            this.updateStatus('Failed to switch camera', 'error');
            this.showNotification('Failed to switch camera', 'error');
        }
    }
    
    captureImage() {
        if (!this.stream || this.isProcessing) return;
        
        try {
            // Set canvas dimensions
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            // Draw video frame to canvas
            this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Get image data
            this.currentImage = this.canvas.toDataURL('image/jpeg', 0.9);
            
            // Show captured image
            this.displayCapturedImage(this.currentImage);
            
            // Enable action buttons
            this.recognizeBtn.disabled = false;
            
            // Show capture animation
            this.showCaptureAnimation();
            
            // Hide welcome message and show analyzing animation
            this.hideAllResultViews();
            this.showAnalyzingAnimation();
            
            this.updateStatus('Image captured', 'success');
            this.showNotification('Image captured successfully!', 'success');
            
        } catch (error) {
            console.error('Capture error:', error);
            this.updateStatus('Failed to capture image', 'error');
            this.showNotification('Failed to capture image', 'error');
        }
    }
    
    displayCapturedImage(imageData) {
        this.resultContent.innerHTML = `
            <img src="${imageData}" alt="Captured face" class="captured-image">
            <div class="mt-4 text-center">
                <p class="text-sm text-gray-600">Image ready for processing</p>
            </div>
        `;
    }
    
    showCaptureAnimation() {
        this.captureIndicator.classList.add('active');
        setTimeout(() => {
            this.captureIndicator.classList.remove('active');
        }, 1000);
    }
    
    async recognizeFace() {
        if (!this.currentImage || this.isProcessing) return;
        
        this.isProcessing = true;
        this.updateStatus('Recognizing face...', 'info');
        
        // Show analyzing animation
        this.hideAllResultViews();
        this.showAnalyzingAnimation();
        
        try {
            const base64Image = this.currentImage.split(',')[1];
            
            const response = await fetch(`${this.backendUrl}/recognize/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image: base64Image })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Hide analyzing animation and show results
            this.hideAllResultViews();
            
            // Force display of results with debugging
            console.log('About to display face match result');
            this.displayFaceMatchResult(result);
            
            // Ensure the result is visible with multiple attempts
            setTimeout(() => {
                if (this.faceMatchResult) {
                    this.faceMatchResult.style.display = 'block';
                    this.faceMatchResult.classList.add('active');
                    console.log('Force showing face match result');
                }
            }, 100);
            
            // Additional fallback to ensure display
            setTimeout(() => {
                if (this.faceMatchResult && this.matchDetails) {
                    this.faceMatchResult.style.display = 'block';
                    this.faceMatchResult.classList.add('active');
                    this.faceMatchResult.style.visibility = 'visible';
                    console.log('Fallback display attempt');
                }
            }, 300);
            
            // Show immediate feedback notification
            const recognition = result.recognition || {};
            const matchPercentage = recognition.match_percentage || 0;
            const isAuthenticated = recognition.is_known || false;
            const matchedImage = recognition.matched_image || {};
            
            const statusText = isAuthenticated ? 'AUTHENTICATED' : 'NOT RECOGNIZED';
            const matchText = `${matchPercentage.toFixed(1)}% match`;
            const personText = matchedImage.title ? ` - ${matchedImage.title}` : '';
            
            this.updateStatus('Recognition completed', 'success');
            this.showNotification(`${statusText}: ${matchText}${personText}`, 'success');
            
        } catch (error) {
            console.error('Recognition error:', error);
            this.updateStatus('Recognition failed', 'error');
            this.showNotification(`Recognition failed: ${error.message}`, 'error');
            
            // Show welcome message on error
            this.hideAllResultViews();
            this.showWelcomeMessage();
        } finally {
            this.isProcessing = false;
        }
    }
    

    
    displayRecognitionResult(result) {
        const confidence = result.confidence ? Math.round(result.confidence * 100) : 0;
        const isMatch = confidence > 70;
        
        this.resultContent.innerHTML = `
            <div class="recognition-result">
                <div class="result-icon ${isMatch ? 'success' : 'error'}">
                    <i class="fas ${isMatch ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                </div>
                <h4 class="result-title">${isMatch ? 'Face Recognized!' : 'Face Not Found'}</h4>
                <div class="result-details">
                    <p><strong>Confidence:</strong> ${confidence}%</p>
                    ${result.name ? `<p><strong>Name:</strong> ${result.name}</p>` : ''}
                    ${result.id ? `<p><strong>ID:</strong> ${result.id}</p>` : ''}
                </div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidence}%"></div>
                </div>
            </div>
        `;
    }
    

    
    clearResults() {
        this.currentImage = null;
        this.recognizeBtn.disabled = true;
        
        this.resultContent.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-user-circle"></i>
                <p>No image captured yet</p>
            </div>
        `;
        
        this.updateStatus('Ready to capture', 'info');
        this.showNotification('Results cleared', 'info');
    }
    
    startFaceDetection() {
        // Simple face detection simulation
        this.faceDetectionInterval = setInterval(() => {
            if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
                // Simulate face detection with random positioning
                const hasFace = Math.random() > 0.3; // 70% chance of detecting a face
                
                if (hasFace) {
                    this.showFaceFrame();
                } else {
                    this.hideFaceFrame();
                }
            }
        }, 1000);
    }
    
    showFaceFrame() {
        const videoRect = this.video.getBoundingClientRect();
        const frameSize = Math.min(videoRect.width, videoRect.height) * 0.3;
        
        this.faceFrame.style.width = `${frameSize}px`;
        this.faceFrame.style.height = `${frameSize}px`;
        this.faceFrame.style.left = `${(videoRect.width - frameSize) / 2}px`;
        this.faceFrame.style.top = `${(videoRect.height - frameSize) / 2}px`;
        this.faceFrame.classList.add('active');
    }
    
    hideFaceFrame() {
        this.faceFrame.classList.remove('active');
    }
    
    updateStatus(message, type = 'info') {
        this.statusText.textContent = message;
        
        // Update status icon
        const iconMap = {
            'info': 'fa-camera',
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-triangle',
            'warning': 'fa-exclamation-circle'
        };
        
        this.statusIcon.className = `fas ${iconMap[type] || iconMap.info}`;
        this.statusIcon.style.color = `var(--${type}-color)`;
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
    
    showLoading(show) {
        if (show) {
            this.loadingOverlay.classList.add('active');
        } else {
            this.loadingOverlay.classList.remove('active');
        }
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update theme button icon
        const themeIcon = this.themeBtn.querySelector('i');
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        this.showNotification(`Switched to ${newTheme} theme`, 'info');
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Update theme button icon
        const themeIcon = this.themeBtn.querySelector('i');
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    destroy() {
        if (this.faceDetectionInterval) {
            clearInterval(this.faceDetectionInterval);
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
    
    // New methods for the updated layout
    hideAllResultViews() {
        if (this.welcomeMessage) this.welcomeMessage.style.display = 'none';
        if (this.analyzingAnimation) this.analyzingAnimation.classList.remove('active');
        if (this.faceMatchResult) this.faceMatchResult.classList.remove('active');
        console.log('hideAllResultViews called');
    }
    
    showWelcomeMessage() {
        this.hideAllResultViews();
        if (this.welcomeMessage) this.welcomeMessage.style.display = 'block';
    }
    
    showAnalyzingAnimation() {
        this.hideAllResultViews();
        if (this.analyzingAnimation) this.analyzingAnimation.classList.add('active');
    }
    
    showFaceMatchResult() {
        console.log('showFaceMatchResult called');
        this.hideAllResultViews();
        if (this.faceMatchResult) {
            console.log('Adding active class to faceMatchResult');
            this.faceMatchResult.style.display = 'block';
            this.faceMatchResult.classList.add('active');
            
            // Double-check visibility
            setTimeout(() => {
                const computedStyle = window.getComputedStyle(this.faceMatchResult);
                console.log('Face match result display:', computedStyle.display);
                console.log('Face match result visibility:', computedStyle.visibility);
            }, 50);
        } else {
            console.error('faceMatchResult element not found');
        }
    }
    
    displayFaceMatchResult(result) {
        console.log('displayFaceMatchResult called with result:', result);
        this.showFaceMatchResult();
        
        if (!this.matchDetails) {
            console.error('matchDetails element not found');
            return;
        }
        
        const recognition = result.recognition || {};
        const confidence = Math.round((recognition.confidence || 0) * 100);
        const matchConfidence = Math.round((recognition.match_confidence || 0) * 100);
        const matchPercentage = recognition.match_percentage || 0;
        const matchedImage = recognition.matched_image || {};
        const databaseSearch = result.database_search || {};
        const authenticationStatus = recognition.authentication_status || 'NOT_AUTHENTICATED';
        const isAuthenticated = recognition.is_known || false;
        
        // Determine authentication status color and icon
        const authColor = isAuthenticated ? '#10b981' : '#ef4444';
        const authIcon = isAuthenticated ? 'fas fa-check-circle' : 'fas fa-times-circle';
        const authText = isAuthenticated ? 'AUTHENTICATED' : 'NOT AUTHENTICATED';
        
        console.log('Populating match details with:', {
            matchPercentage,
            authenticationStatus,
            isAuthenticated,
            matchedImage: matchedImage.title
        });
        
        this.matchDetails.innerHTML = `
            <div class="detail-item" style="background: rgba(255, 255, 255, 0.15); border: 2px solid ${authColor}; margin-bottom: 1.5rem;">
                <div style="text-align: center; width: 100%;">
                    <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; color: ${authColor};">
                        ${isAuthenticated ? '✅ FACE AUTHENTICATED' : '❌ FACE NOT RECOGNIZED'}
                    </div>
                    <div style="font-size: 1rem; color: rgba(255, 255, 255, 0.9);">
                        ${matchPercentage.toFixed(1)}% Match Confidence
                    </div>
                </div>
            </div>
            <div class="detail-item">
                <span class="detail-label">👤 Faces Detected</span>
                <span class="detail-value">${recognition.faces_detected || 0}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">📊 Detection Confidence</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="detail-value">${confidence}%</span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${confidence}%"></div>
                    </div>
                </div>
            </div>
            <div class="detail-item">
                <span class="detail-label">🔐 Authentication Status</span>
                <span class="detail-value" style="color: ${authColor}; font-weight: bold;">
                    <i class="${authIcon}"></i> ${authText}
                </span>
            </div>
            <div class="detail-item">
                <span class="detail-label">🧠 ResNet 50 CNN Match</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="detail-value" style="color: ${matchPercentage >= 75 ? '#10b981' : matchPercentage >= 50 ? '#f59e0b' : '#ef4444'}; font-weight: bold;">
                        ${matchPercentage.toFixed(1)}%
                    </span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${matchPercentage}%; background: ${matchPercentage >= 75 ? '#10b981' : matchPercentage >= 50 ? '#f59e0b' : '#ef4444'}"></div>
                    </div>
                </div>
            </div>
            <div class="detail-item">
                <span class="detail-label">🆔 Person ID</span>
                <span class="detail-value">${recognition.person_id || 'UNKNOWN'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">👤 Person Name</span>
                <span class="detail-value">${recognition.person_name || 'Unknown Person'}</span>
            </div>
            ${matchedImage.cnn_confidence ? `
            <div class="detail-item">
                <span class="detail-label">🎯 CNN Confidence</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="detail-value">${(matchedImage.cnn_confidence * 100).toFixed(1)}%</span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${matchedImage.cnn_confidence * 100}%"></div>
                    </div>
                </div>
            </div>
            ` : ''}
            ${matchedImage.similarity_score ? `
            <div class="detail-item">
                <span class="detail-label">📈 Similarity Score</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="detail-value">${(matchedImage.similarity_score * 100).toFixed(1)}%</span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${matchedImage.similarity_score * 100}%"></div>
                    </div>
                </div>
            </div>
            ` : ''}
            ${matchedImage.id ? `
            <div class="detail-item">
                <span class="detail-label">📋 Matched Image</span>
                <span class="detail-value">${matchedImage.title || 'Unknown'}</span>
            </div>
            ${matchedImage.description ? `
            <div class="detail-item">
                <span class="detail-label">📝 Description</span>
                <span class="detail-value">${matchedImage.description}</span>
            </div>
            ` : ''}
            <div class="detail-item">
                <span class="detail-label">🖼️ Image Type</span>
                <span class="detail-value">${matchedImage.image_type || 'Unknown'}</span>
            </div>
            ${matchedImage.location ? `
            <div class="detail-item">
                <span class="detail-label">📍 Location</span>
                <span class="detail-value">${matchedImage.location}</span>
            </div>
            ` : ''}
            ${matchedImage.tags ? `
            <div class="detail-item">
                <span class="detail-label">🏷️ Tags</span>
                <span class="detail-value">${matchedImage.tags}</span>
            </div>
            ` : ''}
            <div class="detail-item">
                <span class="detail-label">👤 Uploaded By</span>
                <span class="detail-value">${matchedImage.uploaded_by || 'Unknown'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">📅 Upload Date</span>
                <span class="detail-value">${matchedImage.uploaded_at ? new Date(matchedImage.uploaded_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
            ` : ''}
            <div class="detail-item">
                <span class="detail-label">🔍 Recognition Method</span>
                <span class="detail-value">${databaseSearch.search_method || 'ResNet 50 CNN'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">📊 Database Search</span>
                <span class="detail-value">${databaseSearch.total_images_searched || 0} images searched</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">🎯 Authentication Threshold</span>
                <span class="detail-value">${databaseSearch.authentication_threshold || 75}%</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">⏱️ Processing Time</span>
                <span class="detail-value">${result.processing_time || 0}s</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">🕐 Timestamp</span>
                <span class="detail-value">${new Date(result.timestamp).toLocaleString()}</span>
            </div>
        `;
    }
    
    clearResults() {
        this.currentImage = null;
        this.recognizeBtn.disabled = true;
        this.hideAllResultViews();
        this.showWelcomeMessage();
        this.updateStatus('Camera ready', 'success');
        this.showNotification('Results cleared', 'info');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new FaceRecognitionApp();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        app.destroy();
    });
});

// Add some additional CSS for the new components
const additionalStyles = `
    .recognition-result {
        text-align: center;
        padding: 1rem;
    }
    
    .result-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }
    
    .result-icon.success {
        color: var(--success-color);
    }
    
    .result-icon.error {
        color: var(--danger-color);
    }
    
    .result-title {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: var(--text-primary);
    }
    
    .result-details {
        margin-bottom: 1.5rem;
    }
    
    .result-details p {
        margin-bottom: 0.5rem;
        color: var(--text-secondary);
    }
    
    .confidence-bar {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        overflow: hidden;
        margin-top: 1rem;
    }
    
    .confidence-fill {
        height: 100%;
        background: var(--gradient-success);
        border-radius: 4px;
        transition: width 0.5s ease;
    }
    
    .mt-4 {
        margin-top: 1rem;
    }
    
    .text-sm {
        font-size: 0.875rem;
    }
    
    .text-gray-600 {
        color: var(--text-secondary);
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
