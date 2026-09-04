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
        this.startCameraBtn = document.getElementById('startCameraBtn');
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
        this.startCameraBtn.addEventListener('click', () => this.startCamera());
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
            
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera not supported in this browser');
            }
            
            // Check if we're on HTTPS or localhost
            const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            if (!isSecureContext) {
                throw new Error('Camera access requires HTTPS or localhost. Please use HTTPS or access via localhost.');
            }
            
            // Check camera permissions
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                console.log('Camera permission status:', permissionStatus.state);
                
                if (permissionStatus.state === 'denied') {
                    throw new Error('Camera access denied. Please allow camera permissions in your browser settings.');
                }
            } catch (permError) {
                console.log('Permission API not supported, continuing with camera access attempt');
            }
            
            // Try different constraint configurations
            const constraints = [
                // High quality constraints
                {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    }
                },
                // Medium quality constraints
                {
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    }
                },
                // Basic constraints
                {
                    video: {
                        facingMode: 'user'
                    }
                },
                // Fallback - any camera
                {
                    video: true
                }
            ];
            
            let stream = null;
            let lastError = null;
            
            // Try each constraint configuration
            for (let i = 0; i < constraints.length; i++) {
                try {
                    console.log(`Trying camera constraint ${i + 1}:`, constraints[i]);
                    stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
                    console.log('Camera stream obtained successfully');
                    break;
                } catch (error) {
                    console.log(`Camera constraint ${i + 1} failed:`, error.message);
                    lastError = error;
                    continue;
                }
            }
            
            if (!stream) {
                throw lastError || new Error('Unable to access camera');
            }
            
            this.stream = stream;
            this.video.srcObject = this.stream;
            
            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    console.log('Video metadata loaded');
                    this.video.play().then(resolve).catch(reject);
                };
                this.video.onerror = reject;
                
                // Timeout after 5 seconds
                setTimeout(() => reject(new Error('Video loading timeout')), 5000);
            });
            
            this.updateStatus('Camera active', 'success');
            this.showNotification('Camera started successfully!', 'success');
            
            // Hide start camera button on success
            if (this.startCameraBtn) {
                this.startCameraBtn.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Camera error:', error);
            let errorMessage = 'Camera access failed';
            let detailedInstructions = '';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera access denied';
                detailedInstructions = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.1); border-radius: 8px; text-align: left;">
                        <h4 style="margin-bottom: 0.5rem; color: #fbbf24;">How to fix:</h4>
                        <ol style="margin-left: 1rem; color: rgba(255, 255, 255, 0.9);">
                            <li>Click the camera icon in your browser's address bar</li>
                            <li>Select "Allow" for camera access</li>
                            <li>Refresh this page</li>
                            <li>If still blocked, check your browser's site settings</li>
                        </ol>
                    </div>
                `;
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera found';
                detailedInstructions = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.1); border-radius: 8px; text-align: left;">
                        <h4 style="margin-bottom: 0.5rem; color: #fbbf24;">Troubleshooting:</h4>
                        <ul style="margin-left: 1rem; color: rgba(255, 255, 255, 0.9);">
                            <li>Make sure a camera is connected to your device</li>
                            <li>Check if the camera is working in other applications</li>
                            <li>Try unplugging and reconnecting the camera</li>
                            <li>Restart your browser</li>
                        </ul>
                    </div>
                `;
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Camera is being used by another application';
                detailedInstructions = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.1); border-radius: 8px; text-align: left;">
                        <h4 style="margin-bottom: 0.5rem; color: #fbbf24;">Solution:</h4>
                        <ul style="margin-left: 1rem; color: rgba(255, 255, 255, 0.9);">
                            <li>Close other applications using the camera (Zoom, Skype, etc.)</li>
                            <li>Check if any browser tabs are using the camera</li>
                            <li>Restart your browser</li>
                        </ul>
                    </div>
                `;
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Camera constraints not supported';
                detailedInstructions = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.1); border-radius: 8px; text-align: left;">
                        <h4 style="margin-bottom: 0.5rem; color: #fbbf24;">Try:</h4>
                        <ul style="margin-left: 1rem; color: rgba(255, 255, 255, 0.9);">
                            <li>Using a different camera if available</li>
                            <li>Updating your camera drivers</li>
                            <li>Using a different browser</li>
                        </ul>
                    </div>
                `;
            } else if (error.message.includes('not supported')) {
                errorMessage = 'Camera not supported in this browser';
                detailedInstructions = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.1); border-radius: 8px; text-align: left;">
                        <h4 style="margin-bottom: 0.5rem; color: #fbbf24;">Recommended browsers:</h4>
                        <ul style="margin-left: 1rem; color: rgba(255, 255, 255, 0.9);">
                            <li>Google Chrome (latest version)</li>
                            <li>Mozilla Firefox (latest version)</li>
                            <li>Safari (latest version)</li>
                            <li>Microsoft Edge (latest version)</li>
                        </ul>
                    </div>
                `;
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Camera loading timeout';
                detailedInstructions = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.1); border-radius: 8px; text-align: left;">
                        <h4 style="margin-bottom: 0.5rem; color: #fbbf24;">Try:</h4>
                        <ul style="margin-left: 1rem; color: rgba(255, 255, 255, 0.9);">
                            <li>Refreshing the page</li>
                            <li>Checking your internet connection</li>
                            <li>Restarting your browser</li>
                        </ul>
                    </div>
                `;
            } else if (error.message.includes('HTTPS')) {
                errorMessage = 'HTTPS required for camera access';
                detailedInstructions = `
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.1); border-radius: 8px; text-align: left;">
                        <h4 style="margin-bottom: 0.5rem; color: #fbbf24;">Solution:</h4>
                        <ul style="margin-left: 1rem; color: rgba(255, 255, 255, 0.9);">
                            <li>Access the application via HTTPS</li>
                            <li>Or use localhost:8000 instead of 127.0.0.1:8000</li>
                            <li>Modern browsers require secure context for camera access</li>
                        </ul>
                    </div>
                `;
            }
            
            this.updateStatus('Camera error', 'error');
            this.showNotification(errorMessage, 'error');
            
            // Show start camera button
            if (this.startCameraBtn) {
                this.startCameraBtn.style.display = 'flex';
            }
            
            // Show fallback message with detailed instructions
            this.showCameraFallback(errorMessage, detailedInstructions);
        }
    }
    
    showCameraFallback(errorMessage = 'Camera Not Available', detailedInstructions = '') {
        // Show a fallback UI when camera fails
        const cameraContainer = document.querySelector('.camera-container');
        if (cameraContainer) {
            cameraContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; padding: 2rem; overflow-y: auto;">
                    <i class="fas fa-video-slash" style="font-size: 4rem; margin-bottom: 1rem; color: #ef4444;"></i>
                    <h3 style="margin-bottom: 1rem; font-size: 1.5rem;">${errorMessage}</h3>
                    <p style="margin-bottom: 1.5rem; color: rgba(255, 255, 255, 0.8);">
                        Unable to access your camera. Please check the following:
                    </p>
                    <ul style="text-align: left; margin-bottom: 2rem; color: rgba(255, 255, 255, 0.8);">
                        <li>• Allow camera permissions in your browser</li>
                        <li>• Make sure no other app is using the camera</li>
                        <li>• Try refreshing the page</li>
                        <li>• Use Chrome, Firefox, or Safari browser</li>
                        <li>• Ensure you're using HTTPS or localhost</li>
                    </ul>
                    ${detailedInstructions}
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button id="retryCameraBtn" class="btn btn-primary">
                            <i class="fas fa-redo"></i> Retry Camera
                        </button>
                        <button id="checkPermissionsBtn" class="btn btn-secondary">
                            <i class="fas fa-cog"></i> Check Permissions
                        </button>
                    </div>
                </div>
            `;
            
            // Add retry button event listener
            const retryBtn = document.getElementById('retryCameraBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    this.retryCamera();
                });
            }
            
            // Add check permissions button event listener
            const checkPermsBtn = document.getElementById('checkPermissionsBtn');
            if (checkPermsBtn) {
                checkPermsBtn.addEventListener('click', () => {
                    this.checkCameraPermissions();
                });
            }
        }
    }
    
    async retryCamera() {
        // Restore original camera container
        const cameraContainer = document.querySelector('.camera-container');
        if (cameraContainer) {
            cameraContainer.innerHTML = `
                <video id="video" autoplay muted playsinline></video>
                <canvas id="faceFrame" class="face-frame"></canvas>
                <div id="captureIndicator" class="capture-indicator">
                    <i class="fas fa-camera"></i>
                </div>
            `;
            
            // Re-initialize video element
            this.video = document.getElementById('video');
            this.faceFrame = document.getElementById('faceFrame');
            this.captureIndicator = document.getElementById('captureIndicator');
            
            // Try to start camera again
            await this.startCamera();
        }
    }
    
    async checkCameraPermissions() {
        try {
            this.updateStatus('Checking camera permissions...', 'info');
            
            // Check if permissions API is supported
            if (!navigator.permissions) {
                this.showNotification('Permissions API not supported in this browser', 'warning');
                return;
            }
            
            // Check camera permission
            const permissionStatus = await navigator.permissions.query({ name: 'camera' });
            
            let statusMessage = '';
            let statusType = 'info';
            
            switch (permissionStatus.state) {
                case 'granted':
                    statusMessage = 'Camera permission is granted. Try starting the camera again.';
                    statusType = 'success';
                    break;
                case 'denied':
                    statusMessage = 'Camera permission is denied. Please allow camera access in your browser settings.';
                    statusType = 'error';
                    break;
                case 'prompt':
                    statusMessage = 'Camera permission will be requested when you try to access the camera.';
                    statusType = 'info';
                    break;
                default:
                    statusMessage = 'Camera permission status is unknown.';
                    statusType = 'warning';
            }
            
            this.updateStatus(`Permission: ${permissionStatus.state}`, statusType);
            this.showNotification(statusMessage, statusType);
            
            // Also check available devices
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                
                if (videoDevices.length === 0) {
                    this.showNotification('No camera devices found on this system', 'error');
                } else {
                    this.showNotification(`Found ${videoDevices.length} camera device(s)`, 'success');
                }
            } catch (deviceError) {
                console.log('Could not enumerate devices:', deviceError);
            }
            
        } catch (error) {
            console.error('Permission check error:', error);
            this.showNotification('Could not check camera permissions', 'error');
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
            
            const statusText = isAuthenticated ? 'FACE MATCH' : 'FACE MISMATCH';
            const matchText = `${matchPercentage.toFixed(1)}% confidence`;
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
        
        // Update match header icon based on result
        const recognition = result.recognition || {};
        const isAuthenticated = recognition.is_known || false;
        const matchIcon = document.querySelector('.match-icon i');
        if (matchIcon) {
            matchIcon.className = isAuthenticated ? 'fas fa-user-check' : 'fas fa-user-times';
        }
        const confidence = Math.round((recognition.confidence || 0) * 100);
        const matchConfidence = Math.round((recognition.match_confidence || 0) * 100);
        const matchPercentage = recognition.match_percentage || 0;
        const matchedImage = recognition.matched_image || {};
        const databaseSearch = result.database_search || {};
        const authenticationStatus = recognition.authentication_status || 'NOT_AUTHENTICATED';
        const conflictDetection = result.conflict_detection || {};
        
        // Determine match status color and icon based on conflicts
        const hasConflicts = conflictDetection.has_conflicts || false;
        let matchColor, matchIconClass, matchText, matchSubtext;
        
        if (hasConflicts && authenticationStatus === 'CONFLICT_DETECTED') {
            matchColor = '#f59e0b'; // Orange for conflicts
            matchIconClass = 'fas fa-exclamation-triangle';
            matchText = 'CONFLICT DETECTED';
            matchSubtext = 'Multiple matches found - conflict resolved';
        } else if (isAuthenticated) {
            matchColor = '#10b981'; // Green for authenticated
            matchIconClass = 'fas fa-check-circle';
            matchText = 'FACE MATCH';
            matchSubtext = 'Person identified in database';
        } else {
            matchColor = '#ef4444'; // Red for no match
            matchIconClass = 'fas fa-times-circle';
            matchText = 'FACE MISMATCH';
            matchSubtext = 'No matching person found';
        }
        
        console.log('Populating match details with:', {
            matchPercentage,
            authenticationStatus,
            isAuthenticated,
            matchedImage: matchedImage.title
        });
        
        this.matchDetails.innerHTML = `
            <div class="detail-item" style="background: rgba(255, 255, 255, 0.15); border: 2px solid ${matchColor}; margin-bottom: 1.5rem; box-shadow: 0 0 20px ${matchColor}40;">
                <div style="text-align: center; width: 100%;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">
                        ${isAuthenticated ? '✅' : '❌'}
                    </div>
                    <div style="font-size: 1.4rem; font-weight: bold; margin-bottom: 0.5rem; color: ${matchColor}; text-shadow: 0 0 10px ${matchColor}60;">
                        ${matchText}
                    </div>
                    <div style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.8); margin-bottom: 0.5rem;">
                        ${matchSubtext}
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
                <span class="detail-label">🔐 Match Status</span>
                <span class="detail-value" style="color: ${matchColor}; font-weight: bold;">
                    <i class="${matchIconClass}"></i> ${matchText}
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
            ${hasConflicts ? `
            <div class="detail-item" style="background: rgba(245, 158, 11, 0.1); border: 2px solid #f59e0b; margin-top: 1rem;">
                <span class="detail-label">⚠️ Conflict Detection</span>
                <div style="margin-top: 0.5rem;">
                    <div style="color: #f59e0b; font-weight: bold; margin-bottom: 0.5rem;">
                        ${conflictDetection.conflict_count || 0} conflicting matches found
                    </div>
                    ${conflictDetection.conflict_resolution ? `
                    <div style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.8); margin-bottom: 0.5rem;">
                        <strong>Resolution:</strong> ${conflictDetection.conflict_resolution.reason || 'Conflict resolved'}
                    </div>
                    <div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.7);">
                        <strong>Method:</strong> ${conflictDetection.conflict_resolution.resolution_method || 'Unknown'}
                    </div>
                    ` : ''}
                </div>
            </div>
            ${conflictDetection.high_confidence_matches && conflictDetection.high_confidence_matches.length > 0 ? `
            <div class="detail-item" style="background: rgba(245, 158, 11, 0.05); border: 1px solid #f59e0b; margin-top: 0.5rem;">
                <span class="detail-label">🔄 Alternative Matches</span>
                <div style="margin-top: 0.5rem;">
                    ${conflictDetection.high_confidence_matches.slice(0, 3).map(match => `
                        <div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.8); margin-bottom: 0.3rem; padding: 0.3rem; background: rgba(0, 0, 0, 0.2); border-radius: 4px;">
                            <strong>${match.title}</strong> - ${match.match_percentage.toFixed(1)}% (${match.image_type})
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            ` : ''}
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
