// Firebase imports
import { initializeApp } from "firebase/app";

import { getDatabase, ref, onValue, get, update, remove } 
from "firebase/database";
// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBrwioR6w9GHIxVnHWriyYB4BaJbXZ8xlU",
    authDomain: "codeae-85.firebaseapp.com",
    projectId: "codeae-85",
    storageBucket: "codeae-85.firebasestorage.app",
    messagingSenderId: "855701949624",
    appId: "1:855701949624:web:2cf2ea8802a2d372f3384d",
    measurementId: "G-LL3X996JHP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const websitesRef = ref(db, 'websites');

// DOM Elements
const searchInput = document.getElementById('searchInput');
const websitesListDiv = document.getElementById('websitesList');
const selectedInfoDiv = document.getElementById('selectedInfo');
const selectedKeySpan = document.getElementById('selectedKey');
const loadSelectedBtn = document.getElementById('loadSelectedBtn');
const previewFrame = document.getElementById('previewFrame');
const previewStatus = document.getElementById('previewStatus');
const backToBuilderBtn = document.getElementById('backToBuilderBtn');
const codeDisplaySection = document.getElementById('codeDisplaySection');
const dynamicTextareasDiv = document.getElementById('dynamicTextareas');
const totalCountSpan = document.getElementById('totalCount');
const displayCountSpan = document.getElementById('displayCount');
const paginationControls = document.getElementById('paginationControls');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageInfoSpan = document.getElementById('pageInfo');
const editSelectedBtn = document.getElementById('editSelectedBtn');
const refreshDatabaseBtn = document.getElementById('refreshDatabaseBtn');

// Configuration
const ITEMS_PER_PAGE = 8;
let allWebsites = [];
let filteredWebsites = [];
let currentPage = 1;
let selectedWebsite = null;
let currentWebsiteData = null;

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 250);
    }, 2800);
}

// Copy text to clipboard
async function copyToClipboard(text, btnElement) {
    try {
        await navigator.clipboard.writeText(text);
        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => { btnElement.innerHTML = originalHtml; }, 1800);
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        showToast('Failed to copy', 'error');
    }
}

// Escape HTML for safe display
function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Render current page of websites
function renderCurrentPage() {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageItems = filteredWebsites.slice(startIndex, endIndex);
    
    if (pageItems.length === 0 && filteredWebsites.length > 0) {
        currentPage = Math.max(1, Math.ceil(filteredWebsites.length / ITEMS_PER_PAGE));
        renderCurrentPage();
        return;
    }
    
    if (pageItems.length === 0) {
        websitesListDiv.innerHTML = `<div style="text-align: center; padding: 30px 20px; color: #94a3b8;">
            <i class="fas fa-database" style="font-size: 2rem; margin-bottom: 12px; display: block;"></i>
            <p>No websites found</p>
            <small>Try different search or create website in builder</small>
        </div>`;
        paginationControls.style.display = 'none';
        displayCountSpan.textContent = '0';
        return;
    }
    
    websitesListDiv.innerHTML = pageItems.map(website => `
        <div class="website-item" data-key="${website.key}">
            <div class="website-info">
                <div class="website-name">
                    <i class="fas fa-code-branch"></i> ${escapeHtml(website.key)}
                    <button class="delete-website-btn" data-key="${website.key}" onclick="event.stopPropagation();">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div class="website-structure">
                    ${website.structure.map(s => `<span class="structure-badge">${s.toUpperCase()}</span>`).join('')}
                    <span class="website-date"><i class="far fa-calendar-alt"></i> ${new Date(website.timestamp).toLocaleString()}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    displayCountSpan.textContent = filteredWebsites.length;
    totalCountSpan.textContent = allWebsites.length;
    
    const totalPages = Math.ceil(filteredWebsites.length / ITEMS_PER_PAGE);
    pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    paginationControls.style.display = filteredWebsites.length > ITEMS_PER_PAGE ? 'flex' : 'none';
    
    // Add click handlers for website items
    document.querySelectorAll('.website-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking on delete button
            if (e.target.closest('.delete-website-btn')) return;
            const key = item.getAttribute('data-key');
            selectWebsite(key);
        });
    });
    
    // Add click handlers for delete buttons
    document.querySelectorAll('.delete-website-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.getAttribute('data-key');
            deleteWebsite(key, e);
        });
    });
    
    if (selectedWebsite) {
        const isInCurrentPage = pageItems.some(w => w.key === selectedWebsite.key);
        if (!isInCurrentPage) {
            selectedInfoDiv.style.display = 'none';
            selectedWebsite = null;
        } else {
            document.querySelectorAll('.website-item').forEach(item => {
                if (item.getAttribute('data-key') === selectedWebsite.key) {
                    item.classList.add('selected');
                }
            });
        }
    }
}

// Apply search filter
function applySearchFilter() {
    const searchTerm = searchInput.value.toLowerCase();
    filteredWebsites = allWebsites.filter(website => 
        website.key.toLowerCase().includes(searchTerm)
    );
    currentPage = 1;
    renderCurrentPage();
}

// Select a website
function selectWebsite(key) {
    selectedWebsite = allWebsites.find(w => w.key === key);
    if (selectedWebsite) {
        selectedKeySpan.textContent = key;
        selectedInfoDiv.style.display = 'block';
        
        document.querySelectorAll('.website-item').forEach(item => {
            if (item.getAttribute('data-key') === key) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        codeDisplaySection.style.display = 'none';
    }
}

// Generate combined HTML for preview (combines all available parts)
function generateCombinedHtml(data) {
    let html = data.html || '';
    let css = data.css || '';
    let js = data.javascript || '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <style>${css}</style>
</head>
<body>
    ${html}
    <script>${js}
        console.log('Code Vault Website Loaded - ${selectedWebsite?.key || 'Website'}');
    <\/script>
</body>
</html>`;
}

// Create dynamic textareas based on what's actually stored in database
function createDynamicTextareas(data) {
    dynamicTextareasDiv.innerHTML = '';
    
    const sections = [];
    
    // Check what data exists in the database
    if (data.html !== undefined && data.html !== null && data.html !== '') {
        sections.push({ type: 'html', content: data.html, icon: 'fab fa-html5', color: '#e34c26', label: 'HTML' });
    }
    if (data.css !== undefined && data.css !== null && data.css !== '') {
        sections.push({ type: 'css', content: data.css, icon: 'fab fa-css3-alt', color: '#264de4', label: 'CSS' });
    }
    if (data.javascript !== undefined && data.javascript !== null && data.javascript !== '') {
        sections.push({ type: 'js', content: data.javascript, icon: 'fab fa-js', color: '#f7df1e', label: 'JavaScript' });
    }
    
    // If no specific sections found but there's a structure array, use that
    if (sections.length === 0 && data.structure) {
        if (data.structure.includes('html') && data.html) {
            sections.push({ type: 'html', content: data.html, icon: 'fab fa-html5', color: '#e34c26', label: 'HTML' });
        }
        if (data.structure.includes('css') && data.css) {
            sections.push({ type: 'css', content: data.css, icon: 'fab fa-css3-alt', color: '#264de4', label: 'CSS' });
        }
        if (data.structure.includes('javascript') && data.javascript) {
            sections.push({ type: 'js', content: data.javascript, icon: 'fab fa-js', color: '#f7df1e', label: 'JavaScript' });
        }
    }
    
    // If still no sections, show a message
    if (sections.length === 0) {
        dynamicTextareasDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8; background: white; border-radius: 12px;">
                <i class="fas fa-code" style="font-size: 2rem; margin-bottom: 12px;"></i>
                <p>No code content found for this website</p>
                <small>The website might be stored in a different format</small>
            </div>
        `;
        return;
    }
    
    // Create textarea for each section that exists
    sections.forEach(section => {
        const codeBlock = document.createElement('div');
        codeBlock.className = 'code-block';
        codeBlock.innerHTML = `
            <div class="code-header">
                <div class="code-title ${section.type}">
                    <i class="${section.icon}"></i>
                    <span>${section.label} Code</span>
                </div>
                <button class="copy-code-btn" data-type="${section.type}">
                    <i class="fas fa-copy"></i> Copy ${section.label}
                </button>
            </div>
            <textarea class="code-textarea" id="${section.type}Textarea" >${escapeHtml(section.content)}</textarea>
        `;
        
        dynamicTextareasDiv.appendChild(codeBlock);
        
        // Add copy functionality
        const copyBtn = codeBlock.querySelector('.copy-code-btn');
        const textarea = codeBlock.querySelector(`#${section.type}Textarea`);
        copyBtn.addEventListener('click', () => copyToClipboard(textarea.value, copyBtn));
    });
}

// Load and display website
async function loadWebsite() {
    if (!selectedWebsite) {
        showToast('Please select a website from the list', 'error');
        return;
    }
    
    previewStatus.textContent = 'Loading...';
    previewStatus.style.color = '#3b82f6';
    previewStatus.style.background = '#f1f5f9';
    
    try {
        const websiteRef = ref(db, `websites/${selectedWebsite.key}`);
        const snapshot = await get(websiteRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            currentWebsiteData = data;
            
            // Show code section
            codeDisplaySection.style.display = 'block';
            
            // Create dynamic textareas based on what's stored
            createDynamicTextareas(data);
            
            // Generate and display preview
            const fullHtml = generateCombinedHtml(data);
            previewFrame.srcdoc = fullHtml;
            previewStatus.textContent = `✓ ${selectedWebsite.key} (Live)`;
            previewStatus.style.color = '#10b981';
            previewStatus.style.background = '#d1fae5';
            
            showToast(`✅ "${selectedWebsite.key}" loaded successfully!`, 'success');
        } else {
            throw new Error('Website data not found');
        }
    } catch (error) {
        console.error('Load error:', error);
        previewStatus.textContent = 'Error loading';
        previewStatus.style.color = '#ef4444';
        previewStatus.style.background = '#fee2e2';
        showToast('Error loading website: ' + error.message, 'error');
        codeDisplaySection.style.display = 'none';
    }
}

// Pagination handlers
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderCurrentPage();
        document.querySelector('.websites-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredWebsites.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
        document.querySelector('.websites-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Fetch all websites from Firebase
function fetchWebsites() {
    websitesListDiv.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner"></i><p>Loading websites...</p></div>`;
    
    onValue(websitesRef, (snapshot) => {
        const websites = [];
        snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            websites.push({
                key: childSnapshot.key,
                structure: data.structure || [],
                timestamp: data.timestamp || Date.now(),
                createdAt: data.createdAt || new Date().toISOString(),
                hasHtml: !!data.html,
                hasCss: !!data.css,
                hasJs: !!data.javascript
            });
        });
        
        websites.sort((a, b) => b.timestamp - a.timestamp);
        allWebsites = websites;
        totalCountSpan.textContent = allWebsites.length;
        applySearchFilter();
        
        console.log(`✅ Loaded ${allWebsites.length} websites`);
    }, (error) => {
        console.error('Error fetching websites:', error);
        websitesListDiv.innerHTML = `<div style="text-align: center; padding: 40px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
            <p>Error loading websites</p>
            <small>${error.message}</small>
        </div>`;
        showToast('Error loading websites: ' + error.message, 'error');
    });
}

// Save edited changes to database
async function saveEditedChanges() {
    if (!selectedWebsite) {
        showToast('No website selected', 'error');
        return;
    }
    
    // Get updated values from textareas
    const htmlTextarea = document.getElementById('htmlTextarea');
    const cssTextarea = document.getElementById('cssTextarea');
    const jsTextarea = document.getElementById('jsTextarea');
    
    const updatedData = {
        timestamp: Date.now(),
        updatedAt: new Date().toISOString()
    };
    
    if (htmlTextarea) updatedData.html = htmlTextarea.value;
    if (cssTextarea) updatedData.css = cssTextarea.value;
    if (jsTextarea) updatedData.javascript = jsTextarea.value;
    
    // Preserve existing structure
    if (currentWebsiteData?.structure) {
        updatedData.structure = currentWebsiteData.structure;
    }
    if (currentWebsiteData?.createdAt) {
        updatedData.createdAt = currentWebsiteData.createdAt;
    }
    
    try {
        const websiteRef = ref(db, `websites/${selectedWebsite.key}`);
        await update(websiteRef, updatedData);
        
        // Update local data
        currentWebsiteData = { ...currentWebsiteData, ...updatedData };
        
        // Refresh preview
        const fullHtml = generateCombinedHtml(currentWebsiteData);
        previewFrame.srcdoc = fullHtml;
        
        showToast(`✅ Changes saved to "${selectedWebsite.key}"!`, 'success');
        
        // Refresh the list to show updated timestamp
        fetchWebsites();
        
    } catch (error) {
        console.error('Save error:', error);
        showToast('Error saving changes: ' + error.message, 'error');
    }
}

// Delete website from database
async function deleteWebsite(key, event) {
    // Stop event propagation to prevent triggering the select website action
    if (event) {
        event.stopPropagation();
    }
    
    // Confirm deletion
    const confirmDelete = confirm(`Are you sure you want to delete "${key}"? This action cannot be undone.`);
    
    if (!confirmDelete) return;
    
    try {
        const websiteRef = ref(db, `websites/${key}`);
        await remove(websiteRef);
        
        showToast(`✅ "${key}" has been deleted successfully!`, 'success');
        
        // Clear selection if the deleted website was selected
        if (selectedWebsite && selectedWebsite.key === key) {
            selectedInfoDiv.style.display = 'none';
            selectedWebsite = null;
            codeDisplaySection.style.display = 'none';
            previewStatus.textContent = 'No website loaded';
            previewStatus.style.background = '#f1f5f9';
            previewStatus.style.color = '#334155';
            previewFrame.srcdoc = '';
        }
        
        // Refresh the page after a short delay to show the toast
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Error deleting website: ' + error.message, 'error');
    }
}

// Refresh database - manually fetch fresh data
async function refreshDatabase() {
    // Add spinning animation to button
    if (refreshDatabaseBtn) {
        refreshDatabaseBtn.classList.add('refreshing');
    }
    
    // Show loading state in the websites list
    websitesListDiv.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner"></i><p>Refreshing database...</p></div>`;
    
    try {
        // Manually fetch fresh data from Firebase
        const snapshot = await get(websitesRef);
        const websites = [];
        snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            websites.push({
                key: childSnapshot.key,
                structure: data.structure || [],
                timestamp: data.timestamp || Date.now(),
                createdAt: data.createdAt || new Date().toISOString(),
                hasHtml: !!data.html,
                hasCss: !!data.css,
                hasJs: !!data.javascript
            });
        });
        
        websites.sort((a, b) => b.timestamp - a.timestamp);
        allWebsites = websites;
        totalCountSpan.textContent = allWebsites.length;
        applySearchFilter();
        
        // Clear selection if the selected website no longer exists
        if (selectedWebsite) {
            const stillExists = allWebsites.some(w => w.key === selectedWebsite.key);
            if (!stillExists) {
                selectedInfoDiv.style.display = 'none';
                selectedWebsite = null;
                codeDisplaySection.style.display = 'none';
                previewStatus.textContent = 'No website loaded';
                previewStatus.style.background = '#f1f5f9';
                previewFrame.srcdoc = '';
            }
        }
        
        showToast(`✅ Database refreshed! Loaded ${allWebsites.length} websites.`, 'success');
        
    } catch (error) {
        console.error('Refresh error:', error);
        showToast('Error refreshing database: ' + error.message, 'error');
    } finally {
        if (refreshDatabaseBtn) {
            setTimeout(() => {
                refreshDatabaseBtn.classList.remove('refreshing');
            }, 300);
        }
    }
}

// Event listeners
searchInput.addEventListener('input', () => applySearchFilter());
loadSelectedBtn.addEventListener('click', loadWebsite);
backToBuilderBtn.addEventListener('click', () => { window.location.href = 'Save_Pages.html'; });
prevPageBtn.addEventListener('click', prevPage);
nextPageBtn.addEventListener('click', nextPage);
if (editSelectedBtn) {
    editSelectedBtn.addEventListener('click', saveEditedChanges);
}

// Initial load
fetchWebsites();

console.log('✅ Loader ready - Dynamic textareas based on database structure');