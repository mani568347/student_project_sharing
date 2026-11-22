// ============================================
// ProjectShare - Main Application Logic
// ============================================

// Global State
let token = localStorage.getItem('token');
let currentUser = null;
let allProjects = [];
let allCategories = [];
let selectedFile = null;

// ============================================
// Utility Functions
// ============================================

function apiFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
}

function showToast(message, type = 'info', title = null) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type} animate-fade-in`;
    const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' };
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        </div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
    if (id === 'upload-modal') loadCategoriesForUpload();
    if (id === 'login-modal') document.getElementById('login-email').focus();
    if (id === 'register-modal') document.getElementById('register-name').focus();
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
    // Reset forms
    const form = document.getElementById(id).querySelector('form');
    if (form) form.reset();
    selectedFile = null;
    updateFileDisplay();
}

function switchModal(toId) {
    const current = document.querySelector('.modal.active');
    if (current) current.classList.remove('active');
    openModal(toId);
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    const button = document.querySelector('#user-menu button');
    const isHidden = dropdown.classList.toggle('hidden');
    if (button) {
        button.setAttribute('aria-expanded', !isHidden);
    }
}

function closeUserMenu() {
    document.getElementById('user-dropdown').classList.add('hidden');
    const button = document.querySelector('#user-menu button');
    if (button) {
        button.setAttribute('aria-expanded', 'false');
    }
}

function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

function setLoading(btnTextId, btnLoadingId, loading) {
    document.getElementById(btnTextId).classList.toggle('hidden', loading);
    document.getElementById(btnLoadingId).classList.toggle('hidden', !loading);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============================================
// Authentication
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) return showToast('Please fill all fields', 'error');

    setLoading('login-btn-text', 'login-btn-loading', true);
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');

        token = data.token;
        localStorage.setItem('token', token);
        closeModal('login-modal');
        showToast('Welcome back!', 'success');
        await initApp();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading('login-btn-text', 'login-btn-loading', false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (!name || !username || !email || !password || !confirm) return showToast('Please fill all fields', 'error');
    if (password !== confirm) return showToast('Passwords do not match', 'error');
    if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');

    setLoading('register-btn-text', 'register-btn-loading', true);
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName: name, username, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');

        token = data.token;
        localStorage.setItem('token', token);
        closeModal('register-modal');
        showToast('Account created successfully!', 'success');
        await initApp();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading('register-btn-text', 'register-btn-loading', false);
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    showToast('Logged out successfully', 'info');
    // Reset to home view
    const search = document.getElementById('search');
    const searchMobile = document.getElementById('search-mobile');
    const catFilter = document.getElementById('category-filter');
    const catFilterMobile = document.getElementById('category-filter-mobile');
    if (search) search.value = '';
    if (searchMobile) searchMobile.value = '';
    if (catFilter) catFilter.value = '';
    if (catFilterMobile) catFilterMobile.value = '';
    closeUserMenu();
    initApp();
}

function showProfile() {
    if (!currentUser) return;
    showToast(`Profile: ${currentUser.fullName} (${currentUser.email})`, 'info');
    // Could open a profile modal here
}

function showSettings() {
    showToast('Settings page coming soon!', 'info');
    // Could open a settings modal here
}

async function fetchCurrentUser() {
    if (!token) return null;
    try {
        const res = await apiFetch('/api/auth/me');
        if (!res.ok) throw new Error('Unauthorized');
        currentUser = await res.json();
        return currentUser;
    } catch (err) {
        token = null;
        localStorage.removeItem('token');
        return null;
    }
}

function updateAuthUI() {
    const loggedOut = document.getElementById('logged-out');
    const loggedIn = document.getElementById('logged-in');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');

    if (currentUser) {
        loggedOut.classList.add('hidden');
        loggedIn.classList.remove('hidden');
        userAvatar.textContent = currentUser.fullName?.charAt(0).toUpperCase() || currentUser.username?.charAt(0).toUpperCase() || 'U';
        userName.textContent = currentUser.fullName || currentUser.username;
        if (userEmail) userEmail.textContent = currentUser.email || '';
    } else {
        loggedOut.classList.remove('hidden');
        loggedIn.classList.add('hidden');
    }
}

// ============================================
// Categories
// ============================================

async function loadCategories() {
    try {
        const res = await apiFetch('/api/categories');
        if (res.ok) allCategories = await res.json();
    } catch (err) { console.error('Failed to load categories', err); }
}

function populateCategorySelects() {
    const selects = ['category-filter', 'category-filter-mobile', 'project-category'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = `<option value="">${id === 'project-category' ? 'Select a category' : 'All Categories'}</option>` +
            allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        select.value = currentVal;
    });
}

async function loadCategoriesForUpload() {
    if (allCategories.length === 0) {
        await loadCategories();
        populateCategorySelects();
    }
}

// ============================================
// Projects
// ============================================

async function fetchProjects() {
    try {
        const res = await apiFetch('/api/projects');
        if (!res.ok) throw new Error('Failed to fetch projects');
        allProjects = await res.json();
        renderProjects(allProjects);
    } catch (err) {
        showToast('Failed to load projects', 'error');
        document.getElementById('project-grid').innerHTML = '';
    }
}

function renderProjects(projects) {
    const grid = document.getElementById('project-grid');
    const emptyState = document.getElementById('empty-state');
    const countEl = document.getElementById('project-count');

    countEl.textContent = `${projects.length} project${projects.length !== 1 ? 's' : ''} found`;

    if (projects.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    grid.innerHTML = projects.map(p => createProjectCard(p)).join('');
}

function createProjectCard(p) {
    const isOwner = currentUser && (p.authorId === currentUser.id || p.author?.id === currentUser.id);
    const categoryClass = getCategoryClass(p.category);
    const tags = p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const createdAt = p.createdAt ? formatDate(p.createdAt) : 'Recently';

    return `
        <article class="project-card" data-id="${p.id}">
            <div class="card-header">
                <span class="card-category ${categoryClass}">${escapeHtml(p.category || 'Uncategorized')}</span>
                <h3 class="card-title">${escapeHtml(p.title)}</h3>
                <div class="card-meta">
                    <span><i class="fas fa-user"></i> ${escapeHtml(p.author?.fullName || p.author?.username || 'Unknown')}</span>
                    <span><i class="fas fa-calendar"></i> ${createdAt}</span>
                </div>
            </div>
            <div class="card-body">
                <p class="card-description">${escapeHtml(p.description || 'No description')}</p>
                <div class="card-tags">
                    ${tags.slice(0, 5).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
                    ${tags.length > 5 ? `<span class="tag">+${tags.length - 5} more</span>` : ''}
                </div>
            </div>
            <div class="card-footer">
                ${p.githubUrl ? `
                    <a href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener" class="btn btn-secondary">
                        <i class="fab fa-github"></i> Code
                    </a>
                ` : ''}
                ${p.fileUrl ? `
                    <a href="${escapeHtml(p.fileUrl)}" target="_blank" rel="noopener" class="btn btn-primary">
                        <i class="fas fa-download"></i> Download
                    </a>
                ` : ''}
                <button onclick="viewProject(${p.id})" class="btn btn-secondary flex-1">
                    <i class="fas fa-eye"></i> View
                </button>
                ${isOwner ? `
                    <button onclick="deleteProject(${p.id})" class="btn btn-danger">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                ` : ''}
            </div>
        </article>
    `;
}

function getCategoryClass(cat) {
    const map = {
        'Web': 'bg-blue-100 text-blue-700',
        'Mobile': 'bg-green-100 text-green-700',
        'AI': 'bg-purple-100 text-purple-700',
        'Desktop': 'bg-orange-100 text-orange-700',
        'Backend': 'bg-red-100 text-red-700',
        'Fullstack': 'bg-indigo-100 text-indigo-700',
        'DevOps': 'bg-teal-100 text-teal-700',
        'Other': 'bg-gray-100 text-gray-700'
    };
    return map[cat] || 'bg-gray-100 text-gray-700';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Search & Filter
// ============================================

function setupSearchAndFilter() {
    const searchInputs = ['search', 'search-mobile'];
    const categorySelects = ['category-filter', 'category-filter-mobile'];

    searchInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', debounce(filterProjects, 300));
    });

    categorySelects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => {
            // Sync both selectors
            categorySelects.forEach(otherId => {
                if (otherId !== id) document.getElementById(otherId).value = el.value;
            });
            filterProjects();
        });
    });
}

function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

function filterProjects() {
    const searchTerm = (document.getElementById('search')?.value || document.getElementById('search-mobile')?.value || '').toLowerCase();
    const category = document.getElementById('category-filter')?.value || document.getElementById('category-filter-mobile')?.value || '';

    let filtered = allProjects;

    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }

    if (searchTerm) {
        filtered = filtered.filter(p =>
            (p.title || '').toLowerCase().includes(searchTerm) ||
            (p.description || '').toLowerCase().includes(searchTerm) ||
            (p.tags || '').toLowerCase().includes(searchTerm) ||
            (p.author?.fullName || '').toLowerCase().includes(searchTerm) ||
            (p.author?.username || '').toLowerCase().includes(searchTerm)
        );
    }

    renderProjects(filtered);
}

// ============================================
// Project Upload
// ============================================

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 10 * 1024 * 1024) {
            showToast('File size exceeds 10MB limit', 'error');
            e.target.value = '';
            return;
        }
        selectedFile = file;
        updateFileDisplay();
    }
}

function updateFileDisplay() {
    const nameEl = document.getElementById('selected-file-name');
    const dropZone = document.getElementById('file-drop-zone');
    if (selectedFile) {
        nameEl.textContent = `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`;
        nameEl.classList.remove('hidden');
        dropZone.classList.add('file-drop-active');
    } else {
        nameEl.classList.add('hidden');
        dropZone.classList.remove('file-drop-active');
    }
}

function setupFileDrop() {
    const dropZone = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('project-file');

    ['dragenter', 'dragover'].forEach(event => {
        dropZone.addEventListener(event, e => {
            e.preventDefault();
            dropZone.classList.add('file-drop-active');
        });
    });
    ['dragleave', 'drop'].forEach(event => {
        dropZone.addEventListener(event, e => {
            e.preventDefault();
            dropZone.classList.remove('file-drop-active');
        });
    });
    dropZone.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect({ target: fileInput });
        }
    });
    dropZone.addEventListener('click', () => fileInput.click());
}

function updateDescCount() {
    const textarea = document.getElementById('project-description');
    const countEl = document.getElementById('desc-count');
    if (textarea && countEl) {
        countEl.textContent = `${textarea.value.length}/2000 characters`;
    }
}

async function handleUpload(e) {
    e.preventDefault();
    if (!token) return showToast('Please login first', 'error');

    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-description').value.trim();
    const categoryName = document.getElementById('project-category').value;
    const category = allCategories.find(c => c.name === categoryName)?.id || null;
    const repoUrl = document.getElementById('project-repo').value.trim();
    const tags = document.getElementById('project-tags').value.trim();

    if (!title || !description || !category) return showToast('Please fill required fields', 'error');

    setLoading('upload-btn-text', 'upload-btn-loading', true);
    try {
        const formData = new FormData();
        const projectData = {
            title,
            description,
            categoryId: allCategories.find(c => c.name === category)?.id,
            githubUrl: repoUrl,
            tags: tags.split(',').map(t => t.trim())
        };
        formData.append('project', new Blob([JSON.stringify(projectData)], { type: 'application/json' }));
        if (selectedFile) formData.append('file', selectedFile);

        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload failed');

        closeModal('upload-modal');
        showToast('Project uploaded successfully!', 'success');
        await fetchProjects();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading('upload-btn-text', 'upload-btn-loading', false);
    }
}

// ============================================
// Project Detail / Delete
// ============================================

async function viewProject(id) {
    const project = allProjects.find(p => p.id === id);
    if (!project) return;

    const isOwner = currentUser && (project.authorId === currentUser.id || project.author?.id === currentUser.id);
    const tags = project.tags ? project.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const createdAt = project.createdAt ? formatDate(project.createdAt) : 'Recently';

    document.getElementById('detail-content').innerHTML = `
        <div class="space-y-5">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <span class="card-category ${getCategoryClass(project.category)}">${escapeHtml(project.category || 'Uncategorized')}</span>
                    <h2 class="text-2xl font-bold mt-2">${escapeHtml(project.title)}</h2>
                    <div class="flex items-center gap-4 mt-2 text-gray-600">
                        <span><i class="fas fa-user mr-1"></i> ${escapeHtml(project.author?.fullName || project.author?.username || 'Unknown')}</span>
                        <span><i class="fas fa-calendar mr-1"></i> ${createdAt}</span>
                    </div>
                </div>
            </div>
            <div class="prose max-w-none text-gray-700">${escapeHtml(project.description || 'No description provided.').replace(/\n/g, '<br>')}</div>
            ${tags.length ? `
                <div class="flex flex-wrap gap-2">
                    ${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
                </div>
            ` : ''}
            <div class="flex gap-3 pt-4 border-t">
                ${project.githubUrl ? `
                    <a href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noopener" class="btn btn-secondary flex-1 justify-center">
                        <i class="fab fa-github"></i> View Repository
                    </a>
                ` : ''}
                ${project.fileUrl ? `
                    <a href="${escapeHtml(project.fileUrl)}" target="_blank" rel="noopener" class="btn btn-primary flex-1 justify-center">
                        <i class="fas fa-download"></i> Download File
                    </a>
                ` : ''}
                ${isOwner ? `
                    <button onclick="deleteProject(${project.id}); closeModal('detail-modal')" class="btn btn-danger flex-1 justify-center">
                        <i class="fas fa-trash"></i> Delete Project
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    openModal('detail-modal');
}

async function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

    try {
        const res = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Delete failed');
        }
        showToast('Project deleted', 'success');
        await fetchProjects();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function showMyProjects() {
    closeUserMenu();
    if (!currentUser) return;
    // Filter to user's projects
    const mine = allProjects.filter(p => p.authorId === currentUser.id || p.author?.id === currentUser.id);
    renderProjects(mine);
    document.getElementById('project-count').textContent = `Your projects (${mine.length})`;
}

// ============================================
// Initialize App
// ============================================

async function initApp() {
    await fetchCurrentUser();
    updateAuthUI();
    await loadCategories();
    populateCategorySelects();
    await fetchProjects();
    setupSearchAndFilter();
    setupFileDrop();

    // Description counter
    document.getElementById('project-description')?.addEventListener('input', updateDescCount);

    // Close dropdown on outside click
    document.addEventListener('click', e => {
        if (!e.target.closest('#user-menu')) document.getElementById('user-dropdown').classList.add('hidden');
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    // ESC key to close modals
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
            closeUserMenu();
        }
    });

    // Home link - reset to home view
    document.getElementById('home-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        resetToHome();
    });
}

function resetToHome() {
    // Close all modals
    document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
    closeUserMenu();

    // Reset search and filters
    const search = document.getElementById('search');
    const searchMobile = document.getElementById('search-mobile');
    const catFilter = document.getElementById('category-filter');
    const catFilterMobile = document.getElementById('category-filter-mobile');
    if (search) search.value = '';
    if (searchMobile) searchMobile.value = '';
    if (catFilter) catFilter.value = '';
    if (catFilterMobile) catFilterMobile.value = '';

    // Re-render all projects
    renderProjects(allProjects);
    document.getElementById('project-count').textContent = `${allProjects.length} project${allProjects.length !== 1 ? 's' : ''} found`;
}

document.addEventListener('DOMContentLoaded', initApp);