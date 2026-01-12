(function(){try{var __n=function(){};if(window.console){console.log=__n;console.warn=__n;console.error=__n;}}catch(e){}})();
// Task management system
class TaskManager {
  constructor() {
    this.tasks = [];
    this.taskIdCounter = 1;
    this.currentImageSrc = null;
    this.maxTasks = 10; // up to 10 concurrent tasks
    this.maxFilesPerUpload = 10; // up to 10 files per upload
    this.init();
  }

  init() {
    try {
      console.log('[Init] TaskManager.init called');
      console.log('[Init] Constraints:', { maxTasks: this.maxTasks, maxFilesPerUpload: this.maxFilesPerUpload });
      console.log('[Init] UserAgent:', (navigator && navigator.userAgent) ? navigator.userAgent : 'n/a');
    } catch (_) {}
    // Browser compatibility check
    this.checkBrowserCompatibility();
    
    // Initialize PDF.js
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      console.log('[Init] PDF.js worker set');
    }
    
    this.bindEvents();
    // Remove demo tasks
    setTimeout(() => {
      const demoTasks = document.querySelectorAll('.task-item');
      demoTasks.forEach(task => task.remove());
      this.showEmptyState();
      console.log('[Init] Demo tasks cleared and empty state shown');
    }, 100);
  }

  checkBrowserCompatibility() {
    // 检查必要的API支持
    const features = {
      fileReader: typeof FileReader !== 'undefined',
      promise: typeof Promise !== 'undefined',
      fetch: typeof fetch !== 'undefined'
    };

    const unsupported = [];
    for (let [feature, supported] of Object.entries(features)) {
      if (!supported) {
        unsupported.push(feature);
      }
    }

    if (unsupported.length > 0) {
      console.warn('Browser does not support the following features:', unsupported);
      showToast('Your browser is outdated and some features may not work. Please use the latest Chrome, Firefox, Safari, or Edge.', 'warning', 8000);
    }
    console.log('[Compat] Feature support:', features);
  }

  bindEvents() {
    console.log('[Bind] Binding UI events');
    // File selection button
    const chooseBtn = document.getElementById('chooseBtn');
    const fileInput = document.getElementById('fileInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const dropzone = document.getElementById('dropzone');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const navUpload = document.getElementById('navUpload');

    if (chooseBtn && fileInput) {
      chooseBtn.addEventListener('click', () => { console.log('[Event] chooseBtn click'); fileInput.click(); });
      fileInput.addEventListener('change', (e) => {
        const fl = e && e.target && e.target.files ? Array.from(e.target.files).map(f => ({ name: f.name, type: f.type, size: f.size })) : [];
        console.log('[Event] fileInput change:', { count: (e.target.files || []).length, files: fl });
        this.handleFiles(e.target.files);
      });
    }

    // Make Get Started open file picker and scroll into view
    if (getStartedBtn && fileInput) {
      getStartedBtn.addEventListener('click', (e) => {
        try { e.preventDefault(); } catch (_) {}
        if (dropzone && dropzone.scrollIntoView) {
          dropzone.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // Slight delay to ensure scroll starts, then open picker
        setTimeout(() => { try { fileInput.click(); } catch (_) {} }, 150);
      });
    }

    // Ensure Upload nav scrolls reliably
    if (navUpload && dropzone) {
      navUpload.addEventListener('click', (e) => {
        try { e.preventDefault(); } catch (_) {}
        dropzone.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // Drag and drop
    if (dropzone) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (ev) => { this.preventDefaults(ev); }, false);
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => { console.log('[Event] drag over/enter'); dropzone.classList.add('dragover'); }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => { console.log('[Event] drag leave/drop'); dropzone.classList.remove('dragover'); }, false);
      });

      dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        const fl = files ? Array.from(files).map(f => ({ name: f.name, type: f.type, size: f.size })) : [];
        console.log('[Event] drop:', { count: (files || []).length, files: fl });
        this.handleFiles(files);
      }, false);
    }

    // Clipboard paste - improved with better error handling and global paste support
    this.setupClipboardPaste(pasteBtn);

    // Batch action buttons
    const clearAllBtn = document.getElementById('clearAllBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => { console.log('[Event] clearAllBtn click'); this.clearAllTasks(); });
    }

    if (downloadAllBtn) {
      downloadAllBtn.addEventListener('click', () => { console.log('[Event] downloadAllBtn click'); this.downloadAllResults(); });
    }

    // Start OCR button
    const startOcrBtn = document.getElementById('startOcrBtn');
    if (startOcrBtn) {
      startOcrBtn.addEventListener('click', () => { console.log('[Event] startOcrBtn click'); this.startOCRProcessing(); });
    }

    // Start Over button
    const startOverBtn = document.getElementById('startOverBtn');
    if (startOverBtn) {
      startOverBtn.addEventListener('click', () => { console.log('[Event] startOverBtn click'); this.startOver(); });
    }
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e && e.type) console.log('[Event] preventDefaults for', e.type);
  }

  // Improved clipboard paste handler with better error handling and global paste support
  setupClipboardPaste(pasteBtn) {
    // Helper function to process clipboard image
    const processClipboardImage = async (clipboardItems) => {
      if (!clipboardItems || clipboardItems.length === 0) {
        return false;
      }

      let foundImage = false;
          for (const item of clipboardItems) {
            for (const type of item.types) {
              if (type.startsWith('image/')) {
            try {
                const blob = await item.getType(type);
              const file = new File([blob], `Pasted-Image-${Date.now()}.png`, { type });
              console.log('[Paste] Image file constructed:', { name: file.name, type: file.type, size: file.size });
                this.handleFiles([file]);
              foundImage = true;
                break;
            } catch (err) {
              console.error('[Paste] Error processing image:', err);
            }
          }
        }
        if (foundImage) break;
      }
      return foundImage;
    };

    // Button click handler - uses paste event trick for maximum compatibility
    if (pasteBtn) {
      pasteBtn.addEventListener('click', async () => {
        console.log('[Event] pasteBtn click');
        
        // Strategy: Try Clipboard API first (if available and permitted)
        // If that fails, use the paste event trick (works without permission)
        let triedClipboardAPI = false;
        
        // Try Clipboard API first (only if available)
        if (navigator.clipboard && navigator.clipboard.read) {
          try {
            // Quick permission check (non-blocking)
            const permissionStatus = await navigator.permissions.query({ name: 'clipboard-read' }).catch(() => null);
            
            // Only try if permission is granted or prompt (not denied)
            if (!permissionStatus || permissionStatus.state !== 'denied') {
              triedClipboardAPI = true;
              const clipboardItems = await navigator.clipboard.read();
              console.log('[Paste] Items from Clipboard API:', clipboardItems ? clipboardItems.map(i => i.types) : []);
              
              const found = await processClipboardImage(clipboardItems);
              if (found) {
                // Success! Show feedback
                const originalText = pasteBtn.textContent;
                pasteBtn.textContent = '✓ Pasted!';
                setTimeout(() => {
                  pasteBtn.textContent = originalText;
                }, 1500);
                return;
            }
          }
        } catch (err) {
            // Clipboard API failed, fall through to paste event trick
            console.log('[Paste] Clipboard API failed, using paste event trick:', err.message);
          }
        }
        
        // Fallback: Use paste event trick (works without permission)
        // Create a temporary editable element, focus it, and wait for paste event
        const tempInput = document.createElement('textarea');
        tempInput.style.position = 'fixed';
        tempInput.style.left = '-9999px';
        tempInput.style.opacity = '0';
        tempInput.style.pointerEvents = 'none';
        tempInput.setAttribute('tabindex', '-1');
        document.body.appendChild(tempInput);
        
        // Store original button text
        const originalText = pasteBtn.textContent;
        pasteBtn.textContent = '📋 Press Ctrl+V (Cmd+V)';
        pasteBtn.disabled = true;
        
        // One-time paste handler for this temp input
        const pasteHandler = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const clipboardData = e.clipboardData || window.clipboardData;
          if (clipboardData && clipboardData.items) {
            const items = Array.from(clipboardData.items);
            let foundImage = false;
            
            for (const item of items) {
              if (item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                if (blob) {
                  const file = new File([blob], `Pasted-Image-${Date.now()}.png`, { type: item.type });
                  console.log('[Paste] Image from paste event trick:', { name: file.name, type: file.type, size: file.size });
                  this.handleFiles([file]);
                  foundImage = true;
                  break;
                }
              }
            }
            
            if (foundImage) {
              pasteBtn.textContent = '✓ Pasted!';
              setTimeout(() => {
                pasteBtn.textContent = originalText;
                pasteBtn.disabled = false;
              }, 1500);
            } else {
              pasteBtn.textContent = originalText;
              pasteBtn.disabled = false;
              showToast('No image found in clipboard.\n\nPlease copy an image first, then try again.', 'warning');
            }
          }
          
          // Cleanup
          tempInput.removeEventListener('paste', pasteHandler);
          if (document.body.contains(tempInput)) {
            document.body.removeChild(tempInput);
          }
        };
        
        tempInput.addEventListener('paste', pasteHandler);
        tempInput.focus();
        
        // Cleanup after timeout (10 seconds)
        setTimeout(() => {
          if (document.body.contains(tempInput)) {
            tempInput.removeEventListener('paste', pasteHandler);
            document.body.removeChild(tempInput);
            pasteBtn.textContent = originalText;
            pasteBtn.disabled = false;
          }
        }, 10000);
      });
    }

    // Global paste event listener (Ctrl+V / Cmd+V)
    document.addEventListener('paste', async (e) => {
      // Skip if user is typing in an input/textarea
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      try {
        console.log('[Event] Global paste event');
        const clipboardData = e.clipboardData || window.clipboardData;
        
        if (clipboardData && clipboardData.items) {
          // Use paste event's clipboardData (works without permission)
          const items = Array.from(clipboardData.items);
          let foundImage = false;
          
          for (const item of items) {
            if (item.type.startsWith('image/')) {
    e.preventDefault();
              const blob = item.getAsFile();
              if (blob) {
                const file = new File([blob], `Pasted-Image-${Date.now()}.png`, { type: item.type });
                console.log('[Paste] Image from paste event:', { name: file.name, type: file.type, size: file.size });
                this.handleFiles([file]);
                foundImage = true;
                break;
              }
            }
          }
          
          if (foundImage) {
            // Show brief success feedback
            if (pasteBtn) {
              const originalText = pasteBtn.textContent;
              pasteBtn.textContent = '✓ Pasted!';
              setTimeout(() => {
                pasteBtn.textContent = originalText;
              }, 1500);
            }
          }
        } else if (navigator.clipboard && navigator.clipboard.read) {
          // Fallback to clipboard API if paste event doesn't have data
          try {
            e.preventDefault();
            const clipboardItems = await navigator.clipboard.read();
            await processClipboardImage(clipboardItems);
          } catch (err) {
            // Silently fail for global paste to avoid interrupting user
            console.log('[Paste] Global paste failed (non-critical):', err.message);
          }
        }
      } catch (err) {
        console.log('[Paste] Global paste error (non-critical):', err.message);
      }
    });
  }

  handleFiles(files) {
    if (!files || files.length === 0) return;
    try {
      const arr = Array.from(files).map(f => ({ name: f.name, type: f.type, size: f.size }));
      console.log('[Files] Intake:', { count: files.length, files: arr });
    } catch (_) {}

    // Check per-upload file count limit
    if (files.length > this.maxFilesPerUpload) {
      showToast(`You can upload at most ${this.maxFilesPerUpload} files at once. You selected ${files.length} files.\nPlease reselect.`, 'error');
      return;
    }

    // Check task queue limit
    const remainingSlots = this.maxTasks - this.tasks.length;
    if (remainingSlots <= 0) {
      showToast(`Task queue is full (max ${this.maxTasks} tasks).\nPlease complete or delete some tasks before uploading.`, 'error');
      return;
    }

    if (files.length > remainingSlots) {
      showToast(`Insufficient queue space!\nYou can add ${remainingSlots} tasks, but you selected ${files.length} files.\nPlease complete or delete some tasks first.`, 'error');
      return;
    }

    let validFiles = [];
    let invalidFiles = [];
    let oversizedFiles = [];

    Array.from(files).forEach(file => {
      // 验证文件类型
      if (!this.isValidFile(file)) {
        invalidFiles.push(file.name);
        return;
      }

      // 验证文件大小（使用配置中的常量）
      const maxSize = window.MAX_UPLOAD_FILE_SIZE || (10 * 1024 * 1024);
      if (file.size > maxSize) {
        oversizedFiles.push(file.name);
        return;
      }

      validFiles.push(file);
    });

    // Show error messages
    if (invalidFiles.length > 0) {
      showToast(`Unsupported file types:\n${invalidFiles.join('\n')}\n\nSupported formats:\n• Images: PNG, JPG, JPEG, BMP, TIFF, GIF, JFIF, etc.\n• Documents: PDF, AI, EPS, PSD, XPS, DjVu, etc.\n• RAW: CR2, NEF, ARW, DNG, RAF, etc.\n• 30+ formats supported`, 'error', 8000);
    }

    if (oversizedFiles.length > 0) {
      const maxSize = window.MAX_UPLOAD_FILE_SIZE || (10 * 1024 * 1024);
      const maxSizeFormatted = this.formatFileSize(maxSize);
      showToast(`The following files exceed the size limit (${maxSizeFormatted}):\n${oversizedFiles.join('\n')}`, 'error', 8000);
    }

    // Create tasks
    if (validFiles.length > 0) {
      console.log('[Files] Valid/Invalid/Oversized:', { valid: validFiles.map(f => f.name), invalid: invalidFiles, oversized: oversizedFiles });
      validFiles.forEach(file => {
        this.createTask(file);
      });
      this.updateUI();
    }
  }

  isValidFile(file) {
    // Supported MIME types
    const validTypes = [
      // Common image formats
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'image/tiff', 'image/x-tiff', 'image/tiff-fx',
      // PDF
      'application/pdf',
      // Adobe and vector formats
      'application/postscript', 'application/illustrator', 'image/vnd.adobe.photoshop',
      'application/x-photoshop', 'image/photoshop', 'image/psd', 'image/x-psd',
      // Windows image formats
      'image/wmf', 'image/x-wmf', 'image/emf', 'image/x-emf',
      // XPS and other document formats
      'application/vnd.ms-xpsdocument', 'application/oxps',
      // DjVu
      'image/vnd.djvu', 'image/x-djvu',
      // RAW formats
      'image/x-canon-cr2', 'image/x-nikon-nef', 'image/x-sony-arw',
      'image/x-panasonic-rw2', 'image/x-olympus-orf', 'image/x-fuji-raf',
      'image/x-adobe-dng', 'image/x-exr', 'image/x-hdr',
      // Others
      'application/octet-stream'
    ];
    
    if (validTypes.includes(file.type)) {
      return true;
    }
    
    // Validate by file extension (some formats may lack correct MIME)
    const fileName = file.name.toLowerCase();
    const validExtensions = [
      '.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff', '.gif', '.tbi', 
      '.jfif', '.pjp', '.pjpeg', '.pdf', '.ai', '.eps', '.ps', '.psd', 
      '.wmf', '.emf', '.xps', '.oxps', '.djvu', '.cr2', '.nef', '.arw', 
      '.rw2', '.orf', '.raf', '.dng', '.hdr', '.exr', '.raw', '.fit'
    ];
    
    return validExtensions.some(ext => fileName.endsWith(ext));
  }

  createTask(file) {
    const taskId = `task_${this.taskIdCounter++}_${Date.now()}`;
    
    const task = {
      id: taskId,
      file: file,
      name: file.name,
      size: this.formatFileSize(file.size),
      status: 'waiting', // waiting, processing, completed, error
      progress: 0,
      result: '',
      thumbnail: null
    };

    this.tasks.push(task);
    console.log('[Task] Created:', { id: task.id, name: task.name, type: file.type, size: file.size, queueLength: this.tasks.length });
    this.renderTask(task);
    this.generateThumbnail(task);

    // Do not auto-process; wait for user to click Start OCR
    this.updateStartOCRButton();
  }

  async generateThumbnail(task) {
    if (task.file.type.startsWith('image/')) {
      // Image thumbnail
      console.log('[Thumb] Generating image thumbnail for', task.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        task.thumbnail = e.target.result;
        task.thumbnailType = 'image';
        this.updateTaskThumbnail(task);
        console.log('[Thumb] Image thumbnail set for', task.id);
      };
      reader.readAsDataURL(task.file);
    } else if (task.file.type === 'application/pdf') {
      // PDF thumbnail
      try {
        console.log('[Thumb] Generating PDF thumbnail for', task.name);
        const thumbnail = await this.generatePDFThumbnail(task.file);
        task.thumbnail = thumbnail;
        task.thumbnailType = 'pdf';
        this.updateTaskThumbnail(task);
        console.log('[Thumb] PDF thumbnail set for', task.id);
      } catch (error) {
        console.error('Failed to generate PDF thumbnail:', error);
      }
    }
  }

  async generatePDFThumbnail(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          const page = await pdf.getPage(1); // Get first page
          console.log('[Thumb][PDF] Pages:', pdf.numPages);
          
          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          console.log('[Thumb][PDF] Viewport:', { width: viewport.width, height: viewport.height, scale });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          resolve(canvas.toDataURL());
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  updateTaskThumbnail(task) {
    const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
    if (taskElement) {
      const thumb = taskElement.querySelector('.task-thumb img');
      if (thumb && task.thumbnail) {
        thumb.src = task.thumbnail;
        thumb.style.cursor = 'zoom-in';
        thumb.title = 'Click to zoom';
        
        // Add click handler to zoom image
        thumb.onclick = (e) => {
          e.stopPropagation();
          this.currentImageSrc = task.thumbnail;
          openImageViewer();
        };
        console.log('[Thumb] Thumbnail updated and click bound for', task.id);
      }
    }
  }

  async processTask(task) {
    task.status = 'processing';
    this.updateTaskStatus(task);

    const apiEndpoint = (window.API_ENDPOINT || './index.php');
    const statusEndpoint = (window.STATUS_ENDPOINT || './index.php?op=status');

    // Verbose debug: surface endpoints and environment signals
    try {
      console.log('[DEBUG] API endpoint:', apiEndpoint);
      console.log('[DEBUG] STATUS endpoint (raw):', statusEndpoint);
      console.log('[DEBUG] window.STATUS_ENDPOINT:', typeof window !== 'undefined' ? window.STATUS_ENDPOINT : undefined);
      console.log('[DEBUG] Location:', typeof location !== 'undefined' ? (location.href || location.pathname) : 'n/a');
    } catch (_) {}

    const presign = async () => {
      const qs = new URLSearchParams({
        op: 'upload',
        fileName: task.file.name,
        fileType: task.file.type || 'application/octet-stream',
        fileSize: String(task.file.size || 0)
      });
      const res = await fetch(`${apiEndpoint}?${qs.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('presign failed');
      const json = await res.json();
      if (!json || json.success === false || !json.data || !json.data.url || !json.data.key) throw new Error('presign invalid response');
      return { url: json.data.url, key: json.data.key };
    };

    const putToR2 = async (url) => {
      const headers = new Headers();
      if (task.file.type) headers.set('Content-Type', task.file.type);
      headers.set('x-amz-acl', 'public-read');
      const res = await fetch(url, { method: 'PUT', body: task.file, headers });
      if (!res.ok) throw new Error(`upload failed: ${res.status}`);
    };

    const createRemoteTask = async (key) => {
      // Generate client file_id: Unix timestamp (seconds) + 6 random digits
      const clientFileId = String(Math.floor(Date.now() / 1000)) + String(Math.floor(100000 + Math.random() * 900000));
      
      const body = new URLSearchParams();
      body.set('action', 'createTask');
      body.set('file_id', clientFileId);            // client-generated ID
      body.set('filename', key);                    // upstream storage key
      body.set('file', key);                        // compatibility field
      body.set('file_path', key);                   // compatibility field (backend may read file_path)
      body.set('original_name', task.file.name);    // original filename
      body.set('name', task.file.name);             // compatibility field
      body.set('file_size', String(task.file.size || 0));
      body.set('file_type', task.file.type || 'application/octet-stream');
      body.set('ocr_mode', 'standard');             // aligned with cankao.js
      body.set('ocr_mode_a', 'standard');           // aligned with cankao.js
      body.set('token_data', (window.__TOKEN || ''));
      // debug flag removed
      
      console.log('[createTask] POST ->', statusEndpoint);
      console.log('[createTask] Body ->', body.toString());

      let res = await fetch(statusEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: body.toString()
      });
      console.log('[createTask] HTTP status:', res.status);
      try {
        const dbg = res.headers && res.headers.get && res.headers.get('X-Proxy-Debug');
        if (dbg) {
          try {
            const decoded = typeof atob === 'function' ? atob(dbg) : dbg;
            console.log('[createTask] X-Proxy-Debug:', JSON.parse(decoded));
          } catch (e) {
            console.log('[createTask] X-Proxy-Debug (raw):', dbg);
          }
        }
      } catch (_) {}
      // If POST fails, try GET fallback (some upstreams accept only GET)
      if (!res.ok) {
        const fallbackUrl = `${statusEndpoint}&action=createTask` +
          `&file=${encodeURIComponent(key)}` +
          `&file_path=${encodeURIComponent(key)}` +
          `&file_id=${encodeURIComponent(clientFileId)}` +
          `&filename=${encodeURIComponent(key)}` +
          `&name=${encodeURIComponent(task.file.name)}` +
          `&original_name=${encodeURIComponent(task.file.name)}` +
          `&file_size=${encodeURIComponent(String(task.file.size || 0))}` +
          `&file_type=${encodeURIComponent(task.file.type || 'application/octet-stream')}` +
          `&ocr_mode=standard&ocr_mode_a=standard` +
          `&token_data=${encodeURIComponent(window.__TOKEN || '')}` +
          `&_=${Date.now()}`;
        console.warn('[createTask] POST failed with', res.status, '— trying GET fallback ->', fallbackUrl);
        try {
          res = await fetch(fallbackUrl, { method: 'GET', credentials: 'include' });
          console.log('[createTask][GET] HTTP status:', res.status);
        } catch (e) {
          console.error('[createTask][GET] Fallback error:', e);
        }
      }

      if (!res || !res.ok) throw new Error(`createTask failed (status=${res ? res.status : 'n/a'})`);
      const json = await res.json().catch((e) => {
        console.warn('[createTask] JSON parse failed, using empty object. Error:', e);
        return {};
      });
      
      console.log('[createTask] Response:', json);
      
      // 服务器返回格式：{"success": true, "file_id": "xxx"}
      // 优先使用服务器返回的 file_id
      if (json && json.file_id) {
        console.log('[createTask] Using file_id from server:', json.file_id);
        return json.file_id;
      }
      
      // 备选方案：尝试其他可能的字段名
      const fileId = json && (json.fileId || json.id || json.file);
      const finalId = fileId || clientFileId;
      console.log('[createTask] Fallback file_id:', finalId);
      return finalId;
    };

    const pollUntilDone = async (remoteId) => {
      return new Promise((resolve) => {
        let stopped = false;
        const tick = async () => {
          if (stopped) return;
          try {
            // Use GET request; URL params: ?op=status&action=check_task_status&file_id=xxx
            const statusUrl = `${statusEndpoint}&action=check_task_status&file_id=${encodeURIComponent(String(remoteId))}&stt=${Date.now()}`;
            console.log('[pollUntilDone] GET ->', statusUrl);
            
            const res = await fetch(statusUrl, {
              method: 'GET',
              credentials: 'include'
            });
            console.log('[pollUntilDone] HTTP status:', res.status);
            try {
              const dbg = res.headers && res.headers.get && res.headers.get('X-Proxy-Debug');
              if (dbg) {
                try {
                  const decoded = typeof atob === 'function' ? atob(dbg) : dbg;
                  console.log('[pollUntilDone] X-Proxy-Debug:', JSON.parse(decoded));
                } catch (e) {
                  console.log('[pollUntilDone] X-Proxy-Debug (raw):', dbg);
                }
              }
            } catch (_) {}
            if (res.ok) {
              const json = await res.json().catch(() => ({}));
              console.log('[pollUntilDone] Status response:', json);
              const data = json && (json.data || json);
              const status = (data && (data.status || data.state)) || '';
              const p = (data && (data.progress || data.percent)) || 0;
              const progress = Math.max(0, Math.min(100, Math.round(Number(p))));
              if (!Number.isNaN(progress)) {
                task.progress = Math.max(task.progress, progress);
      this.updateTaskProgress(task);
    }
              // Update status badge text and style based on remote JSON status
              this.updateRemoteStatusBadge(task, status);
              if (/^(done|finished|completed|success)$/i.test(status) || progress >= 100) {
                stopped = true;
                resolve({ remoteId, meta: data });
                return;
              }
            }
          } catch (_) {
            // 忽略临时错误继续轮询
          }
          setTimeout(tick, 1000);
        };
        tick();
      });
    };

    const fetchResultText = async (remoteId) => {
      const pickText = (payload) => {
        const data = payload && (payload.data || payload) || {};
        if (typeof data.ocr_text === 'string' && data.ocr_text) return data.ocr_text;
        if (typeof data.text === 'string' && data.text) return data.text;
        if (data.result) {
          if (typeof data.result === 'string') return data.result;
          if (typeof data.result === 'object' && data.result) {
            if (typeof data.result.ocr_text === 'string' && data.result.ocr_text) return data.result.ocr_text;
            if (typeof data.result.text === 'string' && data.result.text) return data.result.text;
          }
        }
        return '';
      };

      // Primary download endpoint (JSON)
      try {
        const dlUrl = `${apiEndpoint}?op=download&json=1&file=${encodeURIComponent(String(remoteId))}`;
        const res = await fetch(dlUrl, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          const text = pickText(json);
          if (text) return text;
        }
      } catch (_) {}
      // Fallback: try to fetch from status endpoint
      try {
        const statusUrl = `${statusEndpoint}&action=check_task_status&file_id=${encodeURIComponent(String(remoteId))}&_=${Date.now()}`;
        console.log('[fetchResultText] GET ->', statusUrl);
        const res = await fetch(statusUrl, { method: 'GET', credentials: 'include' });
        console.log('[fetchResultText] HTTP status:', res.status);
        try {
          const dbg = res.headers && res.headers.get && res.headers.get('X-Proxy-Debug');
          if (dbg) {
            try {
              const decoded = typeof atob === 'function' ? atob(dbg) : dbg;
              console.log('[fetchResultText] X-Proxy-Debug:', JSON.parse(decoded));
            } catch (e) {
              console.log('[fetchResultText] X-Proxy-Debug (raw):', dbg);
            }
          }
        } catch (_) {}
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          return pickText(json);
        }
      } catch (_) {}
      return '';
    };

    try {
      console.log('[Task] Starting task for:', task.file.name);
      
      const { url, key } = await presign();
      console.log('[Task] Presigned URL obtained, key:', key);
      task.remoteKey = key;
      task.progress = 5;
      this.updateTaskProgress(task);

      await putToR2(url);
      console.log('[Task] File uploaded to R2');
      task.progress = 20;
      this.updateTaskProgress(task);

      const remoteId = await createRemoteTask(key);
      console.log('[Task] Remote task created, file_id:', remoteId);
      
      // Validate remoteId
      if (!remoteId || remoteId === 'undefined' || remoteId === 'null') {
        throw new Error(`Invalid remoteId received: ${remoteId}. Check createTask response format.`);
      }
      
      task.remoteId = remoteId;
      task.progress = 30;
      this.updateTaskProgress(task);

      await pollUntilDone(remoteId);
      task.progress = 95;
      this.updateTaskProgress(task);

      const text = await fetchResultText(remoteId);
      task.result = text || '';
      task.progress = 100;
    task.status = 'completed';
      this.updateTaskStatus(task);
    } catch (err) {
      console.error('Remote OCR flow failed:', err);
      task.status = 'error';
    this.updateTaskStatus(task);
    }
  }

  generateMockResult(filename) {
    const samples = [
      'This is a sample contract document.\n\nParty A: XXX Company\nParty B: YYY Company\n\nAfter friendly consultation, the following agreement is reached:\n\n1) Scope of work\nThis cooperation involves software development services...',
      'Invoice\n\nInvoice No.: 12345678\nDate: 2024-01-15\n\nItem: Technical service fee\nAmount: $5,000.00\nTax: $300.00\nTotal: $5,300.00',
      'ID Card Information\n\nName: John Doe\nGender: Male\nNationality: Example\nBirth: 1990-01-01\nAddress: 123 Main St, City\nID Number: 110101199001011234',
      'Meeting Minutes\n\nDate: 2024-01-20\nAttendees: Alice, Bob, Carol\n\nAgenda:\n1. Project progress update\n2. Next steps\n3. Resource coordination',
      'Recognized text will appear here...\nThis is a sample placeholder.\n\nIn production, a real OCR API is used.'
    ];
    return samples[Math.floor(Math.random() * samples.length)];
  }

  renderTask(task) {
    this.hideEmptyState();
    
    const tasksList = document.getElementById('tasksList');
    const taskElement = document.createElement('div');
    taskElement.className = 'task-item';
    taskElement.setAttribute('data-task-id', task.id);
    
    const placeholderColors = ['#10b981', '#2563eb', '#059669', '#fbbf24', '#ef4444'];
    const randomColor = placeholderColors[Math.floor(Math.random() * placeholderColors.length)];
    
    taskElement.innerHTML = `
      <div class="task-thumb">
        <img src="https://via.placeholder.com/80x80/${randomColor.substring(1)}/ffffff?text=..." alt="${task.name}">
      </div>
      <div class="task-info">
        <div class="task-name">${task.name}</div>
        <div class="task-meta">${task.size}</div>
        <div class="task-status">
          <span class="status-badge waiting">⏳ Waiting</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="task-btn secondary" onclick="taskManager.deleteTask('${task.id}')" title="Cancel">✕</button>
      </div>
    `;
    
    tasksList.insertBefore(taskElement, tasksList.firstChild);
    this.updateTaskCount();
    console.log('[UI] Task rendered:', task.id);
  }

  updateTaskStatus(task) {
    console.log('[Task] Status ->', task.status, 'for', task.id);
    const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
    if (!taskElement) return;

    const statusBadge = taskElement.querySelector('.status-badge');
    const taskInfo = taskElement.querySelector('.task-info');
    const taskActions = taskElement.querySelector('.task-actions');

    // 移除进度条（如果存在）
    const existingProgress = taskInfo.querySelector('.task-progress');
    if (existingProgress) {
      existingProgress.remove();
    }

    switch (task.status) {
      case 'processing':
        statusBadge.className = 'status-badge processing';
        statusBadge.textContent = '🔄 Processing';
        
        // 添加进度条
        const progressBar = document.createElement('div');
        progressBar.className = 'task-progress';
        progressBar.innerHTML = '<div class="bar" style="width:0%"></div>';
        taskInfo.appendChild(progressBar);
        
        taskActions.innerHTML = `
          <button class="task-btn secondary" onclick="taskManager.deleteTask('${task.id}')" title="Cancel">✕</button>
        `;
        break;

      case 'completed':
        statusBadge.className = 'status-badge completed';
        statusBadge.textContent = '✓ Completed';
        
        taskActions.innerHTML = `
          <button class="task-btn" onclick="taskManager.viewResult('${task.id}')">View Result</button>
          <button class="task-btn" onclick="taskManager.downloadResult('${task.id}')">Download</button>
          <button class="task-btn secondary" onclick="taskManager.deleteTask('${task.id}')" title="Delete">🗑️</button>
        `;
        break;

      case 'error':
        statusBadge.className = 'status-badge error';
        statusBadge.textContent = '❌ Failed';
        
        taskActions.innerHTML = `
          <button class="task-btn" onclick="taskManager.retryTask('${task.id}')">Retry</button>
          <button class="task-btn secondary" onclick="taskManager.deleteTask('${task.id}')" title="Delete">🗑️</button>
        `;
        break;
    }
  }

  updateTaskProgress(task) {
    const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
    if (!taskElement) return;

    const progressBar = taskElement.querySelector('.task-progress .bar');
    if (progressBar) {
      progressBar.style.width = `${task.progress}%`;
      console.log('[Task] Progress:', task.progress + '%', 'for', task.id);
    }
  }

  // 使用轮询返回的 JSON status 更新状态徽章
  updateRemoteStatusBadge(task, remoteStatusRaw) {
    const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
    if (!taskElement) return;
    const statusBadge = taskElement.querySelector('.status-badge');
    if (!statusBadge) return;

    const s = String(remoteStatusRaw || '').toLowerCase();
    // 文案与样式映射（可按后端实际语义调整/扩展）
    const map = {
      queued: { text: '⏳ Queued', cls: 'waiting' },
      waiting: { text: '⏳ Waiting', cls: 'waiting' },
      pending: { text: '⏳ Waiting', cls: 'waiting' },
      initializing: { text: '⚙️ Initializing', cls: 'processing' },
      uploading: { text: '⬆️ Uploading', cls: 'processing' },
      downloading: { text: '⬇️ Downloading', cls: 'processing' },
      processing: { text: '🔄 Processing', cls: 'processing' },
      ocr: { text: '🧠 Recognizing', cls: 'processing' },
      recognizing: { text: '🧠 Recognizing', cls: 'processing' },
      merging: { text: '🧩 Merging', cls: 'processing' },
      finished: { text: '✓ Completed', cls: 'completed' },
      completed: { text: '✓ Completed', cls: 'completed' },
      success: { text: '✓ Completed', cls: 'completed' },
      error: { text: '❌ Failed', cls: 'error' },
      failed: { text: '❌ Failed', cls: 'error' }
    };

    const fallback = { text: (s || '').toUpperCase() || '🔄 Processing', cls: 'processing' };
    const mapped = map[s] || fallback;

    // 在进行中阶段，保持 processing 类；完成/失败时由上游流程最终覆盖
    const cls = mapped.cls === 'completed' ? 'processing' : (mapped.cls === 'error' ? 'error' : 'processing');
    statusBadge.className = `status-badge ${cls}`;
    statusBadge.textContent = mapped.text;
  }

  viewResult(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById('resultModal');
    const modalFileName = document.getElementById('modalFileName');
    const modalResultText = document.getElementById('modalResultText');
    const modalImage = document.getElementById('modalImage');
    const resultCharCount = document.getElementById('resultCharCount');

    modalFileName.textContent = task.name;
    // Support task.result as object or string
    let textToShow = '';
    if (typeof task.result === 'string') {
      textToShow = task.result;
    } else if (task.result && typeof task.result === 'object') {
      textToShow = task.result.ocr_text || task.result.text || '';
    }
    modalResultText.value = textToShow || '';
    resultCharCount.textContent = `${(textToShow || '').length} characters`;

    if (task.thumbnail) {
      modalImage.src = task.thumbnail;
      modalImage.style.display = 'block';
      // Save current image source for zoom viewer
      this.currentImageSrc = task.thumbnail;
      modalImage.title = 'Click to zoom';
    } else {
      modalImage.style.display = 'none';
      this.currentImageSrc = null;
    }

    modal.classList.add('active');
    
    // 存储当前任务ID供下载使用
    modal.setAttribute('data-current-task', taskId);
    console.log('[UI] View result modal opened for', taskId, 'chars:', task.result.length);

    // 构建 modal footer 多格式下载按钮（如果容器存在）
    const modalFooter = document.getElementById('modalFooter');
      if (modalFooter) {
      ensureFooterStyles();
      modalFooter.innerHTML = `
        <div class="download-grid">
          <button class="task-btn btn-outline" data-role="copy-btn" onclick="copyToClipboard()" title="Copy text">Copy Text</button>
          <button class="task-btn btn-blue" onclick="downloadAs('txt')" title="Download TXT"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span><span>TXT</span></button>
          <button class="task-btn btn-blue" onclick="downloadAs('docx')" title="Download DOCX"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span><span>DOCX</span></button>
          <button class="task-btn btn-gray" onclick="downloadAs('odt')" title="Download ODT"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span><span>ODT</span></button>
          <button class="task-btn btn-red" onclick="downloadAs('pdf')" title="Download PDF"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span><span>PDF</span></button>
          <button class="task-btn btn-teal" onclick="downloadAs('epub')" title="Download EPUB"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span><span>EPUB</span></button>
          <button class="task-btn btn-orange" onclick="downloadAs('mobi')" title="Download MOBI"><span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span><span>MOBI</span></button>
        </div>
      `;
      // 移除旧版绿色 Download TXT 按钮（若仍存在于模态内）
      const legacyTxtBtnInModal = modal.querySelector('button[onclick="downloadText()"]');
      if (legacyTxtBtnInModal) legacyTxtBtnInModal.remove();
    } else {
      // 兼容旧版模态：找不到 #modalFooter 时，给现有按钮容器动态追加所需格式
      const dlBtn = document.querySelector('button[onclick="downloadText()"]');
      const copyBtn = document.querySelector('button[onclick="copyToClipboard()"]');
      const container = (dlBtn && dlBtn.parentElement) || (copyBtn && copyBtn.parentElement) || null;
      if (container) {
        ensureFooterStyles();
        let grid = container.querySelector('.download-grid');
        if (!grid) {
          grid = document.createElement('div');
          grid.className = 'download-grid';
          container.appendChild(grid);
        }
        // Force single row (legacy container not styled by #modalFooter scoped styles)
        grid.style.display = 'flex';
        grid.style.flexWrap = 'nowrap';
        grid.style.alignItems = 'center';
        grid.style.gap = '10px';
        // 移除旧版绿色 Download TXT 按钮
        if (dlBtn) dlBtn.remove();
        const iconMarkup = '<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span>';
        const ensureBtn = (fmt, label, extraClass) => {
          if (!container.querySelector(`button[data-extra-format="${fmt}"]`)) {
            const btn = document.createElement('button');
            btn.className = 'task-btn';
            if (extraClass) btn.classList.add(extraClass);
            btn.setAttribute('data-extra-format', fmt);
            btn.title = `Download ${label}`;
            btn.innerHTML = iconMarkup + label;
            btn.onclick = () => downloadAs(fmt);
            btn.style.whiteSpace = 'nowrap';
            grid.appendChild(btn);
          }
        };
        ensureBtn('txt', 'TXT', 'btn-blue');
        ensureBtn('docx', 'DOCX', 'btn-blue');
        ensureBtn('odt', 'ODT', 'btn-gray');
        ensureBtn('pdf', 'PDF', 'btn-red');
        ensureBtn('epub', 'EPUB', 'btn-teal');
        ensureBtn('mobi', 'MOBI', 'btn-orange');
      }
    }
  }

  downloadResult(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || !task.result) return;

    const blob = new Blob([task.result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.name.replace(/\.[^/.]+$/, '')}_result.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[Download] Result file triggered for', taskId, 'name:', a.download);
  }

  deleteTask(taskId) {
    const index = this.tasks.findIndex(t => t.id === taskId);
    if (index > -1) {
      this.tasks.splice(index, 1);
    }

    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        taskElement.remove();
        this.updateUI();
        console.log('[Task] Deleted:', taskId, 'remaining:', this.tasks.length);
      }, 300);
    }
  }

  retryTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.status = 'waiting';
    task.progress = 0;
    task.result = '';
    this.updateTaskStatus(task);
    console.log('[Task] Retrying:', taskId);
    setTimeout(() => this.processTask(task), 500);
  }

  clearAllTasks() {
    if (this.tasks.length === 0) return;
    
    if (confirm('Are you sure you want to clear all tasks?')) {
      this.tasks = [];
      const tasksList = document.getElementById('tasksList');
      tasksList.innerHTML = '';
      this.updateUI();
      console.log('[Task] Cleared all tasks');
    }
  }

  downloadAllResults() {
    const completedTasks = this.tasks.filter(t => t.status === 'completed' && t.result);
    
    if (completedTasks.length === 0) {
      showToast('No results to download', 'warning');
      return;
    }

    completedTasks.forEach(task => {
      this.downloadResult(task.id);
    });
    console.log('[Download] Batch download count:', completedTasks.length);
  }

  updateUI() {
    this.updateTaskCount();
    this.updateStartOCRButton();
    
    if (this.tasks.length === 0) {
      this.showEmptyState();
    }
    console.log('[UI] updateUI called, tasks:', this.tasks.length);
  }

  updateTaskCount() {
    const tasksCount = document.getElementById('tasksCount');
    const batchActions = document.getElementById('batchActions');
    
    if (tasksCount) {
      tasksCount.textContent = `(${this.tasks.length}/${this.maxTasks})`;
    }

    if (batchActions) {
      batchActions.style.display = this.tasks.length > 0 ? 'flex' : 'none';
    }
    console.log('[UI] Task count updated:', this.tasks.length);
  }

  updateStartOCRButton() {
    const startOcrWrapper = document.getElementById('startOcrWrapper');
    const waitingFilesCount = document.getElementById('waitingFilesCount');
    
    // 计算等待处理的任务数量
    const waitingTasks = this.tasks.filter(t => t.status === 'waiting');
    
    if (startOcrWrapper) {
      if (waitingTasks.length > 0) {
        startOcrWrapper.style.display = 'block';
        if (waitingFilesCount) {
          waitingFilesCount.textContent = waitingTasks.length;
        }
      } else {
        startOcrWrapper.style.display = 'none';
      }
    }
    console.log('[UI] Start OCR button state updated, waiting:', waitingTasks.length);
  }

  startOCRProcessing() {
    // 获取所有等待中的任务
    const waitingTasks = this.tasks.filter(t => t.status === 'waiting');
    
    if (waitingTasks.length === 0) {
      showToast('No tasks waiting to process', 'warning');
      return;
    }

    // 隐藏整个上传卡片
    const uploadCard = document.getElementById('dropzone');
    if (uploadCard) {
      uploadCard.style.display = 'none';
    }

    // 显示 Start Over 按钮
    const startOverSection = document.getElementById('startOverSection');
    if (startOverSection) {
      startOverSection.style.display = 'block';
    }

    // 依次处理所有等待中的任务
    waitingTasks.forEach((task, index) => {
      console.log('[Task] Scheduling processTask for', task.id, 'after', 500 * index, 'ms');
      setTimeout(() => this.processTask(task), 500 * index);
    });
    console.log('[Task] startOCRProcessing queued count:', waitingTasks.length);
  }

  startOver() {
    // 清空所有任务（数组用 length = 0 清空）
    this.tasks.length = 0;

    // 清空任务列表 DOM
    const tasksList = document.getElementById('tasksList');
    if (tasksList) {
      tasksList.innerHTML = '';
    }

    // 显示上传卡片
  const dropzone = document.getElementById('dropzone');
    if (dropzone) {
      dropzone.style.display = 'block';
    }

    // 隐藏 Start Over 按钮
    const startOverSection = document.getElementById('startOverSection');
    if (startOverSection) {
      startOverSection.style.display = 'none';
    }

    // 更新界面状态（隐藏开始OCR按钮、显示空状态等）
    this.updateUI();

    // 重置文件输入
  const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.value = '';
    }
    console.log('[Task] startOver executed');
  }

  showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const tasksList = document.getElementById('tasksList');
    
    if (emptyState && tasksList) {
      emptyState.style.display = 'block';
      tasksList.style.display = 'none';
    }
    console.log('[UI] Empty state shown');
  }

  hideEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const tasksList = document.getElementById('tasksList');
    
    if (emptyState && tasksList) {
      emptyState.style.display = 'none';
      tasksList.style.display = 'flex';
    }
    console.log('[UI] Empty state hidden');
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Toast notification system
function showToast(message, type = 'error', duration = 5000) {
  // Create toast container if it doesn't exist
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Set icon based on type
  const icons = {
    error: '⚠️',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✓'
  };
  
  const iconSpan = document.createElement('span');
  iconSpan.className = 'toast-icon';
  iconSpan.textContent = icons[type] || icons.error;
  
  const messageSpan = document.createElement('span');
  messageSpan.className = 'toast-message';
  messageSpan.textContent = message;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => toast.remove();
  
  toast.appendChild(iconSpan);
  toast.appendChild(messageSpan);
  toast.appendChild(closeBtn);
  
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Modal controls
function closeModal() {
  const modal = document.getElementById('resultModal');
  if (modal) {
    modal.classList.remove('active');
  }
  console.log('[UI] Modal closed');
}

// Translation: language list (aligned with translate_test.php)
const TR_LANGUAGES = [
  { code: 'en', api: 'English', label: 'English / English' },
  { code: 'es', api: 'Spanish', label: 'Spanish / Español' },
  { code: 'pt', api: 'Portuguese', label: 'Portuguese / Português' },
  { code: 'fr', api: 'French', label: 'French / Français' },
  { code: 'zh-CN', api: 'Chinese (Simplified)', label: 'Chinese (Simplified) / 中文' },
  { code: 'ja', api: 'Japanese', label: 'Japanese / 日本語' },
  { code: 'ko', api: 'Korean', label: 'Korean / 한국어' },
  { code: 'de', api: 'German', label: 'German / Deutsch' },
  { code: 'ar', api: 'Arabic', label: 'Arabic / العربية' },
  { code: 'hr', api: 'Croatian', label: 'Croatian / Hrvatski' },
  { code: 'cs', api: 'Czech', label: 'Czech / Čeština' },
  { code: 'da', api: 'Danish', label: 'Danish / Dansk' },
  { code: 'nl', api: 'Dutch', label: 'Dutch / Nederlands' },
  { code: 'et', api: 'Estonian', label: 'Estonian / Eesti' },
  { code: 'fi', api: 'Finnish', label: 'Finnish / Suomi' },
  { code: 'el', api: 'Greek', label: 'Greek / Ελληνικά' },
  { code: 'he', api: 'Hebrew', label: 'Hebrew / עברית' },
  { code: 'hu', api: 'Hungarian', label: 'Hungarian / Magyar' },
  { code: 'is', api: 'Icelandic', label: 'Icelandic / Íslenska' },
  { code: 'id', api: 'Indonesian', label: 'Indonesian / Bahasa Indonesia' },
  { code: 'it', api: 'Italian', label: 'Italian / Italiano' },
  { code: 'mr', api: 'Marathi', label: 'Marathi / मराठी' },
  { code: 'no', api: 'Norwegian', label: 'Norwegian / Norsk' },
  { code: 'pl', api: 'Polish', label: 'Polish / Polski' },
  { code: 'ro', api: 'Romanian', label: 'Romanian / Română' },
  { code: 'ru', api: 'Russian', label: 'Russian / Русский' },
  { code: 'sk', api: 'Slovak', label: 'Slovak / Slovenčina' },
  { code: 'sl', api: 'Slovenian', label: 'Slovenian / Slovenščina' },
  { code: 'sv', api: 'Swedish', label: 'Swedish / Svenska' },
  { code: 'th', api: 'Thai', label: 'Thai / ไทย' },
  { code: 'tr', api: 'Turkish', label: 'Turkish / Türkçe' },
  { code: 'uk', api: 'Ukrainian', label: 'Ukrainian / Українська' },
  { code: 'vi', api: 'Vietnamese', label: 'Vietnamese / Tiếng Việt' }
];

let __trSelectedLang = null;

function __trRenderLanguageButtons(list) {
  const grid = document.getElementById('trLangGrid');
  const count = document.getElementById('trLangCount');
  if (!grid) return;
  grid.innerHTML = '';
  (list || []).forEach(lang => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tr-lang-btn';
    btn.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:flex-start;">
        <span class="label">${lang.label}</span>
        <span class="code">${lang.code} · ${lang.api}</span>
      </div>
    `;
    btn.addEventListener('click', () => {
      closeTrLangDialog();
      startTranslateFromResult(lang);
    });
    grid.appendChild(btn);
  });
  if (count) {
    count.textContent = (list || []).length + ' languages';
  }
}

function openLangDialogFromResult() {
  const modalResultText = document.getElementById('modalResultText');
  if (!modalResultText) return;
  const text = (modalResultText.value || '').trim();
  if (!text) {
    showToast('No recognized text to translate. Please run OCR first.', 'warning');
    return;
  }
  const overlay = document.getElementById('trLangOverlay');
  const search = document.getElementById('trLangSearch');
  if (!overlay) return;
  __trRenderLanguageButtons(TR_LANGUAGES);
  if (search) {
    search.value = '';
  }
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeTrLangDialog() {
  const overlay = document.getElementById('trLangOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

function openTrResultDialog(lang) {
  const overlay = document.getElementById('trResultOverlay');
  const badge = document.getElementById('trResultLangBadge');
  const loading = document.getElementById('trResultLoading');
  const originalText = document.getElementById('trOriginalText');
  const translatedText = document.getElementById('trTranslatedText');
  const modalResultText = document.getElementById('modalResultText');
  if (!overlay || !badge || !loading || !originalText || !translatedText || !modalResultText) return;
  __trSelectedLang = lang;
  badge.textContent = lang.label;
  originalText.value = modalResultText.value || '';
  translatedText.value = '';
  loading.style.display = 'flex';
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeTrResultDialog() {
  const overlay = document.getElementById('trResultOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

async function startTranslateFromResult(lang) {
  const modalResultText = document.getElementById('modalResultText');
  const translatedText = document.getElementById('trTranslatedText');
  const loading = document.getElementById('trResultLoading');
  if (!modalResultText) return;
  const text = (modalResultText.value || '').trim();
  if (!text) {
    showToast('No recognized text to translate.', 'warning');
    return;
  }

  openTrResultDialog(lang);

  try {
    const resp = await fetch('./index.php?op=translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: JSON.stringify({
        tgt_lang: lang.api,
        text: text
      })
    });
    const data = await resp.json().catch(() => ({}));
    if (loading) loading.style.display = 'none';

    if (!data || data.success === false) {
      const rawMsg = data && data.message ? data.message : 'Translation failed';
      const fullMsg = 'Translation failed. Please try submitting the translation again.\n\nDetail: ' + rawMsg;
      if (translatedText) translatedText.value = fullMsg;
      showToast('Translation failed: ' + rawMsg, 'error');
      return;
    }

    const translated = data.translated_text || data.text || '';
    if (!translated) {
      const fullMsg = 'Translation API returned empty content. Please try submitting the translation again.';
      if (translatedText) translatedText.value = fullMsg;
      showToast(fullMsg, 'error');
      return;
    }

    if (translatedText) translatedText.value = translated;
  } catch (err) {
    if (loading) loading.style.display = 'none';
    const fullMsg = 'Network error: ' + err.message + '\n\nPlease try submitting the translation again.';
    if (translatedText) translatedText.value = fullMsg;
    showToast('Network error: ' + err.message, 'error');
  }
}

// Translation overlay events
document.addEventListener('DOMContentLoaded', () => {
  const langSearch = document.getElementById('trLangSearch');
  const langClose = document.getElementById('trLangCloseBtn');
  const resultClose = document.getElementById('trResultCloseBtn');
  const langOverlay = document.getElementById('trLangOverlay');
  const resultOverlay = document.getElementById('trResultOverlay');
  const trCopyBtn = document.getElementById('trCopyBtn');

  if (langSearch) {
    langSearch.addEventListener('input', () => {
      const q = (langSearch.value || '').trim().toLowerCase();
      const filtered = !q ? TR_LANGUAGES : TR_LANGUAGES.filter(l =>
        l.code.toLowerCase().includes(q) ||
        l.api.toLowerCase().includes(q) ||
        l.label.toLowerCase().includes(q)
      );
      __trRenderLanguageButtons(filtered);
    });
  }
  if (langClose) {
    langClose.addEventListener('click', closeTrLangDialog);
  }
  if (resultClose) {
    resultClose.addEventListener('click', closeTrResultDialog);
  }
  if (langOverlay) {
    langOverlay.addEventListener('click', (e) => {
      if (e.target === langOverlay) {
        closeTrLangDialog();
      }
    });
  }
  if (resultOverlay) {
    // 和 translate_test.php 一样，结果层只通过右上角关闭
  }
  if (trCopyBtn) {
    trCopyBtn.addEventListener('click', async () => {
      const translatedText = document.getElementById('trTranslatedText');
      if (!translatedText || !translatedText.value) return;
      const text = translatedText.value;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const tmp = document.createElement('textarea');
          tmp.value = text;
          tmp.style.position = 'fixed';
          tmp.style.left = '-9999px';
          document.body.appendChild(tmp);
          tmp.select();
          document.execCommand('copy');
          document.body.removeChild(tmp);
        }
        showToast('Translation copied to clipboard.', 'success');
      } catch (e) {
        showToast('Failed to copy. Please select and copy manually.', 'error');
      }
    });
  }
});

function copyToClipboard() {
  const modalResultText = document.getElementById('modalResultText');
  if (!modalResultText) return;

  // Prefer async Clipboard API; fallback to execCommand
  const text = modalResultText.value || '';
  const doIndicate = () => {
    const activeEl = document.activeElement;
    const copyBtn = (activeEl && activeEl.tagName === 'BUTTON')
      ? activeEl
      : document.querySelector('button[data-role="copy-btn"]');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      copyBtn.disabled = true;
      setTimeout(() => {
        copyBtn.textContent = originalText || 'Copy Text';
        copyBtn.disabled = false;
      }, 1200);
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      doIndicate();
      console.log('[Clipboard] Copied', text.length, 'chars');
    }).catch(() => {
    modalResultText.select();
    document.execCommand('copy');
      doIndicate();
      console.log('[Clipboard] Copied (fallback)', text.length, 'chars');
    });
  } else {
    modalResultText.select();
    document.execCommand('copy');
    doIndicate();
    console.log('[Clipboard] Copied (legacy)', text.length, 'chars');
  }
}

function downloadText() {
  const modal = document.getElementById('resultModal');
  const taskId = modal.getAttribute('data-current-task');
  if (taskId && window.taskManager) {
    window.taskManager.downloadResult(taskId);
  }
  console.log('[Download] downloadText invoked for', taskId);
}

// Dynamically load external libraries
const __loadedLibs = {};
function ensureLibrary(globalName, url) {
  return new Promise((resolve, reject) => {
    if (window[globalName]) return resolve(window[globalName]);
    if (__loadedLibs[url]) return __loadedLibs[url].then(resolve).catch(reject);
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    __loadedLibs[url] = new Promise((res, rej) => {
      script.onload = () => res(window[globalName]);
      script.onerror = () => rej(new Error('Failed to load ' + url));
    });
    document.head.appendChild(script);
    __loadedLibs[url].then(resolve).catch(reject);
  });
}

function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Inject styles for modal footer download buttons (scoped to #modalFooter)
function ensureFooterStyles() {
  if (document.getElementById('download-footer-styles')) return;
  const style = document.createElement('style');
  style.id = 'download-footer-styles';
  style.textContent = `
    #modalFooter { display: block; }
    #modalFooter .download-grid { display: flex; flex-wrap: nowrap; align-items: center; gap: 10px; }
    #modalFooter .task-btn { width: auto; white-space: nowrap; padding: 10px 12px; border-radius: 12px; font-weight: 600; font-size: 14px; }
    #modalFooter .btn-label { background: transparent; color: #374151; border: none; cursor: default; pointer-events: none; text-align: left; padding-left: 0; }
    #modalFooter .btn-blue { background: #2F76FF; color: #fff; border: none; }
    #modalFooter .btn-gray { background: #6B7280; color: #fff; border: none; }
    #modalFooter .btn-red { background: #EF4444; color: #fff; border: none; }
    #modalFooter .btn-teal { background: #10B981; color: #fff; border: none; }
    #modalFooter .btn-orange { background: #F59E0B; color: #fff; border: none; }
    #modalFooter .btn-outline { background: #fff; color: #374151; border: 1px solid #D1D5DB; }
    /* download icon */
    #modalFooter .task-btn .icon, .download-grid .task-btn .icon { width: 14px; height: 14px; margin-right: 6px; display: inline-flex; align-items: center; }
    #modalFooter .task-btn .icon svg, .download-grid .task-btn .icon svg { width: 14px; height: 14px; }
  `;
  document.head.appendChild(style);
}

// Multi-format download: TXT / Markdown / JSON / DOCX / ODT / PDF / EPUB / MOBI (placeholder)
async function downloadAs(format) {
  try {
    const modal = document.getElementById('resultModal');
    if (!modal) return;
    const taskId = modal.getAttribute('data-current-task');
    if (!taskId || !window.taskManager) return;

    const tm = window.taskManager;
    const task = tm.tasks.find(t => t.id === taskId);
    if (!task) return;

    // 统一获取文本
    let text = '';
    if (typeof task.result === 'string') {
      text = task.result;
    } else if (task.result && typeof task.result === 'object') {
      text = task.result.ocr_text || task.result.text || '';
    }

    const baseName = (task.name || 'result').replace(/\.[^/.]+$/, '');
    const fileId = task.remoteId || task.id || '';

    let blob;
    let fileName;
    switch ((format || '').toLowerCase()) {
      case 'md': {
        const md = `# Result - ${baseName}\n\n${text || ''}`;
        blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        fileName = `${baseName}_result.md`;
        break;
      }
      case 'json': {
        const payload = {
          success: true,
          file_id: String(fileId || ''),
          ocr_mode: 'standard',
          status: 'completed',
          changed: true,
          original_name: task.name || baseName,
          result: {
            ocr_text: text || ''
          }
        };
        const jsonStr = JSON.stringify(payload, null, 2);
        blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        fileName = `${baseName}_result.json`;
        break;
      }
      case 'docx': {
        // Use server-side generation for DOCX
        const formData = new FormData();
        formData.append('ocr_text', text || '');
        formData.append('format', 'docx');
        formData.append('original_name', task.name || baseName);
        
        const response = await fetch('./download.php', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Server error: ' + response.status);
        }
        
        blob = await response.blob();
        fileName = `${baseName}_result.docx`;
        break;
      }
      case 'pdf': {
        await ensureLibrary('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        const maxWidth = pageWidth - margin * 2;
        const lines = pdf.splitTextToSize(String(text || ''), maxWidth);
        let y = margin;
        const lineHeight = 16;
        lines.forEach(line => {
          if (y > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(line, margin, y);
          y += lineHeight;
        });
        blob = pdf.output('blob');
        fileName = `${baseName}_result.pdf`;
        break;
      }
      case 'odt': {
        await ensureLibrary('JSZip', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        const zip = new window.JSZip();
        // mimetype MUST be stored uncompressed
        zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
        const paragraphs = String(text || '').split(/\r?\n/).map(l => `<text:p>${escapeXml(l)}</text:p>`).join('');
        const contentXml = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" office:version="1.2"><office:body><office:text>${paragraphs}</office:text></office:body></office:document-content>`;
        const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.2"></office:document-styles>`;
        const manifest = `<?xml version="1.0" encoding="UTF-8"?>\n<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"><manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/></manifest:manifest>`;
        zip.file('content.xml', contentXml);
        zip.file('styles.xml', stylesXml);
        zip.folder('META-INF').file('manifest.xml', manifest);
        blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.oasis.opendocument.text' });
        fileName = `${baseName}_result.odt`;
        break;
      }
      case 'epub': {
        await ensureLibrary('JSZip', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        const zip = new window.JSZip();
      const title = baseName + ' Result';
        // Required files
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        zip.folder('META-INF').file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
        const chapter = `<?xml version="1.0" encoding="UTF-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"/><title>${escapeXml(title)}</title></head><body>${String(text||'').split(/\r?\n/).map(p=>`<p>${escapeXml(p)}</p>`).join('')}</body></html>`;
        zip.folder('OEBPS').file('chapter1.xhtml', chapter);
        const nav = `<?xml version="1.0" encoding="UTF-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Contents</title></head><body><nav epub:type="toc" id="toc"><ol><li><a href="chapter1.xhtml">Body</a></li></ol></nav></body></html>`;
        zip.folder('OEBPS').file('nav.xhtml', nav);
        const opf = `<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">${escapeXml(fileId || taskId)}</dc:identifier><dc:title>${escapeXml(title)}</dc:title><dc:language>en</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="c1" href="chapter1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>`;
        zip.folder('OEBPS').file('content.opf', opf);
        blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
        fileName = `${baseName}_result.epub`;
        break;
      }
      case 'mobi': {
        // 浏览器端标准 MOBI 生成较复杂，这里提供占位：保存为 .mobi 扩展名的 UTF-8 文本
        blob = new Blob([text || ''], { type: 'application/x-mobipocket-ebook' });
        fileName = `${baseName}_result.mobi`;
        console.warn('[Download] MOBI placeholder: plain text with .mobi extension');
        break;
      }
      case 'txt':
      default: {
        blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
        fileName = `${baseName}_result.txt`;
        break;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[Download] downloadAs', format, '->', fileName);
  } catch (e) {
    console.error('[Download] downloadAs error:', e);
  }
}

// Image viewer controls
function openImageViewer() {
  if (!window.taskManager || !window.taskManager.currentImageSrc) return;
  
  const viewer = document.getElementById('imageViewer');
  const viewerImage = document.getElementById('viewerImage');
  
  if (viewer && viewerImage) {
    viewerImage.src = window.taskManager.currentImageSrc;
    viewer.classList.add('active');
  }
  console.log('[Viewer] Opened');
}

function closeImageViewer() {
  const viewer = document.getElementById('imageViewer');
  if (viewer) {
    viewer.classList.remove('active');
  }
  console.log('[Viewer] Closed');
}

// Close viewer when clicking outside
document.addEventListener('click', (e) => {
  const viewer = document.getElementById('imageViewer');
  if (viewer && viewer.classList.contains('active')) {
    const viewerContent = viewer.querySelector('.image-viewer-content');
    const closeBtn = viewer.querySelector('.image-viewer-close');
    if (e.target === viewer || (!viewerContent.contains(e.target) && e.target !== closeBtn)) {
      closeImageViewer();
      console.log('[Viewer] Closed by outside click');
    }
  }
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.getElementById('resultModal');
  if (modal && e.target === modal) {
    closeModal();
    console.log('[UI] Modal closed by outside click');
  }
});

// Close modal and viewer with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const viewer = document.getElementById('imageViewer');
    if (viewer && viewer.classList.contains('active')) {
      closeImageViewer();
      console.log('[Viewer] Closed by Escape');
    } else {
      closeModal();
      console.log('[UI] Modal closed by Escape');
    }
  }
});

// Add fade-out animation and toast styles
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-20px);
    }
  }
  
  #toastContainer {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 400px;
    pointer-events: none;
  }
  
  .toast {
    background: #fff;
    border-radius: 8px;
    padding: 14px 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: flex-start;
    gap: 12px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    pointer-events: auto;
    border-left: 4px solid #dc3545;
    max-width: 100%;
    word-wrap: break-word;
  }
  
  .toast.show {
    opacity: 1;
    transform: translateX(0);
  }
  
  .toast-error {
    border-left-color: #dc3545;
    background: #fff5f5;
  }
  
  .toast-warning {
    border-left-color: #ffc107;
    background: #fffbf0;
  }
  
  .toast-info {
    border-left-color: #17a2b8;
    background: #f0f9ff;
  }
  
  .toast-success {
    border-left-color: #28a745;
    background: #f0fff4;
  }
  
  .toast-icon {
    font-size: 20px;
    flex-shrink: 0;
    line-height: 1.4;
  }
  
  .toast-message {
    flex: 1;
    color: #333;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
  }
  
  .toast-close {
    background: none;
    border: none;
    font-size: 20px;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    line-height: 1;
    transition: color 0.2s;
  }
  
  .toast-close:hover {
    color: #333;
  }
  
  @media (max-width: 480px) {
    #toastContainer {
      left: 10px;
      right: 10px;
      max-width: none;
    }
    
    .toast {
      padding: 12px 14px;
    }
  }
`;
document.head.appendChild(style);

// Initialize
let taskManager;

document.addEventListener('DOMContentLoaded', () => {
  taskManager = new TaskManager();
  window.taskManager = taskManager; // expose globally
  console.log('✨ Task manager initialized');
});

// Smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
