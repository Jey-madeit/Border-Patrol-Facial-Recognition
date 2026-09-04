// Image Management System
class ImageManagementSystem {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 12;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.selectedImages = new Set();
        this.allImages = [];
        this.searchTimeout = null;
        this.totalPages = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadImages();
        this.loadStatistics();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('imageSearch').addEventListener('input', (e) => {
            this.currentSearch = e.target.value;
            this.currentPage = 1;
            
            // Debounce search
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.loadImages();
            }, 500);
        });

        // Filter functionality
        document.getElementById('imageFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.currentPage = 1;
            this.loadImages();
        });

        // Refresh button
        document.getElementById('refreshImages').addEventListener('click', () => {
            this.currentPage = 1;
            this.loadImages();
            this.loadStatistics();
        });

        // Bulk actions
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
            this.bulkDeleteImages();
        });

        document.getElementById('selectAllBtn').addEventListener('click', () => {
            this.toggleSelectAll();
        });

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadImages();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadImages();
            }
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

    async loadImages() {
        try {
            this.showLoading();
            
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
            
            this.totalPages = data.total_pages || 1;
            this.displayImages(images);
            this.updatePagination();

        } catch (error) {
            console.error('Error loading images:', error);
            this.showError('Failed to load images. Please try again.');
        }
    }

    async loadStatistics() {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('/api/images/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const images = data.results || data || [];
                
                // Calculate statistics
                const totalImages = images.length;
                const today = new Date().toDateString();
                const todayUploads = images.filter(img => 
                    new Date(img.created_at).toDateString() === today
                ).length;
                
                const totalSize = images.reduce((sum, img) => sum + (img.file_size || 0), 0);
                const adminImages = images.filter(img => 
                    img.uploaded_by_name && img.uploaded_by_name.includes('ADMIN')
                ).length;

                // Update UI
                document.getElementById('totalImages').textContent = totalImages;
                document.getElementById('todayUploads').textContent = todayUploads;
                document.getElementById('totalSize').textContent = this.formatFileSize(totalSize);
                document.getElementById('adminImages').textContent = adminImages;
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    displayImages(images) {
        const container = document.getElementById('imagesContainer');
        
        if (images.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <h3>No images found</h3>
                    <p>Try adjusting your search criteria or upload some images.</p>
                </div>
            `;
            return;
        }

        const imagesGrid = document.createElement('div');
        imagesGrid.className = 'images-grid';

        images.forEach(image => {
            const imageCard = this.createImageCard(image);
            imagesGrid.appendChild(imageCard);
        });

        container.innerHTML = '';
        container.appendChild(imagesGrid);
    }

    createImageCard(image) {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.dataset.imageId = image.id;
        
        const imageUrl = image.image || '/static/core/images/placeholder.jpg';
        const uploadDate = new Date(image.created_at).toLocaleDateString();
        const fileSize = this.formatFileSize(image.file_size || 0);
        
        card.innerHTML = `
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
            <img src="${imageUrl}" alt="${image.title}" class="image-preview" onerror="this.src='/static/core/images/placeholder.jpg'">
            <div class="image-info">
                <div class="image-title">${image.title || 'Untitled'}</div>
                <div class="image-meta">
                    <span class="image-type">${this.formatImageType(image.image_type)}</span>
                    <span>${fileSize}</span>
                </div>
                <div class="image-description">${image.description || 'No description available'}</div>
            </div>
        `;
        
        // Add checkbox event listener
        const checkbox = card.querySelector('.image-checkbox');
        checkbox.addEventListener('change', (e) => {
            const imageId = e.target.dataset.imageId;
            if (e.target.checked) {
                this.selectedImages.add(imageId);
            } else {
                this.selectedImages.delete(imageId);
            }
            this.updateBulkDeleteButton();
        });
        
        return card;
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

    updateBulkDeleteButton() {
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (this.selectedImages.size > 0) {
            bulkDeleteBtn.style.display = 'inline-flex';
            bulkDeleteBtn.innerHTML = `<i class="fas fa-trash"></i> Delete Selected (${this.selectedImages.size})`;
        } else {
            bulkDeleteBtn.style.display = 'none';
        }
    }

    toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.image-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
            const imageId = checkbox.dataset.imageId;
            if (!allChecked) {
                this.selectedImages.add(imageId);
            } else {
                this.selectedImages.delete(imageId);
            }
        });
        
        this.updateBulkDeleteButton();
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
                this.loadImages();
                this.loadStatistics();
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
            this.loadImages();
            this.loadStatistics();

        } catch (error) {
            console.error('Error in bulk delete:', error);
            this.showError('An error occurred during bulk deletion.');
        }
    }

    formatImageType(type) {
        const typeMap = {
            'surveillance': 'Surveillance',
            'incident': 'Incident',
            'person': 'Person of Interest',
            'vehicle': 'Vehicle',
            'document': 'Document',
            'other': 'Other'
        };
        return typeMap[type] || type;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showLoading() {
        const container = document.getElementById('imagesContainer');
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner"></i>
                <p>Loading images...</p>
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

// Global instance for onclick handlers
let imageManager;

// Initialize image management system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    imageManager = new ImageManagementSystem();
});
