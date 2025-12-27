/**
 * GPTRapid - Lightweight ChatGPT Client
 * A high-performance vanilla JavaScript alternative to ChatGPT's web app
 */

// ================================================
// State Management
// ================================================
const state = {
    conversations: [],
    currentConversationId: null,
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    systemPrompt: '',
    isStreaming: false
};

// ================================================
// DOM Elements
// ================================================
const elements = {
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    newChatBtn: document.getElementById('newChatBtn'),
    searchInput: document.getElementById('searchInput'),
    conversationsList: document.getElementById('conversationsList'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    menuToggle: document.getElementById('menuToggle'),
    
    // Main Chat
    modelSelect: document.getElementById('modelSelect'),
    messagesContainer: document.getElementById('messagesContainer'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    messages: document.getElementById('messages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    
    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    settingsBtn: document.getElementById('settingsBtn'),
    closeSettings: document.getElementById('closeSettings'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    toggleKeyVisibility: document.getElementById('toggleKeyVisibility'),
    systemPromptInput: document.getElementById('systemPromptInput'),
    temperatureInput: document.getElementById('temperatureInput'),
    temperatureValue: document.getElementById('temperatureValue'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    exportBtn: document.getElementById('exportBtn'),
    clearDataBtn: document.getElementById('clearDataBtn')
};

// ================================================
// Initialization
// ================================================
function init() {
    loadState();
    setupEventListeners();
    renderConversationsList();
    
    if (state.currentConversationId) {
        loadConversation(state.currentConversationId);
    }
    
    // Auto-resize textarea
    elements.messageInput.addEventListener('input', autoResizeTextarea);
}

function loadState() {
    // Load from localStorage
    const savedState = localStorage.getItem('gptrapid_state');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        Object.assign(state, parsed);
    }
    
    // Apply loaded state to UI
    elements.modelSelect.value = state.model;
    elements.apiKeyInput.value = state.apiKey;
    elements.systemPromptInput.value = state.systemPrompt;
    elements.temperatureInput.value = state.temperature;
    elements.temperatureValue.textContent = state.temperature;
}

function saveState() {
    localStorage.setItem('gptrapid_state', JSON.stringify({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        apiKey: state.apiKey,
        model: state.model,
        temperature: state.temperature,
        systemPrompt: state.systemPrompt
    }));
}

// ================================================
// Event Listeners
// ================================================
function setupEventListeners() {
    // New Chat
    elements.newChatBtn.addEventListener('click', createNewConversation);
    
    // Send Message
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keydown', handleInputKeydown);
    elements.messageInput.addEventListener('input', updateSendButton);
    
    // Model Selection
    elements.modelSelect.addEventListener('change', (e) => {
        state.model = e.target.value;
        saveState();
    });
    
    // Settings Modal
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.closeSettings.addEventListener('click', closeSettings);
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) closeSettings();
    });
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    
    // API Key Visibility Toggle
    elements.toggleKeyVisibility.addEventListener('click', () => {
        const type = elements.apiKeyInput.type === 'password' ? 'text' : 'password';
        elements.apiKeyInput.type = type;
    });
    
    // Temperature Slider
    elements.temperatureInput.addEventListener('input', (e) => {
        elements.temperatureValue.textContent = e.target.value;
    });
    
    // Import/Export
    elements.importBtn.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', handleImport);
    elements.exportBtn.addEventListener('click', exportConversations);
    elements.clearDataBtn.addEventListener('click', clearAllData);
    
    // Search
    elements.searchInput.addEventListener('input', handleSearch);
    
    // Mobile Menu
    elements.menuToggle.addEventListener('click', toggleSidebar);
    
    // Quick Actions
    document.querySelectorAll('.quick-action').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.messageInput.value = btn.dataset.prompt;
            updateSendButton();
            elements.messageInput.focus();
        });
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.settingsModal.classList.contains('active')) {
            closeSettings();
        }
    });
}

function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function updateSendButton() {
    elements.sendBtn.disabled = !elements.messageInput.value.trim() || state.isStreaming;
}

function autoResizeTextarea() {
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 200) + 'px';
}

// ================================================
// Conversation Management
// ================================================
function createNewConversation() {
    const conversation = {
        id: generateId(),
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    state.conversations.unshift(conversation);
    state.currentConversationId = conversation.id;
    saveState();
    
    renderConversationsList();
    renderMessages();
    elements.welcomeScreen.classList.remove('hidden');
    elements.messageInput.focus();
    
    closeSidebar();
}

function loadConversation(id) {
    state.currentConversationId = id;
    saveState();
    renderConversationsList();
    renderMessages();
    
    const conversation = getCurrentConversation();
    if (conversation && conversation.messages.length > 0) {
        elements.welcomeScreen.classList.add('hidden');
    } else {
        elements.welcomeScreen.classList.remove('hidden');
    }
    
    closeSidebar();
}

function deleteConversation(id, e) {
    e.stopPropagation();
    
    state.conversations = state.conversations.filter(c => c.id !== id);
    
    if (state.currentConversationId === id) {
        state.currentConversationId = state.conversations[0]?.id || null;
    }
    
    saveState();
    renderConversationsList();
    
    if (state.currentConversationId) {
        loadConversation(state.currentConversationId);
    } else {
        elements.messages.innerHTML = '';
        elements.welcomeScreen.classList.remove('hidden');
    }
}

function getCurrentConversation() {
    return state.conversations.find(c => c.id === state.currentConversationId);
}

function updateConversationTitle(conversation) {
    if (conversation.messages.length === 1) {
        const firstMessage = conversation.messages[0].content;
        conversation.title = firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : '');
        saveState();
        renderConversationsList();
    }
}

// ================================================
// Rendering
// ================================================
function renderConversationsList(filter = '') {
    const filtered = state.conversations.filter(c => 
        c.title.toLowerCase().includes(filter.toLowerCase()) ||
        c.messages.some(m => m.content.toLowerCase().includes(filter.toLowerCase()))
    );
    
    if (filtered.length === 0) {
        elements.conversationsList.innerHTML = `
            <div class="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p>${filter ? 'No matching conversations' : 'No conversations yet'}</p>
            </div>
        `;
        return;
    }
    
    elements.conversationsList.innerHTML = filtered.map(conv => `
        <div class="conversation-item ${conv.id === state.currentConversationId ? 'active' : ''}" 
             data-id="${conv.id}">
            <svg class="conv-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="conv-title">${escapeHtml(conv.title)}</span>
            <button class="delete-btn" data-id="${conv.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        </div>
    `).join('');
    
    // Add click listeners
    elements.conversationsList.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => loadConversation(item.dataset.id));
    });
    
    elements.conversationsList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteConversation(btn.dataset.id, e));
    });
}

function renderMessages() {
    const conversation = getCurrentConversation();
    
    if (!conversation || conversation.messages.length === 0) {
        elements.messages.innerHTML = '';
        return;
    }
    
    elements.messages.innerHTML = conversation.messages.map(msg => `
        <div class="message ${msg.role}">
            <div class="message-avatar">
                ${msg.role === 'user' ? 'U' : 'AI'}
            </div>
            <div class="message-content">
                ${formatMessage(msg.content)}
            </div>
        </div>
    `).join('');
    
    // Add copy button listeners
    elements.messages.querySelectorAll('.copy-code-btn').forEach(btn => {
        btn.addEventListener('click', () => copyCode(btn));
    });
    
    scrollToBottom();
}

function addMessageToUI(role, content, isStreaming = false) {
    elements.welcomeScreen.classList.add('hidden');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = `
        <div class="message-avatar">${role === 'user' ? 'U' : 'AI'}</div>
        <div class="message-content">
            ${isStreaming ? '<div class="typing-indicator"><span></span><span></span><span></span></div>' : formatMessage(content)}
        </div>
    `;
    
    elements.messages.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

function updateStreamingMessage(messageDiv, content) {
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.innerHTML = formatMessage(content);
    
    // Add copy listeners to new code blocks
    contentDiv.querySelectorAll('.copy-code-btn').forEach(btn => {
        btn.addEventListener('click', () => copyCode(btn));
    });
    
    scrollToBottom();
}

function formatMessage(content) {
    // Convert markdown-like formatting
    let formatted = escapeHtml(content);
    
    // Code blocks with language
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><button class="copy-code-btn">Copy</button><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`;
    });
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Wrap in paragraph
    return `<p>${formatted}</p>`;
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// ================================================
// API Communication
// ================================================
async function sendMessage() {
    const content = elements.messageInput.value.trim();
    if (!content || state.isStreaming) return;
    
    if (!state.apiKey) {
        showToast('Please add your API key in Settings', 'error');
        openSettings();
        return;
    }
    
    // Create conversation if needed
    if (!state.currentConversationId) {
        createNewConversation();
    }
    
    const conversation = getCurrentConversation();
    
    // Add user message
    conversation.messages.push({ role: 'user', content });
    updateConversationTitle(conversation);
    
    // Clear input
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    updateSendButton();
    
    // Render user message
    addMessageToUI('user', content);
    
    // Add streaming assistant message
    const assistantDiv = addMessageToUI('assistant', '', true);
    
    state.isStreaming = true;
    updateSendButton();
    
    try {
        const messages = [];
        
        // Add system prompt if set
        if (state.systemPrompt) {
            messages.push({ role: 'system', content: state.systemPrompt });
        }
        
        // Add conversation history
        messages.push(...conversation.messages);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                model: state.model,
                messages,
                temperature: parseFloat(state.temperature),
                stream: true
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }
        
        // Stream the response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const delta = data.choices[0]?.delta?.content;
                        if (delta) {
                            assistantContent += delta;
                            updateStreamingMessage(assistantDiv, assistantContent);
                        }
                    } catch (e) {
                        // Skip malformed JSON
                    }
                }
            }
        }
        
        // Save assistant message
        conversation.messages.push({ role: 'assistant', content: assistantContent });
        conversation.updatedAt = Date.now();
        saveState();
        
    } catch (error) {
        console.error('API Error:', error);
        updateStreamingMessage(assistantDiv, `Error: ${error.message}`);
        showToast(error.message, 'error');
    } finally {
        state.isStreaming = false;
        updateSendButton();
    }
}

// ================================================
// Settings
// ================================================
function openSettings() {
    elements.settingsModal.classList.add('active');
    elements.apiKeyInput.value = state.apiKey;
    elements.systemPromptInput.value = state.systemPrompt;
    elements.temperatureInput.value = state.temperature;
    elements.temperatureValue.textContent = state.temperature;
}

function closeSettings() {
    elements.settingsModal.classList.remove('active');
}

function saveSettings() {
    state.apiKey = elements.apiKeyInput.value.trim();
    state.systemPrompt = elements.systemPromptInput.value.trim();
    state.temperature = parseFloat(elements.temperatureInput.value);
    
    saveState();
    closeSettings();
    showToast('Settings saved successfully', 'success');
}

// ================================================
// Import/Export
// ================================================
function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Handle ChatGPT export format
            if (Array.isArray(data)) {
                const imported = data.map(conv => ({
                    id: generateId(),
                    title: conv.title || 'Imported Chat',
                    messages: (conv.mapping ? 
                        Object.values(conv.mapping)
                            .filter(m => m.message?.content?.parts)
                            .map(m => ({
                                role: m.message.author.role === 'user' ? 'user' : 'assistant',
                                content: m.message.content.parts.join('')
                            })) :
                        conv.messages || []
                    ),
                    createdAt: conv.create_time ? conv.create_time * 1000 : Date.now(),
                    updatedAt: Date.now()
                }));
                
                state.conversations = [...imported, ...state.conversations];
                saveState();
                renderConversationsList();
                showToast(`Imported ${imported.length} conversations`, 'success');
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast('Failed to import conversations', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function exportConversations() {
    const data = JSON.stringify(state.conversations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `gptrapid-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('Conversations exported', 'success');
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.removeItem('gptrapid_state');
        location.reload();
    }
}

// ================================================
// Search
// ================================================
function handleSearch(e) {
    renderConversationsList(e.target.value);
}

// ================================================
// Mobile
// ================================================
function toggleSidebar() {
    elements.sidebar.classList.toggle('open');
}

function closeSidebar() {
    elements.sidebar.classList.remove('open');
}

// ================================================
// Utilities
// ================================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyCode(btn) {
    const code = btn.nextElementSibling.textContent;
    navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
        }, 2000);
    });
}

function showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================================================
// Initialize
// ================================================
document.addEventListener('DOMContentLoaded', init);
