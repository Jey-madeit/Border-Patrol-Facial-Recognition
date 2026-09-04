// User Management System
class UserManagementSystem {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.currentRoleFilter = 'all';
        this.currentStatusFilter = 'all';
        this.currentSearch = '';
        this.selectedUsers = new Set();
        this.allUsers = [];
        this.searchTimeout = null;
        this.totalPages = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUsers();
        this.loadStatistics();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('userSearch').addEventListener('input', (e) => {
            this.currentSearch = e.target.value;
            this.currentPage = 1;
            
            // Debounce search
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.loadUsers();
            }, 500);
        });

        // Filter functionality
        document.getElementById('roleFilter').addEventListener('change', (e) => {
            this.currentRoleFilter = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.currentStatusFilter = e.target.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        // Refresh button
        document.getElementById('refreshUsers').addEventListener('click', () => {
            this.currentPage = 1;
            this.loadUsers();
            this.loadStatistics();
        });

        // Add user button
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showAddUserModal();
        });

        // Bulk actions
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
            this.bulkDeleteUsers();
        });

        document.getElementById('selectAllBtn').addEventListener('click', () => {
            this.toggleSelectAll();
        });

        // Select all checkbox
        document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
            this.toggleSelectAll();
        });

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadUsers();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadUsers();
            }
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('userModal').addEventListener('click', (e) => {
            if (e.target.id === 'userModal') {
                this.closeModal();
            }
        });

        // Add User Modal controls
        document.getElementById('closeAddUserModal').addEventListener('click', () => {
            this.closeAddUserModal();
        });

        document.getElementById('addUserModal').addEventListener('click', (e) => {
            if (e.target.id === 'addUserModal') {
                this.closeAddUserModal();
            }
        });

        document.getElementById('cancelAddUser').addEventListener('click', () => {
            this.closeAddUserModal();
        });

        // Edit User Modal controls
        document.getElementById('closeEditUserModal').addEventListener('click', () => {
            this.closeEditUserModal();
        });

        document.getElementById('editUserModal').addEventListener('click', (e) => {
            if (e.target.id === 'editUserModal') {
                this.closeEditUserModal();
            }
        });

        document.getElementById('cancelEditUser').addEventListener('click', () => {
            this.closeEditUserModal();
        });

        // Form submissions
        document.getElementById('addUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createUser();
        });

        document.getElementById('editUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateUser();
        });
    }

    async loadUsers() {
        try {
            this.showLoading();
            
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/users/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load users: ${response.status}`);
            }

            const users = await response.json();
            this.allUsers = users.results || users || [];
            
            // Apply filters
            let filteredUsers = this.allUsers;
            
            if (this.currentRoleFilter !== 'all') {
                filteredUsers = filteredUsers.filter(user => user.role === this.currentRoleFilter);
            }
            
            if (this.currentStatusFilter !== 'all') {
                filteredUsers = filteredUsers.filter(user => {
                    if (this.currentStatusFilter === 'online') {
                        return user.is_online === true;
                    } else {
                        return user.is_online === false;
                    }
                });
            }
            
            if (this.currentSearch.trim()) {
                const searchTerm = this.currentSearch.toLowerCase();
                filteredUsers = filteredUsers.filter(user => 
                    (user.display_name && user.display_name.toLowerCase().includes(searchTerm)) ||
                    (user.username && user.username.toLowerCase().includes(searchTerm)) ||
                    (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                    (user.badge_id && user.badge_id.toLowerCase().includes(searchTerm))
                );
            }
            
            this.totalPages = Math.ceil(filteredUsers.length / this.pageSize);
            const startIndex = (this.currentPage - 1) * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
            
            this.displayUsers(paginatedUsers);
            this.updatePagination();

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users. Please try again.');
        }
    }

    async loadStatistics() {
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
                
                // Calculate statistics
                const totalUsers = userList.length;
                const adminUsers = userList.filter(user => user.role === 'admin').length;
                const officerUsers = userList.filter(user => user.role === 'officer').length;
                const onlineUsers = userList.filter(user => user.is_online === true).length;

                // Update UI
                document.getElementById('totalUsers').textContent = totalUsers;
                document.getElementById('adminUsers').textContent = adminUsers;
                document.getElementById('officerUsers').textContent = officerUsers;
                document.getElementById('onlineUsers').textContent = onlineUsers;
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    displayUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        
        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No users found</h3>
                        <p>Try adjusting your search criteria or add some users.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';

        users.forEach(user => {
            const row = this.createUserRow(user);
            tbody.appendChild(row);
        });
    }

    createUserRow(user) {
        const row = document.createElement('tr');
        row.dataset.userId = user.id;
        
        const lastLogin = user.last_active ? new Date(user.last_active).toLocaleDateString() : 'Never';
        const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown';
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="user-checkbox" data-user-id="${user.id}">
            </td>
            <td>
                <div class="user-info">
                    <div class="user-avatar">
                        ${user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div class="user-details">
                        <h4>${user.display_name || 'Unknown User'}</h4>
                        <p>${user.badge_id || 'N/A'}</p>
                    </div>
                </div>
            </td>
            <td>
                <span class="role-badge role-${user.role}">${user.role}</span>
            </td>
            <td>
                <span class="status-badge status-${user.is_online ? 'online' : 'offline'}">
                    ${user.is_online ? 'Online' : 'Offline'}
                </span>
            </td>
            <td>${lastLogin}</td>
            <td>${createdDate}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="userManager.viewUser('${user.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="userManager.editUser('${user.id}')" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="userManager.deleteUser('${user.id}')" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        // Add checkbox event listener
        const checkbox = row.querySelector('.user-checkbox');
        checkbox.addEventListener('change', (e) => {
            const userId = e.target.dataset.userId;
            if (e.target.checked) {
                this.selectedUsers.add(userId);
            } else {
                this.selectedUsers.delete(userId);
            }
            this.updateBulkDeleteButton();
        });
        
        return row;
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
        if (this.selectedUsers.size > 0) {
            bulkDeleteBtn.style.display = 'inline-flex';
            bulkDeleteBtn.innerHTML = `<i class="fas fa-trash"></i> Delete Selected (${this.selectedUsers.size})`;
        } else {
            bulkDeleteBtn.style.display = 'none';
        }
    }

    toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
            const userId = checkbox.dataset.userId;
            if (!allChecked) {
                this.selectedUsers.add(userId);
            } else {
                this.selectedUsers.delete(userId);
            }
        });
        
        selectAllCheckbox.checked = !allChecked;
        this.updateBulkDeleteButton();
    }

    async viewUser(userId) {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/users/${userId}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load user details');
            }

            const user = await response.json();
            this.showUserModal(user);

        } catch (error) {
            console.error('Error viewing user:', error);
            this.showError('Failed to load user details.');
        }
    }

    showUserModal(user) {
        document.getElementById('modalFullName').value = user.display_name || '';
        document.getElementById('modalUsername').value = user.username || '';
        document.getElementById('modalEmail').value = user.email || '';
        document.getElementById('modalBadgeId').value = user.badge_id || '';
        document.getElementById('modalRole').value = user.role || '';
        document.getElementById('modalStatus').value = user.is_online ? 'Online' : 'Offline';
        document.getElementById('modalLastLogin').value = user.last_active ? new Date(user.last_active).toLocaleString() : 'Never';
        document.getElementById('modalCreatedDate').value = user.created_at ? new Date(user.created_at).toLocaleString() : 'Unknown';

        document.getElementById('userModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('userModal').style.display = 'none';
    }

    async editUser(userId) {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/users/${userId}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load user details');
            }

            const user = await response.json();
            this.showEditUserModal(user);

        } catch (error) {
            console.error('Error loading user for edit:', error);
            this.showError('Failed to load user details for editing.');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/users/${userId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showSuccess('User deleted successfully!');
                this.loadUsers();
                this.loadStatistics();
            } else {
                throw new Error('Failed to delete user');
            }

        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Failed to delete user. Please try again.');
        }
    }

    async bulkDeleteUsers() {
        if (this.selectedUsers.size === 0) {
            this.showError('No users selected for deletion.');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${this.selectedUsers.size} selected users? This action cannot be undone.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const deletePromises = Array.from(this.selectedUsers).map(userId => 
                fetch(`/api/users/${userId}/`, {
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
                this.showSuccess(`Successfully deleted ${successful} user(s).`);
            }
            if (failed > 0) {
                this.showError(`Failed to delete ${failed} user(s).`);
            }

            this.selectedUsers.clear();
            this.updateBulkDeleteButton();
            this.loadUsers();
            this.loadStatistics();

        } catch (error) {
            console.error('Error in bulk delete:', error);
            this.showError('An error occurred during bulk deletion.');
        }
    }

    showAddUserModal() {
        // Clear form
        document.getElementById('addUserForm').reset();
        document.getElementById('addUserModal').style.display = 'block';
    }

    closeAddUserModal() {
        document.getElementById('addUserModal').style.display = 'none';
    }

    showEditUserModal(user) {
        // Populate form with user data
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editFirstName').value = user.first_name || '';
        document.getElementById('editLastName').value = user.last_name || '';
        document.getElementById('editUsername').value = user.username || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editBadgeId').value = user.badge_id || '';
        document.getElementById('editRole').value = user.role || '';
        document.getElementById('editIsActive').value = user.is_active ? 'true' : 'false';
        document.getElementById('editPassword').value = '';
        
        document.getElementById('editUserModal').style.display = 'block';
    }

    closeEditUserModal() {
        document.getElementById('editUserModal').style.display = 'none';
    }

    async createUser() {
        const form = document.getElementById('addUserForm');
        const formData = new FormData(form);
        const submitBtn = document.getElementById('submitAddUser');

        // Validate passwords match
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');
        
        if (password !== confirmPassword) {
            this.showError('Passwords do not match.');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

            const token = localStorage.getItem('access_token');
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: password,
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                badge_id: formData.get('badge_id'),
                role: formData.get('role'),
                is_active: true
            };

            const response = await fetch('/api/users/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('User created successfully!');
                this.closeAddUserModal();
                this.loadUsers();
                this.loadStatistics();
            } else {
                throw new Error(data.message || 'Failed to create user');
            }

        } catch (error) {
            console.error('Error creating user:', error);
            this.showError(error.message || 'Failed to create user. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create User';
        }
    }

    async updateUser() {
        const form = document.getElementById('editUserForm');
        const formData = new FormData(form);
        const submitBtn = document.getElementById('submitEditUser');
        const userId = formData.get('user_id');

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

            const token = localStorage.getItem('access_token');
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                badge_id: formData.get('badge_id'),
                role: formData.get('role'),
                is_active: formData.get('is_active') === 'true'
            };

            // Only include password if provided
            const password = formData.get('password');
            if (password && password.trim()) {
                userData.password = password;
            }

            const response = await fetch(`/api/users/${userId}/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('User updated successfully!');
                this.closeEditUserModal();
                this.loadUsers();
                this.loadStatistics();
            } else {
                throw new Error(data.message || 'Failed to update user');
            }

        } catch (error) {
            console.error('Error updating user:', error);
            this.showError(error.message || 'Failed to update user. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update User';
        }
    }

    showLoading() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    <i class="fas fa-spinner"></i>
                    <p>Loading users...</p>
                </td>
            </tr>
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
let userManager;

// Initialize user management system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    userManager = new UserManagementSystem();
});
