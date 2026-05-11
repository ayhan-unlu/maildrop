// ============================================
// MailDrop — Frontend Application Logic
// ============================================

(function () {
  'use strict';

  // State
  let selectedFiles = [];
  let toastTimeout = null;

  // DOM Elements
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const dropZoneContent = document.getElementById('dropZoneContent');
  const fileList = document.getElementById('fileList');
  const fileItems = document.getElementById('fileItems');
  const fileCount = document.getElementById('fileCount');
  const clearFiles = document.getElementById('clearFiles');
  const addMoreBtn = document.getElementById('addMoreBtn');
  const subjectInput = document.getElementById('subjectInput');
  const sendBtn = document.getElementById('sendBtn');
  const sendBtnContent = document.getElementById('sendBtnContent');
  const sendBtnLoading = document.getElementById('sendBtnLoading');
  const statusBadge = document.getElementById('statusBadge');
  const historyCard = document.getElementById('historyCard');
  const historyItems = document.getElementById('historyItems');
  const clearHistory = document.getElementById('clearHistory');
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toastIcon');
  const toastMessage = document.getElementById('toastMessage');

  // ============================================
  // Init
  // ============================================
  async function init() {
    checkServerStatus();
    loadHistory();
    bindEvents();
    registerServiceWorker();
  }

  // ============================================
  // Server Health Check
  // ============================================
  async function checkServerStatus() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.configured) {
        statusBadge.className = 'status-badge connected';
        statusBadge.querySelector('.status-text').textContent = 'Ready';
      } else {
        statusBadge.className = 'status-badge error';
        statusBadge.querySelector('.status-text').textContent = 'Not configured';
      }
    } catch {
      statusBadge.className = 'status-badge error';
      statusBadge.querySelector('.status-text').textContent = 'Offline';
    }
  }

  // ============================================
  // Event Binding
  // ============================================
  function bindEvents() {
    // File picker
    dropZone.addEventListener('click', () => fileInput.click());
    addMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
    fileInput.addEventListener('change', handleFileSelect);

    // Clear files
    clearFiles.addEventListener('click', () => {
      selectedFiles = [];
      updateFileUI();
    });

    // Send
    sendBtn.addEventListener('click', sendEmail);

    // History
    clearHistory.addEventListener('click', () => {
      localStorage.removeItem('maildrop_history');
      loadHistory();
    });

    // Subject input — update send button
    subjectInput.addEventListener('input', updateSendButton);
  }

  // ============================================
  // File Handling
  // ============================================
  function handleFileSelect(e) {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;

    // Add to existing (max 10 total)
    for (const file of newFiles) {
      if (selectedFiles.length >= 10) break;
      // Avoid duplicates
      const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        selectedFiles.push(file);
      }
    }

    // Reset input so same file can be selected again
    fileInput.value = '';
    updateFileUI();
  }

  function updateFileUI() {
    if (selectedFiles.length === 0) {
      dropZoneContent.style.display = '';
      fileList.style.display = 'none';
      dropZone.style.display = '';
    } else {
      dropZoneContent.style.display = 'none';
      dropZone.style.display = 'none';
      fileList.style.display = '';

      const countText = selectedFiles.length === 1
        ? '1 file'
        : `${selectedFiles.length} files`;
      const totalSize = selectedFiles.reduce((s, f) => s + f.size, 0);
      fileCount.textContent = `${countText} · ${formatSize(totalSize)}`;

      fileItems.innerHTML = selectedFiles.map((file, i) => `
        <div class="file-item">
          <span class="file-item-icon">${getFileIcon(file.name)}</span>
          <div class="file-item-info">
            <div class="file-item-name">${escapeHtml(file.name)}</div>
            <div class="file-item-size">${formatSize(file.size)}</div>
          </div>
          <button class="file-item-remove" data-index="${i}" type="button" aria-label="Remove file">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `).join('');

      // Bind remove buttons
      fileItems.querySelectorAll('.file-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.index);
          selectedFiles.splice(idx, 1);
          updateFileUI();
        });
      });
    }

    updateSendButton();
  }

  function updateSendButton() {
    sendBtn.disabled = selectedFiles.length === 0;
  }

  // ============================================
  // Send Email
  // ============================================
  async function sendEmail() {
    if (selectedFiles.length === 0) return;

    // UI loading state
    sendBtn.disabled = true;
    sendBtn.classList.add('sending');
    sendBtnContent.style.display = 'none';
    sendBtnLoading.style.display = '';

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('files', file));
      formData.append('subject', subjectInput.value || 'Files from MailDrop');

      const res = await fetch('/api/send', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Save to history
        saveToHistory({
          subject: subjectInput.value || '(no ref)',
          filesCount: selectedFiles.length,
          totalSize: selectedFiles.reduce((s, f) => s + f.size, 0),
          timestamp: Date.now()
        });

        showToast('success', `✅ Sent ${selectedFiles.length} file(s) successfully!`);

        // Reset
        selectedFiles = [];
        subjectInput.value = '';
        updateFileUI();
      } else {
        showToast('error', `❌ ${data.error || 'Failed to send'}`);
      }
    } catch (err) {
      showToast('error', `❌ Network error — check connection`);
    } finally {
      sendBtn.classList.remove('sending');
      sendBtnContent.style.display = '';
      sendBtnLoading.style.display = 'none';
      updateSendButton();
    }
  }

  // ============================================
  // History
  // ============================================
  function saveToHistory(entry) {
    const history = getHistory();
    history.unshift(entry);
    // Keep last 20
    if (history.length > 20) history.pop();
    localStorage.setItem('maildrop_history', JSON.stringify(history));
    loadHistory();
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem('maildrop_history') || '[]');
    } catch {
      return [];
    }
  }

  function loadHistory() {
    const history = getHistory();
    if (history.length === 0) {
      historyCard.style.display = 'none';
      return;
    }

    historyCard.style.display = '';
    historyItems.innerHTML = history.map(h => `
      <div class="history-item">
        <div class="history-item-icon">✓</div>
        <div class="history-item-info">
          <div class="history-item-subject">Ref: ${escapeHtml(h.subject)}</div>
          <div class="history-item-meta">${h.filesCount} file(s) · ${formatSize(h.totalSize)} · ${timeAgo(h.timestamp)}</div>
        </div>
      </div>
    `).join('');
  }

  // ============================================
  // Toast
  // ============================================
  function showToast(type, message) {
    if (toastTimeout) clearTimeout(toastTimeout);

    toast.className = `toast ${type}`;
    toastIcon.textContent = type === 'success' ? '✅' : '❌';
    toastMessage.textContent = message.replace(/^[✅❌]\s*/, '');

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, 4000);
  }

  // ============================================
  // PWA Service Worker
  // ============================================
  async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (e) {
        // Service worker registration failed — not critical
      }
    }
  }

  // ============================================
  // Helpers
  // ============================================
  function getFileIcon(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (['jpg','jpeg','png','gif','webp','heic','bmp'].includes(ext)) return '🖼️';
    if (ext === 'pdf') return '📕';
    if (['doc','docx'].includes(ext)) return '📘';
    if (['xls','xlsx'].includes(ext)) return '📗';
    if (['ppt','pptx'].includes(ext)) return '📙';
    return '📄';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Start
  init();
})();
