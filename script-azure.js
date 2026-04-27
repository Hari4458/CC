const API_URL = window.location.origin + '/api';
let files = [];
let currentUser = null;
let authToken = null;
let selectedNote = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    loadTheme();
    setupFileInputListener();
    displayFiles();
});

/* Authentication */
function checkAuth() {
    authToken = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');

    if (!authToken) {
        window.location.href = 'auth.html';
        return;
    }

    currentUser = { userId, username };
    updateUserDisplay();
}

function updateUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        userDisplay.textContent = `👤 ${currentUser.username}`;
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    window.location.href = 'auth.html';
}

/* File Input Listener - Robust Implementation */
function setupFileInputListener() {
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');


    // Update display when file is selected
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            fileNameDisplay.textContent = `✓ ${fileName}`;
            fileNameDisplay.style.color = 'var(--primary)';
        } else {
            fileNameDisplay.textContent = 'No file selected';
            fileNameDisplay.style.color = 'var(--subtext)';
        }
    });

    // Listen for input events too (some browsers)
    fileInput.addEventListener('input', (e) => {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            fileNameDisplay.textContent = `✓ ${fileName}`;
            fileNameDisplay.style.color = 'var(--primary)';
        }
    });

    // Set initial state
    fileNameDisplay.textContent = 'No file selected';
    fileNameDisplay.style.color = 'var(--subtext)';
}

/* Theme */
function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark'));
}

function loadTheme() {
    if (localStorage.getItem('theme') === 'true') {
        document.body.classList.add('dark');
    }
}

/* Upload */
async function uploadFile() {
    const subject = document.getElementById('subject').value.trim();
    const filename = document.getElementById('filename').value.trim();
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');
    const file = fileInput.files[0];

    if (!subject || !filename || !file) {
        alert('❌ Please fill all fields and select a file');
        return;
    }

    // Show uploading state
    const uploadBtn = document.querySelector('.upload-btn');
    const originalText = uploadBtn.textContent;
    uploadBtn.textContent = '⏳ Uploading...';
    uploadBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('subject', subject);
        formData.append('filename', filename);
        formData.append('file', file);

        const response = await fetch(`${API_URL}/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || `Upload failed with status ${response.status}`);

        // Success: Clear form and reset UI
        document.getElementById('subject').value = '';
        document.getElementById('filename').value = '';
        fileInput.value = '';
        fileNameDisplay.textContent = 'No file selected';
        fileNameDisplay.style.color = 'var(--subtext)';

        // Show success message
        alert(`✓ File "${filename}" uploaded to ${subject}!`);

        // Refresh the file list to show new file
        await displayFiles();

    } catch (error) {
        console.error('Upload error details:', error);
        alert('❌ Upload failed: ' + error.message);
    } finally {
        // Restore button state
        uploadBtn.textContent = originalText;
        uploadBtn.disabled = false;
    }
}

/* Display */
async function displayFiles() {
    const container = document.getElementById('folders');

    try {

        const response = await fetch(`${API_URL}/files`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch files');
        }

        files = await response.json();
        const grouped = {};

        files.forEach(f => {
            if (!grouped[f.subject]) grouped[f.subject] = [];
            grouped[f.subject].push(f);
        });

        container.innerHTML = '';

        // Sort subjects alphabetically
        const subjects = Object.keys(grouped).sort();

        if (subjects.length === 0) {
            container.innerHTML = '<p style="text-align:center; color: var(--subtext); padding: 30px;">📂 No files yet. Upload one to get started!</p>';
            return;
        }

        subjects.forEach((subject, index) => {
            const folder = document.createElement('div');
            folder.className = 'folder';
            folder.setAttribute('data-subject', subject);
            folder.setAttribute('data-expanded', 'false');

            /* Folder Header */
            const header = document.createElement('div');
            header.className = 'folder-header';
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.cursor = 'pointer';
            header.style.padding = '8px';
            header.style.marginBottom = '8px';
            header.style.borderRadius = '8px';
            header.style.transition = 'all 0.2s ease';

            const titleDiv = document.createElement('div');
            titleDiv.style.display = 'flex';
            titleDiv.style.alignItems = 'center';
            titleDiv.style.flex = '1';
            titleDiv.style.cursor = 'pointer';

            const fileCount = grouped[subject].length;
            titleDiv.innerHTML = `
                <span class="folder-toggle" style="font-size: 18px; margin-right: 8px; transition: transform 0.2s ease; display: inline-block; transform: rotate(-90deg);">▼</span>
                <h3 style="margin: 0; flex: 1;">📁 ${escapeHtml(subject)}</h3>
                <span style="font-size: 12px; background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px;">${fileCount}</span>
            `;

            // Toggle expand/collapse on title click
            titleDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFolder(folder);
            });

            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.display = 'flex';
            buttonsDiv.style.gap = '6px';
            buttonsDiv.style.alignItems = 'center';

            // Open Subject button
            const openBtn = document.createElement('button');
            openBtn.className = 'folder-btn open-btn';
            openBtn.textContent = '👁️ View';
            openBtn.title = 'View only this subject';
            openBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                filterBySubject(subject);
            });

            // Menu button
            const menuBtn = document.createElement('span');
            menuBtn.className = 'menu-btn';
            menuBtn.textContent = '⋮';
            menuBtn.style.cursor = 'pointer';
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openFolderMenu(e, subject);
            });

            buttonsDiv.appendChild(openBtn);
            buttonsDiv.appendChild(menuBtn);
            header.appendChild(titleDiv);
            header.appendChild(buttonsDiv);

            folder.appendChild(header);

            /* Files Container */
            const filesContainer = document.createElement('div');
            filesContainer.className = 'files-container';
            filesContainer.style.paddingLeft = '24px';
            filesContainer.style.display = 'none';  /* Hidden by default */

            grouped[subject].forEach(file => {
                const div = document.createElement('div');
                div.className = 'file';

                const fileSize = file.fileSize > 1024
                    ? (file.fileSize / 1024).toFixed(2) + ' KB'
                    : file.fileSize + ' B';

                const isOwner = file.uploadedBy === currentUser.username;
                const ownerBadge = isOwner ? '<span style="font-size: 11px; background: #667eea; color: white; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">YOU</span>' : '';

                div.innerHTML = `
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center;">
                            <strong>${escapeHtml(file.filename)}</strong>
                            ${ownerBadge}
                        </div>
                        <span style="font-size: 0.85em; color: var(--subtext);">📤 ${file.uploadedBy} • ${fileSize}</span>
                    </div>
                    <span class="menu-btn" onclick="openFileMenu(event, '${file.id}', '${file.uploadedBy}')" style="flex-shrink: 0;">⋮</span>
                `;

                filesContainer.appendChild(div);
            });

            folder.appendChild(filesContainer);
            container.appendChild(folder);
        });

    } catch (error) {
        console.error('Display error:', error);
        container.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">❌ Failed to load files</p>';
    }
}

/* Toggle Folder Expand/Collapse */
function toggleFolder(folderElement) {
    const isExpanded = folderElement.getAttribute('data-expanded') === 'true';
    const filesContainer = folderElement.querySelector('.files-container');
    const toggle = folderElement.querySelector('.folder-toggle');
    const header = folderElement.querySelector('.folder-header');

    if (isExpanded) {
        filesContainer.style.display = 'none';
        toggle.style.transform = 'rotate(-90deg)';
        folderElement.setAttribute('data-expanded', 'false');
        header.style.backgroundColor = 'var(--border)';
    } else {
        filesContainer.style.display = 'block';
        toggle.style.transform = 'rotate(0deg)';
        folderElement.setAttribute('data-expanded', 'true');
        header.style.backgroundColor = 'transparent';
    }
}

/* Filter by Subject - Show only specific subject */
function filterBySubject(subject) {
    const allFolders = document.querySelectorAll('[data-subject]');
    let targetFolder = null;

    allFolders.forEach(folder => {
        if (folder.getAttribute('data-subject') === subject) {
            folder.style.display = 'block';
            // Ensure it's expanded
            if (folder.getAttribute('data-expanded') === 'false') {
                toggleFolder(folder);
            }
            targetFolder = folder;
        } else {
            folder.style.display = 'none';
        }
    });

    if (targetFolder) {
        // Add "Back" button
        const container = document.getElementById('folders');
        let backBtn = container.querySelector('.back-btn-container');
        if (!backBtn) {
            backBtn = document.createElement('div');
            backBtn.className = 'back-btn-container';
            backBtn.style.marginBottom = '20px';
            backBtn.innerHTML = `
                <button class="back-btn" onclick="displayFiles()">
                    ← Back to All Subjects
                </button>
            `;
            container.insertBefore(backBtn, container.firstChild);
        }

        // Scroll to target
        targetFolder.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/* Helper: Escape HTML */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ---------- MENUS ---------- */

/* File Menu */
function openFileMenu(e, fileId, uploadedBy) {
    e.stopPropagation();

    const menu = document.getElementById('menu');
    const isOwner = uploadedBy === currentUser.username;

    let menuHTML = `
        <button onclick="viewFile('${fileId}')">👁️ View</button>
        <button onclick="downloadFile('${fileId}')">⬇️ Download</button>
        <button onclick="selectNoteForAi('${fileId}')">✨ Select for AI</button>
    `;

    if (isOwner) {
        menuHTML += `
            <button onclick="renameFile('${fileId}')">✏️ Rename</button>
            <button onclick="deleteFile('${fileId}')" style="color: #ff6b6b;">🗑️ Delete</button>
        `;
    }

    menu.innerHTML = menuHTML;
    positionMenu(e);
}

/* Folder Menu */
function openFolderMenu(e, subject) {
    e.stopPropagation();

    const menu = document.getElementById('menu');

    menu.innerHTML = `
    <button onclick="deleteFolderSubject('${escapeHtml(subject)}')">Delete All</button>
  `;

    positionMenu(e);
}

/* Position menu */
function positionMenu(e) {
    const menu = document.getElementById('menu');
    menu.style.top = e.clientY + 'px';
    menu.style.left = e.clientX + 'px';
    menu.style.display = 'block';
}

/* Close menu */
document.addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
});

/* ---------- ACTIONS ---------- */

function viewFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // Open viewer page in popup with file ID and filename
    const viewerUrl = `viewer.html?id=${fileId}&filename=${encodeURIComponent(file.filename)}`;
    const width = 900;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(viewerUrl, 'fileViewer', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
}

function downloadFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (file) {
        // Create hidden link and click it
        const a = document.createElement('a');
        a.href = `${API_URL}/files/${fileId}/download`;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

async function deleteFile(fileId) {
    if (!confirm('Delete this file?')) return;

    try {
        const response = await fetch(`${API_URL}/files/${fileId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Delete failed');

        alert('✓ File deleted');
        displayFiles();
    } catch (error) {
        alert('❌ Delete failed: ' + error.message);
        console.error('Delete error:', error);
    }
}

async function renameFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const newName = prompt('New filename:', file.filename);
    if (!newName) return;

    try {
        const response = await fetch(`${API_URL}/files/${fileId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: newName })
        });

        if (!response.ok) throw new Error('Rename failed');

        alert('✓ File renamed');
        displayFiles();
    } catch (error) {
        alert('❌ Rename failed: ' + error.message);
        console.error('Rename error:', error);
    }
}

async function deleteFolderSubject(subject) {
    if (!confirm(`Delete all files in "${subject}"?`)) return;

    try {
        const subjectFiles = files.filter(f => f.subject === subject);

        for (const file of subjectFiles) {
            await fetch(`${API_URL}/files/${file.id}`, { method: 'DELETE' });
        }

        alert('✓ Folder deleted');
        displayFiles();
    } catch (error) {
        alert('❌ Delete failed: ' + error.message);
        console.error('Folder delete error:', error);
    }
}
/* ---------- AI ASSISTANT ---------- */

function selectNoteForAi(fileId) {
    selectedNote = files.find(f => f.id === fileId);
    if (!selectedNote) return;
    
    document.getElementById('aiStatus').textContent = `Focusing on: ${selectedNote.filename}`;
    alert(`✨ AI Assistant is now focusing on "${selectedNote.filename}"`);
    
    // Switch to Chat tab automatically
    switchAiTab('chat');
}

function switchAiTab(tab) {
    // Update tabs
    document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
    const clickedTab = document.querySelector(`.ai-tab[onclick*="${tab}"]`);
    if (clickedTab) clickedTab.classList.add('active');
    
    // Update content
    document.querySelectorAll('.ai-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`ai${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
}

async function sendAiChat() {
    const input = document.getElementById('aiInput');
    const question = input.value.trim();
    if (!question) return;
    
    const chatMessages = document.getElementById('chatMessages');
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.textContent = question;
    chatMessages.appendChild(userMsg);
    input.value = '';
    
    // Thinking message
    const thinkingMsg = document.createElement('div');
    thinkingMsg.className = 'message ai';
    thinkingMsg.textContent = '...';
    chatMessages.appendChild(thinkingMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const context = selectedNote ? `Selected Note: ${selectedNote.filename} (Subject: ${selectedNote.subject})` : "General study assistance";
        const response = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ text: context, question })
        });
        
        const data = await response.json();
        thinkingMsg.textContent = data.answer || data.error || 'No response from AI';
    } catch (error) {
        thinkingMsg.textContent = '❌ Error connecting to AI service.';
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function summarizeCurrentNote() {
    if (!selectedNote) return alert('❌ Please select a note first from the "⋮" menu!');
    
    const resultDiv = document.getElementById('summaryResult');
    resultDiv.textContent = '⏳ Summarizing your notes...';
    
    try {
        const response = await fetch(`${API_URL}/ai/summarize`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ text: `Note Content Summary Request for: ${selectedNote.filename} (${selectedNote.subject})` })
        });
        
        const data = await response.json();
        resultDiv.textContent = data.summary || data.error || 'Failed to generate summary';
    } catch (error) {
        resultDiv.textContent = '❌ Error connecting to AI service.';
    }
}

async function generateQuiz() {
    if (!selectedNote) return alert('❌ Please select a note first!');
    
    const resultDiv = document.getElementById('quizResult');
    resultDiv.textContent = '⏳ Generating quiz questions...';
    
    try {
        const response = await fetch(`${API_URL}/ai/quiz`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ text: `Generate quiz for: ${selectedNote.filename} (${selectedNote.subject})` })
        });
        
        const data = await response.json();
        resultDiv.textContent = data.quiz || data.error || 'Failed to generate quiz';
    } catch (error) {
        resultDiv.textContent = '❌ Error connecting to AI service.';
    }
}

// Add enter key listener for chat
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement.id === 'aiInput') {
        sendAiChat();
    }
});
