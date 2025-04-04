const apiUrl = 'https://v0qfpab6i0.execute-api.ap-south-1.amazonaws.com/prod/tasks';
const cognitoConfig = {
    region: 'ap-south-1',
    userPoolId: 'ap-south-1_TOz2PRMwh',
    clientId: '4gco1icvh412q2o014bjfk6576'
};

AWS.config.update({ region: cognitoConfig.region });
const cognito = new AWS.CognitoIdentityServiceProvider();

// DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const toggleFormBtn = document.getElementById('toggle-form');
const taskFormContent = document.querySelector('.task-form .form-content');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Toggle task form
    if (toggleFormBtn && taskFormContent) {
        toggleFormBtn.addEventListener('click', () => {
            taskFormContent.classList.toggle('hidden');
            toggleFormBtn.innerHTML = taskFormContent.classList.contains('hidden') ? 
                '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
        });
    }
    
    // Check for saved theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Initialize the app
    if (localStorage.getItem('idToken')) {
        showTaskManager();
    } else {
        showAuth();
    }
    
    // Add enter key event for task creation
    document.getElementById('task-title')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') createTask();
    });
});

// Theme functions
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Auth functions
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showToast('Please enter both email and password', 'error');
        return;
    }
    
    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: cognitoConfig.clientId,
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password
        }
    };

    try {
        showLoader();
        const data = await cognito.initiateAuth(params).promise();
        storeTokens(data.AuthenticationResult);
        showTaskManager();
        showToast('Login successful!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showToast(`Login failed: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

async function signup() {
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    if (!username || !email || !password) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }

    const params = {
        ClientId: cognitoConfig.clientId,
        Username: username,
        Password: password,
        UserAttributes: [
            { Name: 'email', Value: email }
        ]
    };

    try {
        showLoader();
        await cognito.signUp(params).promise();
        showToast('Confirmation code sent to your email', 'success');
        showConfirmationForm(params.Username);
    } catch (error) {
        console.error('Signup error:', error);
        showToast(`Signup failed: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

async function confirmSignup() {
    const username = document.getElementById('confirm-username').value;
    const code = document.getElementById('confirmation-code').value;
    
    if (!code) {
        showToast('Please enter confirmation code', 'error');
        return;
    }
    
    const params = {
        ClientId: cognitoConfig.clientId,
        Username: username,
        ConfirmationCode: code
    };

    try {
        showLoader();
        await cognito.confirmSignUp(params).promise();
        showToast('Account confirmed! You can now login', 'success');
        showForm('login');
    } catch (error) {
        console.error('Confirmation error:', error);
        showToast(`Confirmation failed: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

async function resendConfirmation() {
    const username = document.getElementById('confirm-username').value;
    
    try {
        showLoader();
        await cognito.resendConfirmationCode({
            ClientId: cognitoConfig.clientId,
            Username: username
        }).promise();
        showToast('New confirmation code sent', 'success');
    } catch (error) {
        console.error('Resend error:', error);
        showToast(`Failed to resend code: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

function logout() {
    localStorage.clear();
    showAuth();
    showToast('Logged out successfully', 'success');
}

// Token management
function storeTokens(authResult) {
    localStorage.setItem('idToken', authResult.IdToken);
    localStorage.setItem('accessToken', authResult.AccessToken);
    localStorage.setItem('refreshToken', authResult.RefreshToken);
    localStorage.setItem('tokenExpiry', Date.now() + (authResult.ExpiresIn * 1000));
}

async function refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
        logout();
        return false;
    }

    const params = {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: cognitoConfig.clientId,
        AuthParameters: {
            REFRESH_TOKEN: refreshToken
        }
    };

    try {
        const data = await cognito.initiateAuth(params).promise();
        storeTokens(data.AuthenticationResult);
        return true;
    } catch (error) {
        console.error('Token refresh failed:', error);
        logout();
        return false;
    }
}

// UI functions
function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('task-manager').style.display = 'none';
    showForm('login');
}

function showTaskManager() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('task-manager').style.display = 'block';
    const token = JSON.parse(atob(localStorage.getItem('idToken').split('.')[1]));
    document.getElementById('current-user').textContent = token['cognito:username'];
    getTasks();
    setupBulkActionDropdown();
}

function showForm(formType) {
    document.getElementById('login-form').style.display = formType === 'login' ? 'block' : 'none';
    document.getElementById('signup-form').style.display = formType === 'signup' ? 'block' : 'none';
    document.getElementById('confirm-form').style.display = 'none';
}

function showConfirmationForm(username) {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('confirm-form').style.display = 'block';
    document.getElementById('confirm-username').value = username;
}

// API functions
async function makeAuthenticatedRequest(url, options = {}) {
    let idToken = localStorage.getItem('idToken');
    
    if (!idToken) {
        logout();
        throw new Error('Not authenticated');
    }

    // Check if token is expired
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
        const refreshSuccess = await refreshToken();
        if (!refreshSuccess) {
            throw new Error('Session expired');
        }
        idToken = localStorage.getItem('idToken');
    }

    try {
        let response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        if (response.status === 401) {
            const refreshSuccess = await refreshToken();
            if (refreshSuccess) {
                const newIdToken = localStorage.getItem('idToken');
                return fetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${newIdToken}`
                    }
                });
            }
            throw new Error('Session expired');
        }
        
        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Task Operations
function renderTasks(tasks) {
    const taskList = document.querySelector('#task-list tbody');
    taskList.innerHTML = '';

    if (tasks.length === 0) {
        taskList.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">
                    <i class="fas fa-tasks"></i>
                    <h3>No tasks found</h3>
                    <p>Get started by creating your first task</p>
                    <button class="primary-btn" onclick="document.getElementById('task-title').focus()">
                        <i class="fas fa-plus"></i> Create Task
                    </button>
                </td>
            </tr>
        `;
        updateStats(tasks);
        updateProgressBar(tasks);
        return;
    }

    tasks.forEach(task => {
        const row = taskList.insertRow();
        const isCompleted = task.task_status === 'Completed';
        const statusButtonText = isCompleted ? 'Mark Pending' : 'Mark Completed';
        const statusButtonClass = isCompleted ? 'mark-pending' : 'mark-completed';
        const statusButtonIcon = isCompleted ? 'fa-clock' : 'fa-check-circle';
        
        // Due date coloring logic
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let dueDateClass = '';
        let dueDateText = 'No due date';
        
        if (dueDate) {
            dueDateText = formatDate(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate < today) {
                dueDateClass = 'overdue';
            } else if (dueDate.getTime() === today.getTime()) {
                dueDateClass = 'due-today';
            }
        }
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="task-checkbox" data-task-id="${task.id}">
            </td>
            <td>
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-description">${escapeHtml(task.description || 'No description')}</div>
            </td>
            <td>
                <span class="${isCompleted ? 'status-completed' : 'status-pending'}">
                    ${escapeHtml(task.task_status)}
                </span>
            </td>
            <td class="${dueDateClass}">
                ${dueDateText}
            </td>
            <td>
                <div class="task-actions">
                    <button class="action-btn ${statusButtonClass}" 
                            onclick="updateTask('${task.id}', '${isCompleted ? 'Pending' : 'Completed'}')">
                        <i class="fas ${statusButtonIcon}"></i> ${statusButtonText}
                    </button>
                    <button class="action-btn delete-button" onclick="deleteTask('${task.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
    });

    updateStats(tasks);
    updateProgressBar(tasks);
    setupBulkActions();
}

function updateStats(tasks) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.task_status === 'Completed').length;
    const pendingTasks = totalTasks - completedTasks;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueTasks = tasks.filter(task => {
        if (!task.due_date || task.task_status === 'Completed') return false;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    }).length;
    
    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('completed-tasks').textContent = completedTasks;
    document.getElementById('pending-tasks').textContent = pendingTasks;
    document.getElementById('overdue-tasks').textContent = overdueTasks;
}

function updateProgressBar(tasks) {
    const completed = tasks.filter(t => t.task_status === 'Completed').length;
    const total = tasks.length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `${completed}/${total} tasks (${progress}%)`;
}

function setupBulkActions() {
    document.getElementById('bulk-select-all').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.task-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });
}

function setupBulkActionDropdown() {
    const bulkActionSelect = document.getElementById('bulk-action-select');
    const bulkActionButton = document.querySelector('.bulk-actions button');
    
    bulkActionSelect.addEventListener('change', function() {
        bulkActionButton.style.display = this.value === '' ? 'none' : 'block';
    });
    
    // Initialize button visibility
    bulkActionButton.style.display = 'none';
}

function getSelectedTaskIds() {
    return Array.from(document.querySelectorAll('.task-checkbox:checked'))
               .map(checkbox => checkbox.dataset.taskId);
}

async function handleBulkAction(action) {
    const taskIds = getSelectedTaskIds();
    if (taskIds.length === 0) {
        showToast('Please select at least one task', 'warning');
        return;
    }

    let actionMessage = '';
    let confirmButtonText = '';
    let buttonClass = 'danger-btn';
    
    switch(action) {
        case 'delete':
            actionMessage = `delete ${taskIds.length} selected task(s)`;
            confirmButtonText = 'Delete';
            buttonClass = 'danger-btn';
            break;
        case 'Completed':
            actionMessage = `mark ${taskIds.length} task(s) as completed`;
            confirmButtonText = 'Mark Completed';
            buttonClass = 'success-btn';
            break;
        case 'Pending':
            actionMessage = `mark ${taskIds.length} task(s) as pending`;
            confirmButtonText = 'Mark Pending';
            buttonClass = 'warning-btn';
            break;
        default:
            return;
    }

    showModal(
        'Confirm Bulk Action',
        `Are you sure you want to ${actionMessage}?`,
        async () => {
            try {
                showLoader();
                if (action === 'delete') {
                    const promises = taskIds.map(id => 
                        makeAuthenticatedRequest(`${apiUrl}/${id}`, { method: 'DELETE' })
                    );
                    await Promise.all(promises);
                    showToast(`Deleted ${taskIds.length} task(s)`, 'success');
                } else {
                    const promises = taskIds.map(id => 
                        makeAuthenticatedRequest(`${apiUrl}/${id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ task_status: action })
                        })
                    );
                    await Promise.all(promises);
                    showToast(`Updated ${taskIds.length} task(s) to ${action}`, 'success');
                }
                getTasks();
                closeModal();
            } catch (error) {
                console.error('Error:', error);
                showToast(`Error performing bulk action`, 'error');
                closeModal();
            } finally {
                hideLoader();
            }
        },
        confirmButtonText,
        buttonClass
    );
}

async function getTasks() {
    try {
        showLoader();
        const response = await makeAuthenticatedRequest(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const tasks = await response.json();
        renderTasks(tasks);
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading tasks', 'error');
    } finally {
        hideLoader();
    }
}

async function createTask() {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const dueDate = document.getElementById('task-due-date').value;
    
    if (!title) {
        showToast('Task title is required', 'warning');
        document.getElementById('task-title').focus();
        return;
    }

    const taskData = {
        title,
        description,
        due_date: dueDate || null
    };

    try {
        showLoader();
        const response = await makeAuthenticatedRequest(apiUrl, {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) throw new Error('Failed to create task');
        
        getTasks();
        clearForm();
        showToast('Task created successfully', 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error creating task', 'error');
    } finally {
        hideLoader();
    }
}

async function updateTask(taskId, newStatus) {
    try {
        showLoader();
        const response = await makeAuthenticatedRequest(`${apiUrl}/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ task_status: newStatus })
        });
        
        if (!response.ok) throw new Error('Failed to update task');
        
        getTasks();
        showToast(`Task marked as ${newStatus}`, 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error updating task', 'error');
    } finally {
        hideLoader();
    }
}

// Modal functions
function showModal(title, message, action, confirmButtonText = 'Confirm', buttonClass = 'primary-btn') {
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    
    const confirmBtn = document.getElementById('modal-confirm');
    confirmBtn.innerHTML = `<i class="fas ${getActionIcon(confirmButtonText)}"></i> ${confirmButtonText}`;
    confirmBtn.className = `${buttonClass}`;
    
    confirmBtn.onclick = async () => {
        try {
            await action();
        } catch (error) {
            console.error('Modal action error:', error);
        }
    };
    
    modal.classList.add('active');
}

function getActionIcon(actionText) {
    switch(actionText) {
        case 'Delete': return 'fa-trash';
        case 'Mark Completed': return 'fa-check-circle';
        case 'Mark Pending': return 'fa-clock';
        default: return 'fa-check';
    }
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

async function deleteTask(taskId) {
    showModal(
        'Delete Task',
        'Are you sure you want to delete this task? This action cannot be undone.',
        async () => {
            try {
                showLoader();
                const response = await makeAuthenticatedRequest(`${apiUrl}/${taskId}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) throw new Error('Failed to delete task');
                
                getTasks();
                closeModal();
                showToast('Task deleted successfully', 'success');
            } catch (error) {
                console.error('Error:', error);
                showToast('Error deleting task', 'error');
                closeModal();
            } finally {
                hideLoader();
            }
        },
        'Delete',
        'danger-btn'
    );
}

// Helper functions
function clearForm() {
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-due-date').value = '';
}

function escapeHtml(unsafe) {
    return unsafe?.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;") || '';
}

function formatDate(dateString) {
    if (!dateString) return 'No date';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Filter/Sort functionality
async function applyFilters() {
    try {
        showLoader();
        const response = await makeAuthenticatedRequest(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        
        const tasks = await response.json();
        const statusFilter = document.getElementById('status-filter').value;
        const sortBy = document.getElementById('sort-by').value;
        
        let filteredTasks = tasks;
        if (statusFilter !== 'all') {
            filteredTasks = tasks.filter(task => task.task_status === statusFilter);
        }
        
        filteredTasks.sort((a, b) => {
            const dateA = a[sortBy] ? new Date(a[sortBy]) : new Date(0);
            const dateB = b[sortBy] ? new Date(b[sortBy]) : new Date(0);
            return dateA - dateB;
        });
        
        renderTasks(filteredTasks);
    } catch (error) {
        console.error('Error:', error);
        showToast('Error applying filters', 'error');
    } finally {
        hideLoader();
    }
}

function searchTasks() {
    const searchTerm = document.getElementById('task-search').value.toLowerCase();
    const rows = document.querySelectorAll('#task-list tbody tr');
    
    rows.forEach(row => {
        if (row.classList.contains('empty-state')) return;
        
        const title = row.cells[1].textContent.toLowerCase();
        const desc = row.cells[1].textContent.toLowerCase();
        row.style.display = (title.includes(searchTerm) || desc.includes(searchTerm)) ? '' : 'none';
    });
}

// UI Feedback functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function showLoader() {
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.innerHTML = '<div class="loader-spinner"></div>';
    document.body.appendChild(loader);
}

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.remove();
}

// Add toast styles dynamically
const toastStyles = document.createElement('style');
toastStyles.textContent = `
.toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--card-bg);
    color: var(--text-color);
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 9999;
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.3s ease;
    max-width: 400px;
    border-left: 4px solid var(--primary-color);
}

.toast.show {
    transform: translateY(0);
    opacity: 1;
}

.toast-close {
    background: transparent;
    border: none;
    color: var(--text-color);
    cursor: pointer;
    padding: 0;
    margin-left: 12px;
}

.toast-success {
    border-left-color: var(--success-color);
}

.toast-error {
    border-left-color: var(--danger-color);
}

.toast-warning {
    border-left-color: var(--warning-color);
}

#global-loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.loader-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: var(--primary-color);
    animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
`;
document.head.appendChild(toastStyles);