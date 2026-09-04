// Border Patrol Analytics Dashboard
class AnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.currentDateRange = 30;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAnalyticsData();
    }

    setupEventListeners() {
        // Date range selector
        document.getElementById('dateRange').addEventListener('change', (e) => {
            this.currentDateRange = parseInt(e.target.value);
            this.loadAnalyticsData();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadAnalyticsData();
        });
    }

    async loadAnalyticsData() {
        this.showLoading();
        
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Load analytics data
            const analyticsResponse = await fetch(`/api/analytics/?days=${this.currentDateRange}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!analyticsResponse.ok) {
                throw new Error(`Analytics request failed: ${analyticsResponse.status}`);
            }

            const analyticsData = await analyticsResponse.json();
            
            if (!analyticsData.success) {
                throw new Error(analyticsData.message || 'Failed to load analytics data');
            }

            // Load recent images
            const imagesResponse = await fetch('/api/images/?limit=12', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            let recentImages = [];
            if (imagesResponse.ok) {
                const imagesData = await imagesResponse.json();
                recentImages = imagesData.results || imagesData || [];
            }

            this.displayAnalytics(analyticsData.analytics, recentImages);
            this.hideLoading();

        } catch (error) {
            console.error('Analytics loading error:', error);
            this.showError(error.message);
        }
    }

    displayAnalytics(analytics, recentImages) {
        // Update summary stats
        this.updateSummaryStats(analytics.summary);
        
        // Create charts
        this.createUploadsChart(analytics.metrics);
        this.createActivityChart(analytics.metrics);
        
        // Display recent images
        this.displayRecentImages(recentImages);
        
        // Show content
        document.getElementById('analyticsContent').style.display = 'block';
    }

    updateSummaryStats(summary) {
        document.getElementById('totalImages').textContent = summary.total_images || 0;
        document.getElementById('totalUsers').textContent = summary.total_users || 0;
        document.getElementById('onlineUsers').textContent = summary.online_users || 0;
        document.getElementById('recentUploads').textContent = summary.recent_uploads || 0;
    }

    createUploadsChart(metrics) {
        const ctx = document.getElementById('uploadsChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.uploads) {
            this.charts.uploads.destroy();
        }

        // Prepare data for uploads chart
        const uploadsData = metrics.image_uploads || [];
        const labels = uploadsData.map(item => {
            const date = new Date(item.timestamp);
            return date.toLocaleDateString();
        });
        const values = uploadsData.map(item => item.value);

        this.charts.uploads = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Image Uploads',
                    data: values,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createActivityChart(metrics) {
        const ctx = document.getElementById('activityChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.activity) {
            this.charts.activity.destroy();
        }

        // Prepare data for activity chart
        const activityData = metrics.daily_activity || [];
        const labels = activityData.map(item => {
            const date = new Date(item.timestamp);
            return date.toLocaleDateString();
        });
        const values = activityData.map(item => item.value);

        this.charts.activity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Activity',
                    data: values,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: '#667eea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    displayRecentImages(images) {
        const container = document.getElementById('recentImages');
        container.innerHTML = '';

        if (images.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1;">No recent images found</p>';
            return;
        }

        images.forEach(image => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            
            const imageUrl = image.image || '/static/core/images/placeholder.jpg';
            const uploadDate = new Date(image.created_at).toLocaleDateString();
            
            imageItem.innerHTML = `
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
    }

    showLoading() {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('analyticsContent').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('analyticsContent').style.display = 'none';
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorState').style.display = 'block';
    }
}

// Initialize analytics dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnalyticsDashboard();
});
