// Firebase imports
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";

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

// DOM Elements
const dbKeyInput = document.getElementById('dbKey');
const dropdownHeader = document.getElementById('dropdownHeader');
const dropdownMenu = document.getElementById('dropdownMenu');
const addSectionsBtn = document.getElementById('addSectionsBtn');
const sectionsContainer = document.getElementById('sectionsContainer');
const saveToDatabaseBtn = document.getElementById('saveToDatabaseBtn');
const loadPageBtn = document.getElementById('loadPageBtn');

// Store active sections
let activeSections = [];

// Toggle dropdown
dropdownHeader.addEventListener('click', () => {
    dropdownMenu.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!dropdownHeader.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove('show');
    }
});

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add sections based on selected checkboxes
addSectionsBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.section-checkbox:checked');
    
    if (checkboxes.length === 0) {
        showToast('Please select at least one section to add', 'error');
        return;
    }
    
    const sectionsToAdd = Array.from(checkboxes).map(cb => cb.value);
    
    // Add new sections without duplicating
    sectionsToAdd.forEach(section => {
        if (!activeSections.includes(section)) {
            activeSections.push(section);
            addSectionToContainer(section);
        }
    });
    
    // Uncheck all checkboxes after adding
    checkboxes.forEach(cb => cb.checked = false);
    
    showToast(`Added ${sectionsToAdd.length} section(s) successfully`);
});

// Add section to container
function addSectionToContainer(sectionType) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'code-section';
    sectionDiv.dataset.section = sectionType;
    
    let icon, title, placeholder;
    
    switch(sectionType) {
        case 'html':
            icon = '<i class="fab fa-html5"></i>';
            title = 'HTML Code';
            placeholder = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
</head>
<body>
    <header>
        <h1>Welcome to My Website</h1>
    </header>
    <main>
        <p>This is your HTML structure.</p>
    </main>
</body>
</html>`;
            break;
        case 'css':
            icon = '<i class="fab fa-css3-alt"></i>';
            title = 'CSS Code';
            placeholder = `/* Your CSS Styles */
body {
    font-family: 'Arial', sans-serif;
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

header {
    background: rgba(255,255,255,0.9);
    padding: 20px;
    text-align: center;
}`;
            break;
        case 'javascript':
            icon = '<i class="fab fa-js"></i>';
            title = 'JavaScript Code';
            placeholder = `// Your JavaScript Code
document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully!');
    
    // Add your interactive features here
    const header = document.querySelector('header');
    if (header) {
        header.addEventListener('click', () => {
            alert('Header clicked!');
        });
    }
    
    // Example: Dynamic content
    const main = document.querySelector('main');
    if (main) {
        const button = document.createElement('button');
        button.textContent = 'Click Me';
        button.style.padding = '10px 20px';
        button.style.fontSize = '16px';
        button.style.cursor = 'pointer';
        button.onclick = () => alert('Button clicked!');
        main.appendChild(button);
    }
});`;
            break;
    }
    
    sectionDiv.innerHTML = `
        <div class="section-header ${sectionType}-header">
            ${icon}
            <h3>${title}</h3>
            <button class="remove-section" data-section="${sectionType}" style="margin-left: auto; background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem;">
                <i class="fas fa-times-circle"></i>
            </button>
        </div>
        <textarea class="code-textarea" id="${sectionType}Editor" placeholder="${placeholder.replace(/"/g, '&quot;')}"></textarea>
    `;
    
    sectionsContainer.appendChild(sectionDiv);
    
    // Add remove functionality
    const removeBtn = sectionDiv.querySelector('.remove-section');
    removeBtn.addEventListener('click', () => {
        sectionDiv.remove();
        activeSections = activeSections.filter(s => s !== sectionType);
        showToast(`Removed ${sectionType.toUpperCase()} section`);
    });
}

// Save to database
saveToDatabaseBtn.addEventListener('click', async () => {
    const dbKey = dbKeyInput.value.trim();
    
    if (!dbKey) {
        showToast('Please enter a database unique key', 'error');
        return;
    }
    
    // Validate database key format
    if (!/^[a-zA-Z0-9_-]+$/.test(dbKey)) {
        showToast('Database key can only contain letters, numbers, underscores, and hyphens', 'error');
        return;
    }
    
    // Check if key already exists
    const dbRef = ref(db, `websites/${dbKey}`);
    const snapshot = await get(dbRef);
    
    if (snapshot.exists()) {
        const confirm = window.confirm(`Database key "${dbKey}" already exists. Do you want to overwrite it?`);
        if (!confirm) return;
    }
    
    // Collect all code sections
    const sectionsData = {};
    activeSections.forEach(section => {
        const editor = document.getElementById(`${section}Editor`);
        if (editor) {
            sectionsData[section] = editor.value;
        }
    });
    
    if (Object.keys(sectionsData).length === 0) {
        showToast('No code sections to save', 'error');
        return;
    }
    
    // Add metadata
    const websiteData = {
        ...sectionsData,
        structure: activeSections,
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
    };
    
    try {
        await set(ref(db, `websites/${dbKey}`), websiteData);
        showToast(`✅ Website "${dbKey}" saved successfully!`);
        
        // Clear form
        dbKeyInput.value = '';
        sectionsContainer.innerHTML = '';
        activeSections = [];
        
    } catch (error) {
        console.error('Save error:', error);
        showToast(`Error saving: ${error.message}`, 'error');
    }
});

// Navigate to load page
loadPageBtn.addEventListener('click', () => {
    window.location.href = 'Load_Save_Pages.html';
});

console.log('✅ Builder page ready');