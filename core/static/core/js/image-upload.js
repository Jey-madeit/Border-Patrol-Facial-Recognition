// Border Patrol Image Upload & Management
class ImageUploadManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 12;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.selectedImages = new Set();
        this.allImages = [];
        this.searchTimeout = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadRecentImages();
    }

    setupEventListeners() {
        // File upload area
        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('imageFile');

        // Click to browse
        fileUploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // File selection
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // Drag and drop
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // Form submission
        document.getElementById('uploadForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadImage();
        });

        // Management controls
        document.getElementById('imageSearch').addEventListener('input', (e) => {
            this.currentSearch = e.target.value;
            this.currentPage = 1;
            
            // Debounce search
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.loadRecentImages();
            }, 500);
        });

        document.getElementById('imageFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.currentPage = 1;
            this.loadRecentImages();
        });

        document.getElementById('refreshImages').addEventListener('click', () => {
            this.currentPage = 1;
            this.loadRecentImages();
        });

        document.getElementById('loadMoreBtn').addEventListener('click', () => {
            this.loadMoreImages();
        });

        document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
            this.bulkDeleteImages();
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('imageModal').addEventListener('click', (e) => {
            if (e.target.id === 'imageModal') {
                this.closeModal();
            }
        });
    }

    handleFileSelect(file) {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file.');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size too large. Maximum size is 10MB.');
            return;
        }

        // Update UI to show selected file while preserving the file input
        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('imageFile');
        
        // Keep the file input but hide it and show file info
        fileInput.style.display = 'none';
        fileUploadArea.innerHTML = `
            <i class="fas fa-check-circle" style="color: #10b981;"></i>
            <p><strong>${file.name}</strong></p>
            <p style="font-size: 14px; color: #666;">${this.formatFileSize(file.size)}</p>
            <button type="button" id="removeFileBtn" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Remove</button>
        `;
        
        // Add the file input back to the form (hidden)
        fileUploadArea.appendChild(fileInput);
        
        // Add event listener for remove button
        document.getElementById('removeFileBtn').addEventListener('click', () => {
            this.resetFileUploadArea();
        });
    }

    async uploadImage() {
        const form = document.getElementById('uploadForm');
        const formData = new FormData(form);
        const uploadBtn = document.getElementById('uploadBtn');

        // Validate required fields with specific error messages
        const title = formData.get('title');
        const imageType = formData.get('image_type');
        const image = formData.get('image');
        
        if (!title || !title.trim()) {
            this.showError('Please enter an image title.');
            return;
        }
        
        if (!imageType) {
            this.showError('Please select an image type.');
            return;
        }
        
        if (!image || image.size === 0) {
            this.showError('Please select an image file.');
            return;
        }

        try {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/upload-image/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Image uploaded successfully!');
                form.reset();
                this.resetFileUploadArea();
                this.currentPage = 1;
                this.loadRecentImages();
            } else {
                throw new Error(data.message || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.showError(error.message || 'An error occurred while uploading the image.');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Image';
        }
    }

    async loadRecentImages() {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const params = new URLSearchParams({
                page: this.currentPage,
                page_size: this.pageSize
            });

            if (this.currentFilter !== 'all') {
                params.append('image_type', this.currentFilter);
            }

            if (this.currentSearch.trim()) {
                params.append('search', this.currentSearch.trim());
            }

            const response = await fetch(`/api/images/?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load images: ${response.status}`);
            }

            const data = await response.json();
            const images = data.results || data || [];
            
            if (this.currentPage === 1) {
                this.allImages = images;
            } else {
                this.allImages = [...this.allImages, ...images];
            }

            this.displayRecentImages(this.allImages);
            this.updateLoadMoreButton(images.length === this.pageSize);

        } catch (error) {
            console.error('Error loading recent images:', error);
            this.showError('Failed to load images. Please try again.');
        }
    }

    async loadMoreImages() {
        this.currentPage++;
        await this.loadRecentImages();
    }

    displayRecentImages(images) {
        const container = document.getElementById('recentImages');
        
        if (this.currentPage === 1) {
            container.innerHTML = '';
        }

        if (images.length === 0 && this.currentPage === 1) {
            container.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1;">No images found</p>';
            return;
        }

        images.forEach(image => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.dataset.imageId = image.id;
            
            const imageUrl = image.image || '/static/core/images/placeholder.jpg';
            const uploadDate = new Date(image.created_at).toLocaleDateString();
            
            imageItem.innerHTML = `
                <input type="checkbox" class="image-checkbox" data-image-id="${image.id}">
                <div class="image-actions">
                    <button class="action-btn view-btn" onclick="imageManager.viewImage('${image.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="imageManager.editImage('${image.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="imageManager.deleteImage('${image.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <img src="${imageUrl}" alt="${image.title}" onerror="this.src='/static/core/images/placeholder.jpg'">
                <div class="info">
                    <div class="title">${image.title}</div>
                    <div class="meta">
                        ${image.uploaded_by_name || 'Unknown'} • ${uploadDate}
                    </div>
                </div>
            `;
            
            container.appendChild(imageItem);
        });

        // Add checkbox event listeners
        this.setupCheckboxListeners();
    }

    setupCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.image-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const imageId = e.target.dataset.imageId;
                if (e.target.checked) {
                    this.selectedImages.add(imageId);
                } else {
                    this.selectedImages.delete(imageId);
                }
                this.updateBulkDeleteButton();
            });
        });
    }

    updateBulkDeleteButton() {
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (this.selectedImages.size > 0) {
            bulkDeleteBtn.style.display = 'inline-flex';
            bulkDeleteBtn.innerHTML = `<i class="fas fa-trash"></i> Delete Selected (${this.selectedImages.size})`;
        } else {
            bulkDeleteBtn.style.display = 'none';
        }
    }

    updateLoadMoreButton(hasMore) {
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        if (hasMore) {
            loadMoreContainer.style.display = 'block';
        } else {
            loadMoreContainer.style.display = 'none';
        }
    }

    async viewImage(imageId) {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/images/${imageId}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load image details');
            }

            const image = await response.json();
            this.showImageModal(image);

        } catch (error) {
            console.error('Error viewing image:', error);
            this.showError('Failed to load image details.');
        }
    }

    showImageModal(image) {
        document.getElementById('modalImage').src = image.image || '/static/core/images/placeholder.jpg';
        document.getElementById('modalImageTitle').textContent = image.title || 'No title';
        document.getElementById('modalImageDescription').textContent = image.description || 'No description';
        document.getElementById('modalImageType').textContent = this.formatImageType(image.image_type);
        document.getElementById('modalImageLocation').textContent = image.location || 'No location';
        document.getElementById('modalImageTags').textContent = image.tags || 'No tags';
        document.getElementById('modalImageUploader').textContent = image.uploaded_by_name || 'Unknown';
        document.getElementById('modalImageDate').textContent = new Date(image.created_at).toLocaleString();
        document.getElementById('modalImageSize').textContent = this.formatFileSize(image.file_size || 0);

        document.getElementById('imageModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('imageModal').style.display = 'none';
    }

    async editImage(imageId) {
        // For now, just show a message - can be expanded later
        this.showSuccess('Edit functionality will be implemented in the next update.');
    }

    async deleteImage(imageId) {
        if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/images/${imageId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showSuccess('Image deleted successfully!');
                this.currentPage = 1;
                this.loadRecentImages();
            } else {
                throw new Error('Failed to delete image');
            }

        } catch (error) {
            console.error('Error deleting image:', error);
            this.showError('Failed to delete image. Please try again.');
        }
    }

    async bulkDeleteImages() {
        if (this.selectedImages.size === 0) {
            this.showError('No images selected for deletion.');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${this.selectedImages.size} selected images? This action cannot be undone.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const deletePromises = Array.from(this.selectedImages).map(imageId => 
                fetch(`/api/images/${imageId}/`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
            );

            const results = await Promise.allSettled(deletePromises);
            const successful = results.filter(result => result.status === 'fulfilled' && result.value.ok).length;
            const failed = results.length - successful;

            if (successful > 0) {
                this.showSuccess(`Successfully deleted ${successful} image(s).`);
            }
            if (failed > 0) {
                this.showError(`Failed to delete ${failed} image(s).`);
            }

            this.selectedImages.clear();
            this.updateBulkDeleteButton();
            this.currentPage = 1;
            this.loadRecentImages();

        } catch (error) {
            console.error('Error in bulk delete:', error);
            this.showError('An error occurred during bulk deletion.');
        }
    }

    formatImageType(type) {
        const typeMap = {
            'surveillance': 'Surveillance Image',
            'incident': 'Incident Photo',
            'person': 'Person of Interest',
            'vehicle': 'Vehicle Image',
            'document': 'Document',
            'other': 'Other'
        };
        return typeMap[type] || type;
    }

    resetFileUploadArea() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('imageFile');
        
        // Reset the file input
        fileInput.value = '';
        fileInput.style.display = 'block';
        
        // Reset the upload area display
        fileUploadArea.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Drag and drop an image here or click to browse</p>
        `;
        
        // Add the file input back
        fileUploadArea.appendChild(fileInput);
        
        // Re-add event listener
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        messageDiv.textContent = message;

        // Insert after the upload form
        const uploadForm = document.querySelector('.upload-form');
        uploadForm.insertAdjacentElement('afterend', messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Global instance for onclick handlers
let imageManager;

// Initialize image upload manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    imageManager = new ImageUploadManager();
});