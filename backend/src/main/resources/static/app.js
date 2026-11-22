// ============================================
// StudentProject — Main Application Logic
// ============================================

let token = localStorage.getItem('token');
let currentUser = null;
let allProjects = [];
let allCategories = [];
let selectedFile = null;
let currentView = 'grid';
let viewingAuthor = null;
let currentTab = 'community'; // community | myprojects | favorites
const FAVORITES_KEY = 'sp_favorites';
function getFavorites() { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); }
function saveFavorites(arr) { localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr)); }

// ============================================
// Utility
// ============================================

function apiFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
}

function showToast(message, type = 'info', title = null) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type} animate-fade-in`;
    const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas fa-${icons[type] || icons.info}"></i></div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${esc(title)}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function esc(str) { const d = document.createElement('div'); d.textContent = str ?? ''; return d.innerHTML; }
function formatDate(dateStr) { if (!dateStr) return 'Recently'; return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }

// ============================================
// Modal helpers
// ============================================

function openModal(id) {
    document.getElementById(id)?.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (id === 'upload-modal') loadCategoriesForUpload();
    if (id === 'login-modal') document.getElementById('login-username')?.focus();
    if (id === 'register-modal') document.getElementById('register-name')?.focus();
}
function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById(id)?.querySelector('form')?.reset();
    selectedFile = null;
    updateFileDisplay();
}
function switchModal(toId) {
    document.querySelector('.modal.active')?.classList.remove('active');
    openModal(toId);
}

// ============================================
// Dropdown & mobile menu
// ============================================

function toggleUserMenu() {
    const dd = document.getElementById('user-dropdown');
    const btn = document.querySelector('#user-menu button');
    const isHidden = dd.classList.toggle('hidden');
    if (btn) btn.setAttribute('aria-expanded', !isHidden);
}
function closeUserMenu() {
    document.getElementById('user-dropdown')?.classList.add('hidden');
    const btn = document.querySelector('#user-menu button');
    if (btn) btn.setAttribute('aria-expanded', 'false');
}
function toggleMobileMenu() { document.getElementById('mobile-menu')?.classList.toggle('hidden'); }

function setLoading(textId, loadingId, loading) {
    document.getElementById(textId)?.classList.toggle('hidden', loading);
    document.getElementById(loadingId)?.classList.toggle('hidden', !loading);
}

// ============================================
// Auth
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    if (!username || !password) return showToast('Please fill all fields', 'error');
    setLoading('login-btn-text', 'login-btn-loading', true);
    try {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        token = data.token;
        localStorage.setItem('token', token);
        closeModal('login-modal');
        showToast('Welcome back!', 'success');
        await initApp();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading('login-btn-text', 'login-btn-loading', false); }
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
        const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: name, username, email, password }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');
        token = data.token;
        localStorage.setItem('token', token);
        closeModal('register-modal');
        showToast('Account created successfully!', 'success');
        await initApp();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading('register-btn-text', 'register-btn-loading', false); }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    viewingAuthor = null;
    currentTab = 'community';
    showToast('Logged out successfully', 'info');
    syncSearchInputs('');
    resetCategoryFilters('');
    closeUserMenu();
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
    initApp();
}

function handleProtectedUpload() {
    if (!currentUser) { openModal('login-modal'); return; }
    openModal('upload-modal');
}

function showProfile() {
    if (!currentUser) return;
    showToast(`Profile: ${currentUser.fullName} (@${currentUser.username})`, 'info');
}
function showSettings() { showToast('Settings coming soon!', 'info'); }

async function fetchCurrentUser() {
    if (!token) return null;
    try {
        const res = await apiFetch('/api/auth/me');
        if (!res.ok) throw new Error('Unauthorized');
        currentUser = await res.json();
        return currentUser;
    } catch { token = null; localStorage.removeItem('token'); return null; }
}

function updateAuthUI() {
    const loggedOut = document.getElementById('logged-out');
    const loggedIn = document.getElementById('logged-in');
    const avatar = document.getElementById('user-avatar');
    const userEmail = document.getElementById('user-email');
    if (currentUser) {
        loggedOut.classList.add('hidden');
        loggedIn.classList.remove('hidden');
        loggedIn.classList.add('flex');
        avatar.textContent = (currentUser.fullName || currentUser.username || 'U').charAt(0).toUpperCase();
        if (userEmail) userEmail.textContent = `${currentUser.fullName} (@${currentUser.username})`;
    } else {
        loggedOut.classList.remove('hidden');
        loggedIn.classList.add('hidden');
        loggedIn.classList.remove('flex');
    }
}

// ============================================
// View switching (landing vs dashboard)
// ============================================

function switchToLanding() {
    document.getElementById('landing-view')?.classList.remove('hidden');
    document.getElementById('dashboard-view')?.classList.add('hidden');
    document.getElementById('welcome-bar')?.classList.add('hidden');
}
function switchToDashboard() {
    document.getElementById('landing-view')?.classList.add('hidden');
    document.getElementById('dashboard-view')?.classList.remove('hidden');
    document.getElementById('welcome-bar')?.classList.remove('hidden');
    populateDashboardSidebar();
    populateTrendingCats();
    setTabActive('community');
}

function setTabActive(tab) {
    currentTab = tab;
    viewingAuthor = null;
    syncSearchInputs('');
    resetCategoryFilters('');
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('border-gh-accent', 'text-white');
        b.classList.add('border-transparent', 'text-gh-muted');
    });
    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeBtn) { activeBtn.classList.remove('border-transparent', 'text-gh-muted'); activeBtn.classList.add('border-gh-accent', 'text-white'); }
    applyTabLabels(tab);
    renderCurrentTab();
}

function switchTab(tab) {
    closeUserMenu();
    setTabActive(tab);
}

function applyTabLabels(tab) {
    const titles = {
        community: { t: 'Community Projects', s: 'Discover what others are building' },
        myprojects: { t: 'My Projects', s: 'Projects you\'ve shared' },
        favorites: { t: 'Favorites', s: 'Projects you\'ve bookmarked' }
    };
    const emptyInfo = {
        community: { title: 'No projects found', msg: 'Try adjusting your search or be the first to upload!' },
        myprojects: { title: 'You haven\'t uploaded anything yet', msg: 'Share your first project with the community.' },
        favorites: { title: 'No favorites yet', msg: 'Star projects to save them here.' }
    };
    const info = titles[tab] || titles.community;
    const empty = emptyInfo[tab] || emptyInfo.community;
    document.getElementById('tab-title').textContent = info.t;
    document.getElementById('tab-subtitle').textContent = info.s;
    document.getElementById('empty-title').textContent = empty.title;
    document.getElementById('empty-msg').textContent = empty.msg;
    const emptyUpload = document.getElementById('empty-upload-btn');
    if (emptyUpload) emptyUpload.classList.toggle('hidden', tab === 'favorites');
}

// ============================================
// Favorites
// ============================================

function toggleFavorite(e, projectId) {
    e.stopPropagation();
    if (!currentUser) { openModal('login-modal'); return; }
    let favs = getFavorites();
    const idx = favs.indexOf(projectId);
    if (idx > -1) {
        favs.splice(idx, 1);
        showToast('Removed from favorites', 'info');
    } else {
        favs.push(projectId);
        showToast('Added to favorites', 'success');
    }
    saveFavorites(favs);
    // Update star icon state in rendered cards
    renderCurrentTab();
}

// ============================================
// Categories
// ============================================

async function loadCategories() {
    try {
        const res = await apiFetch('/api/categories');
        if (res.ok) allCategories = await res.json();
    } catch { /* silent */ }
}

function populateCategorySelects() {
    ['category-filter', 'category-filter-mobile', 'category-filter-desktop-only'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const val = sel.value;
        sel.innerHTML = '<option value="">All Categories</option>' +
            allCategories.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
        sel.value = val;
    });
}

function resetCategoryFilters(val) {
    ['category-filter', 'category-filter-mobile', 'category-filter-desktop-only'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });
}

async function loadCategoriesForUpload() {
    if (allCategories.length === 0) { await loadCategories(); populateCategorySelects(); }
    const sel = document.getElementById('project-category');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Select category</option>' +
        allCategories.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
    sel.value = cur;
}

function populateTrendingCats() {
    const container = document.getElementById('trending-cats');
    if (!container) return;
    const counts = {};
    allProjects.forEach(p => { const c = p.categoryName || 'Uncategorized'; counts[c] = (counts[c] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (sorted.length === 0) { container.innerHTML = '<p class="text-sm text-gh-muted">No categories yet</p>'; return; }
    container.innerHTML = sorted.map(([cat, n]) => {
        const color = getCatColor(cat);
        return `<div class="flex items-center justify-between text-sm">
            <span class="flex items-center gap-2 text-gh-text"><span class="lang-dot" style="background:${color}"></span>${esc(cat)}</span>
            <span class="font-mono text-gh-muted text-xs">${n}</span>
        </div>`;
    }).join('');
}

// ============================================
// Projects rendering
// ============================================

const CATEGORY_COLORS = {
    Web: '#58a6ff', Mobile: '#3fb950', AI: '#8957e5', Desktop: '#d29922',
    Backend: '#f85149', Fullstack: '#bc8cff', DevOps: '#56d364', Cloud: '#79c0ff',
    Data: '#e3b341', Other: '#8b949e'
};

function getCatColor(cat) {
    return CATEGORY_COLORS[(cat || 'Other').replace(/\s+/g, '')] || CATEGORY_COLORS.Other;
}

async function fetchProjects() {
    try {
        const res = await apiFetch('/api/projects');
        if (!res.ok) throw new Error('Failed to fetch projects');
        allProjects = await res.json();
        updateStats();
        // Re-render whatever is currently visible
        const landingView = document.getElementById('landing-view');
        if (landingView && !landingView.classList.contains('hidden')) {
            renderProjects(getFilteredProjects());
        } else {
            renderCurrentTab();
        }
    } catch (err) {
        showToast('Failed to load projects', 'error');
        const grid = document.getElementById('project-grid');
        if (grid) grid.innerHTML = '';
    }
}

function renderProjects(projects) {
    const grid = document.getElementById('project-grid');
    const empty = document.getElementById('empty-state');
    const countEl = document.getElementById('project-count');
    const count = Array.isArray(projects) ? projects.length : 0;
    const prefix = viewingAuthor ? `@${viewingAuthor} · ` : '';
    countEl.textContent = `${prefix}${count} project${count === 1 ? '' : 's'}`;
    if (count === 0) { grid.innerHTML = ''; empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');
    grid.className = currentView === 'list' ? 'view-list' : 'view-grid';
    grid.innerHTML = projects.map(p => createRepoCard(p)).join('');
}

function createRepoCard(p) {
    const isOwner = currentUser && p.userId === currentUser.id;
    const catColor = getCatColor(p.categoryName);
    const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? String(p.tags).split(',').map(t => t.trim()).filter(Boolean) : []);
    const updatedAt = p.updatedAt ? formatDate(p.updatedAt) : formatDate(p.createdAt);
    const canDownload = !!p.filePath || !!p.repoUrl;
    const demoUrl = p.demoUrl || '';
    const hasDemo = demoUrl.startsWith('http');
    const isFav = currentUser && getFavorites().includes(p.id);
    const favoritedClass = isFav ? 'text-yellow-400' : '';

    return `
    <article class="repo-card">
        <div class="repo-card-title">
            <a href="#" onclick="event.preventDefault(); viewProject(${p.id})">${esc(p.title)}</a>
        </div>
        <div class="repo-card-meta">
            <span class="author"><a href="#" onclick="event.preventDefault(); filterByAuthor('${esc(p.username || '').toLowerCase()}')" title="View @${esc(p.username || '')}'s projects">@${esc(p.username || 'unknown')}</a></span>
            <span class="dot">·</span>
            <span style="color:${catColor}"><span class="lang-dot" style="background:${catColor}"></span>${esc(p.categoryName || 'Uncategorized')}</span>
            <span class="dot">·</span>
            <span><i class="far fa-clock"></i> ${updatedAt}</span>
            ${hasDemo ? `<span class="dot">·</span><a href="${esc(demoUrl)}" target="_blank" rel="noopener" class="live-badge"><i class="fas fa-external-link-alt"></i> Live</a>` : ''}
        </div>
        <div class="repo-card-desc">${esc(p.description || 'No description provided.')}</div>
        ${tags.length ? `<div class="repo-card-tags">${tags.slice(0, 5).map(t => `<span class="repo-tag">${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="repo-card-footer">
            ${hasDemo ? `<a href="${esc(demoUrl)}" target="_blank" rel="noopener" class="live-badge"><i class="fas fa-external-link-alt"></i> Live Preview</a>` : ''}
            ${canDownload ? `
                <div class="relative group">
                    <button id="dl-btn-${p.id}" class="btn btn-primary"><i class="fas fa-code"></i> Code</button>
                    <div class="hidden group-hover:block absolute bottom-full right-0 mb-1 w-44 bg-gh-surface border border-gh-border rounded-md shadow-lg z-20 overflow-hidden">
                        ${p.fileUrl ? `<a href="${esc(p.fileUrl)}" target="_blank" rel="noopener" class="block px-3 py-2 text-sm text-gh-text hover:bg-gh-hover hover:text-white transition-colors"><i class="fas fa-download mr-2 text-gh-green"></i>Download .zip</a>` : ''}
                        ${p.repoUrl ? `<a href="${esc(p.repoUrl)}" target="_blank" rel="noopener" class="block px-3 py-2 text-sm text-gh-text hover:bg-gh-hover hover:text-white transition-colors border-t border-gh-border"><i class="fab fa-github mr-2"></i>View on GitHub</a>` : ''}
                    </div>
                </div>
            ` : ''}
            <button onclick="viewProject(${p.id})" class="btn btn-secondary ml-auto"><i class="far fa-eye"></i> Details</button>
            <button onclick="toggleFavorite(event, ${p.id})" class="star-btn ${favoritedClass}" title="${isFav ? 'Unfavorite' : 'Favorite'}"><i class="${isFav ? 'fas' : 'far'} fa-star"></i></button>
            ${isOwner ? `<button onclick="deleteProject(${p.id})" class="btn btn-danger"><i class="fas fa-trash-alt"></i></button>` : ''}
        </div>
    </article>`;
}

function filterByAuthor(username) {
    if (viewingAuthor === username.toLowerCase()) {
        viewingAuthor = null;
        syncSearchInputs('');
        filterProjects();
        return;
    }
    viewingAuthor = username.toLowerCase();
    const searchInput = document.getElementById('search');
    const searchMobile = document.getElementById('search-mobile');
    if (searchInput) searchInput.value = `@${username}`;
    if (searchMobile) searchMobile.value = `@${username}`;
    filterProjects();
}

function setView(mode) {
    currentView = mode;
    const gridBtn = document.getElementById('view-grid-btn');
    const listBtn = document.getElementById('view-list-btn');
    if (gridBtn) { gridBtn.classList.toggle('text-gh-accent', mode === 'grid'); gridBtn.classList.toggle('bg-gh-hover', mode === 'grid'); gridBtn.classList.toggle('text-gh-muted', mode !== 'grid'); }
    if (listBtn) { listBtn.classList.toggle('text-gh-accent', mode === 'list'); listBtn.classList.toggle('bg-gh-hover', mode === 'list'); listBtn.classList.toggle('text-gh-muted', mode !== 'list'); }
    if (currentTab === 'community' || viewingAuthor) {
        renderProjects(getFilteredProjects());
    } else {
        renderCurrentTab();
    }
}

function syncSearchInputs(val) {
    ['search', 'search-mobile', 'search-desktop-only'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
    });
}

function getFilteredProjects() {
    const raw = (document.getElementById('search')?.value || document.getElementById('search-mobile')?.value || document.getElementById('search-desktop-only')?.value || '').trim().toLowerCase();
    const category = document.getElementById('category-filter')?.value || document.getElementById('category-filter-mobile')?.value || '';
    let results = allProjects;
    if (category) results = results.filter(p => p.categoryName === category);
    if (raw) {
        results = results.filter(p => {
            if ((p.title || '').toLowerCase().includes(raw)) return true;
            if ((p.description || '').toLowerCase().includes(raw)) return true;
            if ((p.username || '').toLowerCase().includes(raw)) return true;
            if ((Array.isArray(p.tags) ? p.tags.join(',') : String(p.tags || '')).toLowerCase().includes(raw)) return true;
            if ((p.categoryName || '').toLowerCase().includes(raw)) return true;
            return false;
        });
    }
    if (viewingAuthor) results = results.filter(p => (p.username || '').toLowerCase() === viewingAuthor);
    return results;
}

function setupSearchAndFilter() {
    ['search', 'search-mobile', 'search-desktop-only'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', debounce(() => { syncAllSearch(el.value); filterProjects(); }, 300));
    });
    ['category-filter', 'category-filter-mobile', 'category-filter-desktop-only'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => { syncAllCategory(el.value); filterProjects(); });
    });
}

function syncAllSearch(val) {
    ['search', 'search-mobile', 'search-desktop-only'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value !== val) el.value = val;
    });
}

function syncAllCategory(val) {
    ['category-filter', 'category-filter-mobile', 'category-filter-desktop-only'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value !== val) el.value = val;
    });
}

function filterProjects() {
    const filtered = getFilteredProjects();
    renderProjects(filtered);
}

function renderCurrentTab() {
    let projects;
    if (currentTab === 'community') {
        projects = getFilteredProjects();
    } else if (currentTab === 'myprojects' && currentUser) {
        projects = allProjects.filter(p => p.userId === currentUser.id);
    } else if (currentTab === 'favorites') {
        const favIds = getFavorites();
        projects = allProjects.filter(p => favIds.includes(p.id));
    } else {
        projects = allProjects;
    }
    renderProjects(projects);
}

// ============================================
// Stats
// ============================================

async function updateStats() {
    const students = new Set(allProjects.map(p => p.userId).filter(Boolean)).size;
    const cats = new Set(allProjects.map(p => p.categoryName).filter(Boolean)).size;
    const elP = document.getElementById('stat-projects');
    const elS = document.getElementById('stat-students');
    const elC = document.getElementById('stat-categories');
    if (elP) elP.textContent = allProjects.length;
    if (elS) elS.textContent = Math.max(students, 1);
    if (elC) elC.textContent = Math.max(cats, 1);
}

function populateDashboardSidebar() {
    if (!currentUser) return;
    const avatar = document.getElementById('sidebar-avatar');
    const name = document.getElementById('sidebar-name');
    const uname = document.getElementById('sidebar-username');
    const sbProj = document.getElementById('sb-stat-projects');
    const sbFav = document.getElementById('sb-stat-favorites');
    const sbAct = document.getElementById('sb-stat-activity');
    if (avatar) avatar.textContent = (currentUser.fullName || currentUser.username || 'U').charAt(0).toUpperCase();
    if (name) name.textContent = currentUser.fullName || currentUser.username;
    if (uname) uname.textContent = `@${currentUser.username}`;
    const mine = allProjects.filter(p => p.userId === currentUser.id).length;
    const favs = getFavorites().length;
    if (sbProj) sbProj.textContent = mine;
    if (sbFav) sbFav.textContent = favs;
    if (sbAct && currentUser.createdAt) {
        const days = Math.max(1, Math.floor((Date.now() - new Date(currentUser.createdAt).getTime()) / 86400000));
        sbAct.textContent = days;
    }
}

// ============================================
// Upload
// ============================================

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('File size exceeds 10MB limit', 'error'); e.target.value = ''; return; }
    selectedFile = file;
    updateFileDisplay();
}

function updateFileDisplay() {
    const nameEl = document.getElementById('selected-file-name');
    const dropZone = document.getElementById('file-drop-zone');
    if (selectedFile) {
        nameEl.textContent = `${selectedFile.name}  ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`;
        nameEl.classList.remove('hidden');
        dropZone?.classList.add('border-gh-green');
    } else {
        nameEl?.classList.add('hidden');
        dropZone?.classList.remove('border-gh-green');
    }
}

function setupFileDrop() {
    const dropZone = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('project-file');
    if (!dropZone || !fileInput) return;
    ['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('border-gh-accent'); }));
    ['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('border-gh-accent'); }));
    dropZone.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) { fileInput.files = e.dataTransfer.files; handleFileSelect({ target: fileInput }); }
    });
    dropZone.addEventListener('click', () => fileInput.click());
}

function updateDescCount() {
    const ta = document.getElementById('project-description');
    const cnt = document.getElementById('desc-count');
    if (ta && cnt) cnt.textContent = `${ta.value.length}/2000 characters`;
}

async function handleUpload(e) {
    e.preventDefault();
    if (!token) return showToast('Please sign in first', 'error');
    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-description').value.trim();
    const categoryName = document.getElementById('project-category').value;
    const repoUrl = document.getElementById('project-repo').value.trim();
    const demoUrl = document.getElementById('project-demo').value.trim();
    const tags = document.getElementById('project-tags').value.trim();
    if (!title || !description || !categoryName) return showToast('Title, description and category are required', 'error');
    const catObj = allCategories.find(c => c.name === categoryName);
    if (!catObj) return showToast('Invalid category selected', 'error');
    setLoading('upload-btn-text', 'upload-btn-loading', true);
    try {
        const formData = new FormData();
        const projectData = {
            title, description, categoryId: catObj.id, repoUrl,
            demoUrl: demoUrl.startsWith('http') ? demoUrl : null,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
        };
        formData.append('project', new Blob([JSON.stringify(projectData)], { type: 'application/json' }));
        if (selectedFile) formData.append('file', selectedFile);
        const res = await fetch('/api/projects', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload failed');
        closeModal('upload-modal');
        showToast('Project published successfully!', 'success');
        await fetchProjects();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading('upload-btn-text', 'upload-btn-loading', false); }
}

// ============================================
// Project detail modal
// ============================================

async function viewProject(id) {
    const p = allProjects.find(x => x.id === id);
    if (!p) return;
    const isOwner = currentUser && p.userId === currentUser.id;
    const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? String(p.tags).split(',').map(t => t.trim()).filter(Boolean) : []);
    const updatedAt = p.updatedAt ? formatDate(p.updatedAt) : formatDate(p.createdAt);
    const catColor = getCatColor(p.categoryName);
    let linksHtml = '';
    if (p.repoUrl) linksHtml += `<a href="${esc(p.repoUrl)}" target="_blank" rel="noopener" class="btn btn-secondary flex-1 justify-center"><i class="fab fa-github"></i> View Repository</a>`;
    if (p.fileUrl) linksHtml += `<a href="${esc(p.fileUrl)}" target="_blank" rel="noopener" class="btn btn-primary flex-1 justify-center"><i class="fas fa-download"></i> Download</a>`;
    if (p.demoUrl) linksHtml += `<a href="${esc(p.demoUrl)}" target="_blank" rel="noopener" class="live-badge flex items-center gap-1"><i class="fas fa-external-link-alt"></i> Live Preview</a>`;
    if (isOwner) linksHtml += `<button onclick="deleteProject(${p.id}); closeModal('detail-modal')" class="btn btn-danger flex-shrink-0"><i class="fas fa-trash-alt"></i> Delete</button>`;
    document.getElementById('detail-content').innerHTML = `
    <div class="space-y-5">
        <div>
            <span class="inline-block text-xs font-semibold uppercase tracking-wider mb-2" style="color:${catColor}; opacity:0.8;">${esc(p.categoryName || 'Uncategorized')}</span>
            <h2 class="text-xl font-bold text-white">${esc(p.title)}</h2>
            <div class="flex items-center gap-3 mt-2 text-sm text-gh-muted flex-wrap">
                <a href="#" onclick="event.preventDefault(); filterByAuthor('${esc(p.username || '')}')" class="hover:text-gh-accent transition-colors">@${esc(p.username || 'unknown')}</a>
                <span>·</span><span><i class="far fa-clock mr-1"></i>${updatedAt}</span>
                ${tags.length ? `<span>·</span>${tags.slice(0, 4).map(t => `<span class="repo-tag ml-1">${esc(t)}</span>`).join('')}` : ''}
            </div>
        </div>
        <div class="text-gh-text text-sm leading-relaxed whitespace-pre-wrap">${esc(p.description || 'No description.')}</div>
        ${tags.length > 4 ? `<div class="flex flex-wrap gap-2">${tags.slice(4).map(t => `<span class="repo-tag">${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="flex flex-wrap gap-3 pt-3 border-t border-gh-border">${linksHtml}</div>
    </div>`;
    openModal('detail-modal');
}

async function deleteProject(id) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
        const res = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
        if (!res.ok) { const data = await res.json(); throw new Error(data.message || 'Delete failed'); }
        showToast('Project deleted', 'success');
        // Remove from favorites too
        let favs = getFavorites();
        favs = favs.filter(f => f !== id);
        saveFavorites(favs);
        await fetchProjects();
    } catch (err) { showToast(err.message, 'error'); }
}

// ============================================
// Home Page Enhancements
// ============================================

function filterByTech(tech) {
    // Update active chip
    document.querySelectorAll('.tech-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent.toLowerCase().includes(tech) || tech === 'all');
        chip.classList.toggle('bg-gh-accent/10', chip.textContent.toLowerCase().includes(tech) || tech === 'all');
        chip.classList.toggle('text-gh-accent', chip.textContent.toLowerCase().includes(tech) || tech === 'all');
        chip.classList.toggle('border-gh-accent/20', chip.textContent.toLowerCase().includes(tech) || tech === 'all');
        chip.classList.toggle('bg-gh-bg/50', !(chip.textContent.toLowerCase().includes(tech) || tech === 'all'));
        chip.classList.toggle('text-gh-text', !(chip.textContent.toLowerCase().includes(tech) || tech === 'all'));
        chip.classList.toggle('border-gh-border', !(chip.textContent.toLowerCase().includes(tech) || tech === 'all'));
    });

    // Update search and category filters
    if (tech === 'all') {
        syncSearchInputs('');
        resetCategoryFilters('');
    } else {
        syncSearchInputs(tech);
        resetCategoryFilters(tech);
    }

    filterProjects();
}

function closeOnboardingBanner() {
    document.getElementById('onboarding-banner')?.remove();
}

async function fetchTrendingProjects() {
    try {
        const res = await apiFetch('/api/projects?sort=downloads&limit=3');
        if (res.ok) {
            const trending = await res.json();
            renderTrendingProjects(trending);
        }
    } catch (err) {
        console.warn('Failed to fetch trending projects', err);
        // Fallback to static data already in HTML
    }
}

function renderTrendingProjects(projects) {
    const container = document.getElementById('trending-projects');
    if (!container) return;

    if (projects.length === 0) return;

    container.innerHTML = projects.map(p => {
        const catColor = getCatColor(p.categoryName);
        const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? String(p.tags).split(',').map(t => t.trim()).filter(Boolean) : []);
        const updatedAt = p.updatedAt ? formatDate(p.updatedAt) : formatDate(p.createdAt);
        const isFav = currentUser && getFavorites().includes(p.id);
        const favoritedClass = isFav ? 'text-yellow-400' : '';

        return `
        <article class="repo-card">
            <div class="repo-card-title">
                <a href="#" onclick="event.preventDefault(); viewProject(${p.id})">${esc(p.title)}</a>
            </div>
            <div class="repo-card-meta">
                <span class="author"><a href="#" onclick="event.preventDefault(); filterByAuthor('${esc(p.username || '').toLowerCase()}')" title="View @${esc(p.username || '')}'s projects">@${esc(p.username || 'unknown')}</a></span>
                <span class="dot">·</span>
                <span style="color:${catColor}"><span class="lang-dot" style="background:${catColor}"></span>${esc(p.categoryName || 'Uncategorized')}</span>
                <span class="dot">·</span>
                <span><i class="far fa-clock"></i> ${updatedAt}</span>
                ${p.demoUrl ? `<span class="dot">·</span><a href="${esc(p.demoUrl)}" target="_blank" rel="noopener" class="live-badge"><i class="fas fa-external-link-alt"></i> Live</a>` : ''}
            </div>
            <div class="repo-card-desc">${esc(p.description || 'No description provided.')}</div>
            ${tags.length ? `<div class="repo-card-tags">${tags.slice(0, 5).map(t => `<span class="repo-tag">${esc(t)}</span>`).join('')}</div>` : ''}
            <div class="repo-card-footer">
                ${p.demoUrl ? `<a href="${esc(p.demoUrl)}" target="_blank" rel="noopener" class="live-badge"><i class="fas fa-external-link-alt"></i> Live Preview</a>` : ''}
                ${p.fileUrl ? `
                    <div class="relative group">
                        <button id="dl-btn-${p.id}" class="btn btn-primary"><i class="fas fa-code"></i> Code</button>
                        <div class="hidden group-hover:block absolute bottom-full right-0 mb-1 w-44 bg-gh-surface border border-gh-border rounded-md shadow-lg z-20 overflow-hidden">
                            <a href="${esc(p.fileUrl)}" target="_blank" rel="noopener" class="block px-3 py-2 text-sm text-gh-text hover:bg-gh-hover hover:text-white transition-colors"><i class="fas fa-download mr-2 text-gh-green"></i>Download .zip</a>
                            ${p.repoUrl ? `<a href="${esc(p.repoUrl)}" target="_blank" rel="noopener" class="block px-3 py-2 text-sm text-gh-text hover:bg-gh-hover hover:text-white transition-colors border-t border-gh-border"><i class="fab fa-github mr-2"></i>View on GitHub</a>` : ''}
                        </div>
                    </div>
                ` : ''}
                <button onclick="viewProject(${p.id})" class="btn btn-secondary ml-auto"><i class="far fa-eye"></i> Details</button>
                <button onclick="toggleFavorite(event, ${p.id})" class="star-btn ${favoritedClass}" title="${isFav ? 'Unfavorite' : 'Favorite'}"><i class="${isFav ? 'fas' : 'far'} fa-star"></i></button>
                ${currentUser && p.userId === currentUser.id ? `<button onclick="deleteProject(${p.id})" class="btn btn-danger"><i class="fas fa-trash-alt"></i></button>` : ''}
            </div>
        </article>`;
    }).join('');
}

async function fetchCollaborationProjects() {
    try {
        const res = await apiFetch('/api/projects?collaboration=true&limit=6');
        if (res.ok) {
            const projects = await res.json();
            renderCollaborationProjects(projects);
        }
    } catch (err) {
        console.warn('Failed to fetch collaboration projects', err);
        // Fallback to static data already in HTML
    }
}

function renderCollaborationProjects(projects) {
    const container = document.getElementById('collaboration-projects');
    if (!container) return;

    if (projects.length === 0) {
        container.innerHTML = '<p class="text-gh-muted text-sm col-span-3">No collaboration projects found</p>';
        return;
    }

    container.innerHTML = projects.map(p => {
        const catColor = getCatColor(p.categoryName);
        const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? String(p.tags).split(',').map(t => t.trim()).filter(Boolean) : []);
        const isFav = currentUser && getFavorites().includes(p.id);
        const favoritedClass = isFav ? 'text-yellow-400' : '';

        return `
        <div class="bg-gh-surface border border-gh-border rounded-md p-6 hover:border-gh-accent/50 transition-colors group">
            <div class="flex items-center gap-3 mb-4">
                <span class="w-3 h-3 rounded-full bg-gh-green inline-flex"></span>
                <span class="text-sm font-semibold text-gh-text">Open to Contribute</span>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">${esc(p.title)}</h3>
            <p class="text-gh-muted text-sm mb-4 line-clamp-3">${esc(p.description || 'No description provided.')}</p>
            <div class="flex flex-wrap gap-2 mb-4">
                ${tags.map(t => `<span class="repo-tag">${esc(t)}</span>`).join('')}
            </div>
            <div class="flex gap-2 mt-4">
                <a href="#" onclick="event.preventDefault(); viewProject(${p.id})" class="btn btn-primary">
                    <i class="fas fa-user-plus mr-1"></i> Connect
                </a>
                <a href="#" onclick="event.preventDefault(); viewProject(${p.id})" class="btn btn-secondary">
                    <i class="fas fa-folder-open mr-1"></i> View Project
                </a>
            </div>
            <div class="mt-4 flex items-center gap-3 text-sm text-gh-muted border-t pt-3 border-gh-border">
                <i class="fas fa-user"></i>
                <span>@${esc(p.username || 'unknown')}</span>
                <i class="fas fa-star"></i>
                <span>${p.starCount || 0}</span>
            </div>
        </div>`;
    }).join('');
}

// ============================================
// Init
// ============================================

async function initApp() {
    await fetchCurrentUser();
    updateAuthUI();
    await loadCategories();
    populateCategorySelects();

    if (currentUser) {
        switchToDashboard();
        setTabActive('community');
    } else {
        switchToLanding();
    }

    await fetchProjects();
    setupSearchAndFilter();
    setupFileDrop();
    document.getElementById('project-description')?.addEventListener('input', updateDescCount);

    // Close user dropdown on outside click
    document.addEventListener('click', e => { if (!e.target.closest('#user-menu')) closeUserMenu(); });

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); });
    });

    // ESC key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
            closeUserMenu();
        }
    });

    // Home link resets everything
    document.getElementById('home-link')?.addEventListener('click', e => {
        e.preventDefault();
        viewingAuthor = null;
        syncSearchInputs('');
        resetCategoryFilters('');
        if (currentUser) {
            setTabActive('community');
        } else {
            renderProjects(allProjects);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

document.addEventListener('DOMContentLoaded', initApp);
