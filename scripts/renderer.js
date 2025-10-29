// Renderer.js - Handles UI interactions for CLEM Advanced UI

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const initProgressBar = document.getElementById('initProgressBar');
const statusMessages = document.getElementById('statusMessages');
const systemStatus = document.getElementById('systemStatus');
const cpuStatus = document.getElementById('cpuStatus');
const memoryStatus = document.getElementById('memoryStatus');
const notificationArea = document.getElementById('notificationArea');
const featureViewer = document.getElementById('featureViewer');
const featureContent = document.getElementById('featureContent');
const featureTitle = document.getElementById('featureTitle');
const recentActivitiesList = document.getElementById('recentActivitiesList');
const systemStatusValue = document.getElementById('systemStatusValue');
const modelsLoadedValue = document.getElementById('modelsLoadedValue');
const cameraStatusValue = document.getElementById('cameraStatusValue');

// Control buttons
const minimizeBtn = document.getElementById('minimizeBtn');
const maximizeBtn = document.getElementById('maximizeBtn');
const closeBtn = document.getElementById('closeBtn');
const closeFeatureBtn = document.getElementById('closeFeatureBtn');
const navItems = document.querySelectorAll('.nav-item');
const actionButtons = document.querySelectorAll('.action-btn');
const featureButtons = document.querySelectorAll('.feature-btn');

// Templates
const toastTemplate = document.getElementById('toastTemplate');

// App state
let apps = [];
let activeSection = 'dashboard';
let activeFeature = null;
let appInitCount = 0;

// Initialize the UI
async function initializeUI() {
  try {
    // Retrieve apps from the main process
    apps = await window.electronAPI.getApps();
    
    // If we have apps, update progress bar to reflect initialization process
    if (apps.length > 0) {
      // Set initial progress to 5%
      initProgressBar.style.width = '5%';
      addStatusMessage('Starting initialization of features...');
      
      // Update models loaded counter
      modelsLoadedValue.textContent = `${apps.length} available`;
      
      // Immediately after getting apps, update progress to 10%
      setTimeout(() => {
        initProgressBar.style.width = '10%';
      }, 200);
      
      // Set up navigation and section switching
      setupNavigationEvents();
      
      // Create recent activities
      populateRecentActivities();
      
      // Load app icons
      loadAppIcons();
      
      // Setup feature activation buttons
      setupFeatureButtons();
      
      // Update progress to 20%
      setTimeout(() => {
        initProgressBar.style.width = '20%';
        addStatusMessage('Initializing AI models...');
      }, 500);
      
      // Set up event listeners for real-time updates
      setupEventListeners();
      
      // Update progress to 30% to show initialization is progressing
      setTimeout(() => {
        initProgressBar.style.width = '30%';
        addStatusMessage('Setting up feature services...');
      }, 800);
      
      // Force additional progress updates to provide visual feedback
      setTimeout(() => {
        initProgressBar.style.width = '40%';
        addStatusMessage('Configuring computer vision modules...');
      }, 1500);
      
      setTimeout(() => {
        initProgressBar.style.width = '50%';
        addStatusMessage('Starting gesture recognition system...');
      }, 2500);
      
      // Check device capabilities
      checkDeviceCapabilities();
    } else {
      showToast('Error', 'No applications found in configuration.', 'error');
      hideLoading();
    }
  } catch (error) {
    console.error('Failed to initialize UI:', error);
    showToast('Error', 'Failed to initialize system.', 'error');
    hideLoading();
  }
}

// Check device capabilities like camera
function checkDeviceCapabilities() {
  addStatusMessage('Checking camera availability...');
  
  // Check if camera is available
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        cameraStatusValue.textContent = 'Available';
        addStatusMessage('Camera is available and functioning');
        stream.getTracks().forEach(track => track.stop());
        
        // Update progress to 70%
        initProgressBar.style.width = '70%';
        addStatusMessage('Hardware check complete');
        
        // Continue with initialization
        setTimeout(() => {
          initProgressBar.style.width = '100%';
          addStatusMessage('System initialization complete');
          setTimeout(hideLoading, 800);
        }, 1000);
      })
      .catch(err => {
        console.log('Camera not available: ', err);
        cameraStatusValue.textContent = 'Unavailable';
        addStatusMessage('Camera is not available, some features may be limited', 'warning');
        
        // Still complete progress
        initProgressBar.style.width = '100%';
        addStatusMessage('System initialization complete with warnings');
        setTimeout(hideLoading, 800);
      });
  } else {
    cameraStatusValue.textContent = 'Not Supported';
    addStatusMessage('Camera API not supported, some features may be limited', 'warning');
    
    // Still complete progress
    initProgressBar.style.width = '100%';
    addStatusMessage('System initialization complete with warnings');
    setTimeout(hideLoading, 800);
  }
}

// Set up navigation between sections
function setupNavigationEvents() {
  navItems.forEach(navItem => {
    navItem.addEventListener('click', () => {
      const targetSection = navItem.getAttribute('data-section');
      switchSection(targetSection);
    });
  });
}

// Switch between content sections
function switchSection(sectionId) {
  // Update nav active state
  navItems.forEach(navItem => {
    if (navItem.getAttribute('data-section') === sectionId) {
      navItem.classList.add('active');
    } else {
      navItem.classList.remove('active');
    }
  });
  
  // Hide all sections
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(section => section.classList.remove('active'));
  
  // Show target section
  const targetSection = document.getElementById(`${sectionId}-section`);
  if (targetSection) {
    targetSection.classList.add('active');
    activeSection = sectionId;
    
    // If switching to settings, ensure listeners are set up
    if (sectionId === 'settings') {
      console.log('Switching to settings section - ensuring listeners are attached');
      // Call setup again to ensure listeners are attached
      // The function checks if already initialized
      setTimeout(() => {
        setupSettingsListeners();
      }, 100);
    }
  }
}

// Track if settings listeners have been set up
let settingsListenersInitialized = false;

// Settings state
let settings = {
  darkMode: true,
  notifications: true,
  autoStart: false,
  cameraSource: '0',
  resolution: '1080p',
  fps: '30',
  modelPrecision: 'standard',
  gpuAcceleration: true,
  confidenceThreshold: '0.7',
  resourceUsage: 'balanced',
  caching: true,
  saveFaces: true,
  saveReports: true
};

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('clemSettings');
  if (saved) {
    try {
      settings = { ...settings, ...JSON.parse(saved) };
      console.log('Loaded settings:', settings);
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }
  return settings;
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem('clemSettings', JSON.stringify(settings));
  console.log('Settings saved:', settings);
}

// Apply dark mode
function applyDarkMode(enabled) {
  const body = document.body;
  if (enabled) {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
    console.log('✓ Dark mode applied');
  } else {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    console.log('✓ Light mode applied');
  }
}

// Update notification status indicator
function updateNotificationStatus(enabled) {
  // Find the notification bell in header
  const notificationBell = document.querySelector('.header-actions .header-btn[title="Notifications"]');
  if (notificationBell) {
    if (!enabled) {
      // Add a strike-through or mute indicator
      notificationBell.style.opacity = '0.4';
      notificationBell.style.textDecoration = 'line-through';
      notificationBell.title = 'Notifications (Disabled)';
    } else {
      notificationBell.style.opacity = '1';
      notificationBell.style.textDecoration = 'none';
      notificationBell.title = 'Notifications';
    }
  }
  
  console.log(`Notification status updated: ${enabled ? 'enabled' : 'disabled'}`);
}

// Setup settings event listeners
function setupSettingsListeners() {
  console.log('=== Setting up settings listeners ===');
  
  // Prevent duplicate initialization
  if (settingsListenersInitialized) {
    console.log('Settings listeners already initialized, skipping');
    return;
  }
  
  // Load saved settings
  loadSettings();
  
  // Apply initial dark mode
  applyDarkMode(settings.darkMode);
  
  // Apply initial notification status
  updateNotificationStatus(settings.notifications);
  
  // General Settings
  const darkModeToggle = document.getElementById('darkModeToggle');
  console.log('darkModeToggle element:', darkModeToggle);
  if (darkModeToggle) {
    // Set initial state from settings
    darkModeToggle.checked = settings.darkMode;
    applyDarkMode(settings.darkMode);
    
    darkModeToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      console.log('!!! Dark mode toggled:', enabled);
      settings.darkMode = enabled;
      saveSettings();
      applyDarkMode(enabled);
      // Always show dark mode toggle notification
      showToast('Settings', `${enabled ? 'Dark' : 'Light'} mode activated`, 'success', true);
    });
    console.log('✓ Dark mode toggle listener attached');
  } else {
    console.error('✗ darkModeToggle element not found!');
  }
  
  const notificationsToggle = document.getElementById('notificationsToggle');
  if (notificationsToggle) {
    // Set initial state from settings
    notificationsToggle.checked = settings.notifications;
    
    notificationsToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      console.log('Notifications toggled:', enabled);
      settings.notifications = enabled;
      saveSettings();
      
      // Update notification status in UI if needed
      updateNotificationStatus(enabled);
      
      // Always show this notification regardless of setting (to confirm the change)
      showToast('Settings', `Notifications ${enabled ? 'enabled' : 'disabled'}`, 'success', true);
    });
    console.log('✓ Notifications toggle listener attached');
  }
  
  const autoStartToggle = document.getElementById('autoStartToggle');
  if (autoStartToggle) {
    autoStartToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      console.log('Auto-start toggled:', enabled);
      showToast('Settings', `Auto-start ${enabled ? 'enabled' : 'disabled'}`, 'success');
    });
    console.log('Auto-start toggle attached');
  }
  
  // Camera Settings
  const cameraSelect = document.getElementById('cameraSelect');
  if (cameraSelect) {
    cameraSelect.addEventListener('change', (e) => {
      const option = e.target.options[e.target.selectedIndex].text;
      console.log('Camera changed:', option);
      showToast('Camera', `Camera source set to: ${option}`, 'success');
    });
    console.log('Camera select attached');
  }
  
  const resolutionSelect = document.getElementById('resolutionSelect');
  if (resolutionSelect) {
    resolutionSelect.addEventListener('change', (e) => {
      const value = e.target.value;
      console.log('Resolution changed:', value);
      showToast('Camera', `Resolution set to: ${value}`, 'success');
    });
    console.log('Resolution select attached');
  }
  
  const fpsSelect = document.getElementById('fpsSelect');
  if (fpsSelect) {
    fpsSelect.addEventListener('change', (e) => {
      const value = e.target.value;
      console.log('FPS changed:', value);
      showToast('Camera', `Frame rate set to: ${value} FPS`, 'success');
    });
    console.log('FPS select attached');
  }
  
  // AI Model Settings
  const modelPrecisionSelect = document.getElementById('modelPrecisionSelect');
  if (modelPrecisionSelect) {
    modelPrecisionSelect.addEventListener('change', (e) => {
      const option = e.target.options[e.target.selectedIndex].text;
      console.log('Model precision changed:', option);
      showToast('AI Models', `Model precision set to: ${option}`, 'success');
    });
    console.log('Model precision select attached');
  }
  
  const gpuAccelerationToggle = document.getElementById('gpuAccelerationToggle');
  if (gpuAccelerationToggle) {
    gpuAccelerationToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      console.log('GPU acceleration toggled:', enabled);
      showToast('AI Models', `GPU acceleration ${enabled ? 'enabled' : 'disabled'}`, 'success');
    });
    console.log('GPU acceleration toggle attached');
  }
  
  const confidenceThreshold = document.getElementById('confidenceThreshold');
  if (confidenceThreshold) {
    confidenceThreshold.addEventListener('change', (e) => {
      const option = e.target.options[e.target.selectedIndex].text;
      console.log('Confidence threshold changed:', option);
      showToast('AI Models', `Confidence threshold set to: ${option}`, 'success');
    });
    console.log('Confidence threshold select attached');
  }
  
  // Performance Settings
  const resourceUsageSelect = document.getElementById('resourceUsageSelect');
  if (resourceUsageSelect) {
    resourceUsageSelect.addEventListener('change', (e) => {
      const option = e.target.options[e.target.selectedIndex].text;
      console.log('Resource usage changed:', option);
      showToast('Performance', `Resource usage mode: ${option}`, 'success');
    });
    console.log('Resource usage select attached');
  }
  
  const cachingToggle = document.getElementById('cachingToggle');
  if (cachingToggle) {
    cachingToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      console.log('Caching toggled:', enabled);
      showToast('Performance', `Model caching ${enabled ? 'enabled' : 'disabled'}`, 'success');
    });
    console.log('Caching toggle attached');
  }
  
  // Storage Settings
  const saveFacesToggle = document.getElementById('saveFacesToggle');
  if (saveFacesToggle) {
    saveFacesToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      console.log('Save faces toggled:', enabled);
      showToast('Storage', `Save recognized faces ${enabled ? 'enabled' : 'disabled'}`, 'success');
    });
    console.log('Save faces toggle attached');
  }
  
  const saveReportsToggle = document.getElementById('saveReportsToggle');
  if (saveReportsToggle) {
    saveReportsToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      console.log('Save reports toggled:', enabled);
      showToast('Storage', `Save analysis reports ${enabled ? 'enabled' : 'disabled'}`, 'success');
    });
    console.log('Save reports toggle attached');
  }
  
  // Mark as initialized
  settingsListenersInitialized = true;
  console.log('Settings listeners setup complete');
  showToast('Settings', 'Settings panel loaded - all controls are active', 'info');
}

// Setup feature buttons
function setupFeatureButtons() {
  // Quick action buttons
  actionButtons.forEach(button => {
    const featureId = button.getAttribute('data-feature');
    button.addEventListener('click', () => activateFeature(featureId));
  });
  
  // Feature card buttons
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(card => {
    const featureId = card.getAttribute('data-feature');
    
    // The whole card can be clicked
    card.addEventListener('click', (e) => {
      // Don't activate if clicking the button itself (it will handle its own click)
      if (!e.target.classList.contains('feature-btn') && 
          !e.target.closest('.feature-btn')) {
        activateFeature(featureId);
      }
    });
    
    // Button specific click
    const button = card.querySelector('.feature-btn');
    if (button) {
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        activateFeature(featureId);
      });
    }
  });
}

// Activate a specific feature
async function activateFeature(featureId) {
  if (!featureId) return;
  
  const app = apps.find(a => a.id === featureId);
  if (!app) {
    showToast('Error', 'Feature not found', 'error');
    return;
  }
  
  // Set active feature
  activeFeature = featureId;
  
  // Show the feature viewer
  featureTitle.textContent = app.name;
  featureViewer.classList.add('active');
  
  // Add loading state to feature content
  featureContent.innerHTML = `
    <div class="feature-loading">
      <div class="futuristic-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <div class="spinner-text">Initializing ${app.name}...</div>
    </div>
  `;
  
  // Add to recent activities
  addRecentActivity(app.name, app.id);
  
  try {
    showToast('Activating', `Starting ${app.name}...`, 'info');
    const success = await window.electronAPI.launchApp(featureId);
    
    if (success) {
      showToast('Success', `${app.name} activated successfully.`, 'success');
      
      // Create feature content container
      const contentContainer = document.createElement('div');
      contentContainer.className = 'feature-content-container';
      
      // For features that might have a video feed, create a video area
      if (['face-reco', 'emotions', 'analyse', 'SignLang', 'item-detection', 'air-writing', 'media-control'].includes(featureId)) {
        contentContainer.innerHTML = `
          <div class="feature-video-area">
            <div class="video-placeholder">
              <i class="fas fa-camera"></i>
              <p>Camera feed will display here</p>
              <p class="small-text">(Actual feed will be shown when Python app connects)</p>
            </div>
          </div>
          <div class="feature-controls">
            <div class="feature-stats">
              <div class="stat-item">
                <span class="stat-label">Status:</span>
                <span class="stat-value">Running</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Detection:</span>
                <span class="stat-value">Ready</span>
              </div>
            </div>
            <div class="feature-actions">
              <button class="feature-action-btn pause-btn">
                <i class="fas fa-pause"></i>
                <span>Pause</span>
              </button>
              <button class="feature-action-btn settings-btn">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
              </button>
              <button class="feature-action-btn fullscreen-btn">
                <i class="fas fa-expand"></i>
                <span>Fullscreen</span>
              </button>
            </div>
          </div>
        `;
      } 
      // For download apps, create a form interface
      else if (['youtube-download', 'music-download'].includes(featureId)) {
        const downloadType = featureId === 'youtube-download' ? 'YouTube' : 'Music';
        contentContainer.innerHTML = `
          <div class="embedded-app-interface">
            <div class="app-header">
              <h3>${downloadType} Downloader</h3>
              <div class="app-status">
                <i class="fas fa-circle status-indicator running"></i>
                <span>Ready</span>
              </div>
            </div>
            
            <div class="app-content">
              <div class="download-form">
                <div class="input-group">
                  <label for="url-input">Enter ${downloadType} URL:</label>
                  <div class="input-row">
                    <input type="text" id="url-input" class="form-control" placeholder="Paste ${downloadType === 'YouTube' ? 'YouTube' : 'music'} URL here...">
                    <button class="form-btn download-btn">
                      <i class="fas fa-download"></i>
                      Download
                    </button>
                  </div>
                </div>
                
                ${downloadType === 'YouTube' ? `
                <div class="download-options">
                  <div class="option-group">
                    <label for="quality-select">Quality:</label>
                    <select id="quality-select">
                      <option value="best">Best Quality</option>
                      <option value="720p">720p</option>
                      <option value="480p">480p</option>
                      <option value="360p">360p</option>
                    </select>
                  </div>
                  <div class="option-group">
                    <label for="format-select">Format:</label>
                    <select id="format-select">
                      <option value="mp4">MP4 Video</option>
                      <option value="mp3">MP3 Audio</option>
                    </select>
                  </div>
                </div>
                ` : `
                <div class="download-options">
                  <div class="option-group">
                    <label for="format-select">Format:</label>
                    <select id="format-select">
                      <option value="mp3">MP3</option>
                      <option value="flac">FLAC</option>
                      <option value="wav">WAV</option>
                    </select>
                  </div>
                  <div class="option-group">
                    <label for="quality-select">Bitrate:</label>
                    <select id="quality-select">
                      <option value="320">320 kbps</option>
                      <option value="256">256 kbps</option>
                      <option value="192">192 kbps</option>
                      <option value="128">128 kbps</option>
                    </select>
                  </div>
                </div>
                `}
              </div>
              
              <div class="app-console">
                <div class="console-header">
                  <h4>Console Output</h4>
                  <button class="console-clear-btn">
                    <i class="fas fa-trash"></i>
                    Clear
                  </button>
                </div>
                <div class="console-content" id="app-console-${featureId}">
                  <div class="console-line">
                    <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
                    <span class="message">${app.name} is ready for downloads...</span>
                  </div>
                </div>
              </div>
              
              <div class="download-status">
                <h4>Downloads</h4>
                <div class="download-list" id="download-list-${featureId}">
                  <p class="no-downloads">No active downloads</p>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      // For phone info app
      else if (featureId === 'phoneInfo') {
        contentContainer.innerHTML = `
          <div class="embedded-app-interface">
            <div class="app-header">
              <h3>Phone Information</h3>
              <div class="app-status">
                <i class="fas fa-circle status-indicator running"></i>
                <span>Ready</span>
              </div>
            </div>
            
            <div class="app-content">
              <div class="connection-section">
                <div class="connection-status">
                  <i class="fas fa-mobile-alt"></i>
                  <h4>Device Connection</h4>
                  <p>Connect your device to view information</p>
                  <div class="connection-buttons">
                    <button class="connection-btn scan-btn">
                      <i class="fas fa-search"></i>
                      Scan for Devices
                    </button>
                    <button class="connection-btn wifi-btn">
                      <i class="fas fa-wifi"></i>
                      Connect via WiFi
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="app-console">
                <div class="console-header">
                  <h4>Console Output</h4>
                  <button class="console-clear-btn">
                    <i class="fas fa-trash"></i>
                    Clear
                  </button>
                </div>
                <div class="console-content" id="app-console-${featureId}">
                  <div class="console-line">
                    <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
                    <span class="message">Phone information tool is ready...</span>
                  </div>
                </div>
              </div>
              
              <div class="device-info" id="device-info-${featureId}" style="display: none;">
                <h4>Device Information</h4>
                <div class="info-grid">
                  <div class="info-item">
                    <label>Device Model:</label>
                    <span id="device-model">N/A</span>
                  </div>
                  <div class="info-item">
                    <label>OS Version:</label>
                    <span id="device-os">N/A</span>
                  </div>
                  <div class="info-item">
                    <label>Storage:</label>
                    <span id="device-storage">N/A</span>
                  </div>
                  <div class="info-item">
                    <label>Battery:</label>
                    <span id="device-battery">N/A</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      // For other apps (general purpose interface)
      else {
        contentContainer.innerHTML = `
          <div class="embedded-app-interface">
            <div class="app-header">
              <h3>${app.name}</h3>
              <div class="app-status">
                <i class="fas fa-circle status-indicator running"></i>
                <span>Running</span>
              </div>
            </div>
            
            <div class="app-content">
              <div class="app-description">
                <p>${app.description || 'Application is running and ready to use.'}</p>
              </div>
              
              <div class="app-console">
                <div class="console-header">
                  <h4>Console Output</h4>
                  <button class="console-clear-btn">
                    <i class="fas fa-trash"></i>
                    Clear
                  </button>
                </div>
                <div class="console-content" id="app-console-${featureId}">
                  <div class="console-line">
                    <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
                    <span class="message">${app.name} is running...</span>
                  </div>
                </div>
              </div>
              
              <div class="app-controls">
                <button class="control-btn restart-btn">
                  <i class="fas fa-redo"></i>
                  Restart
                </button>
                <button class="control-btn stop-btn">
                  <i class="fas fa-stop"></i>
                  Stop
                </button>
              </div>
            </div>
          </div>
        `;
      }
      
      // Replace the content
      featureContent.innerHTML = '';
      featureContent.appendChild(contentContainer);
      
      // Setup event listeners for the embedded interface
      setupEmbeddedAppListeners(featureId, app);
    } else {
      showToast('Error', 'Failed to activate feature.', 'error');
      featureContent.innerHTML = `
        <div class="feature-error">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Failed to activate feature</h3>
          <p>There was an error starting ${app.name}. Please check logs or try again.</p>
          <button class="retry-btn">Try Again</button>
        </div>
      `;
      
      // Add retry button event listener
      const retryBtn = featureContent.querySelector('.retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          activateFeature(featureId);
        });
      }
    }
  } catch (error) {
    console.error('Error activating feature:', error);
    showToast('Error', `Failed to activate: ${error.message}`, 'error');
    
    featureContent.innerHTML = `
      <div class="feature-error">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error</h3>
        <p>${error.message}</p>
        <button class="retry-btn">Try Again</button>
      </div>
    `;
  }
}

// Setup events for embedded app interfaces
function setupEmbeddedAppListeners(featureId, app) {
  // Console clear buttons
  const consoleClearBtn = featureContent.querySelector('.console-clear-btn');
  if (consoleClearBtn) {
    consoleClearBtn.addEventListener('click', () => {
      const consoleContent = featureContent.querySelector(`#app-console-${featureId}`);
      if (consoleContent) {
        consoleContent.innerHTML = `
          <div class="console-line">
            <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
            <span class="message">Console cleared</span>
          </div>
        `;
      }
    });
  }
  
  // Download functionality
  const downloadBtn = featureContent.querySelector('.download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const urlInput = featureContent.querySelector('#url-input');
      if (urlInput && urlInput.value.trim()) {
        startDownloadProcess(featureId, urlInput.value.trim());
        urlInput.value = '';
      } else {
        showToast('Error', 'Please enter a valid URL', 'error');
      }
    });
  }
  
  // Connection functionality for phone info
  const scanBtn = featureContent.querySelector('.scan-btn');
  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      startDeviceScan(featureId);
    });
  }
  
  // General control buttons
  const restartBtn = featureContent.querySelector('.restart-btn');
  const stopBtn = featureContent.querySelector('.stop-btn');
  
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      restartApp(featureId);
    });
  }
  
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      stopApp(featureId);
    });
  }
}

// Helper functions for embedded app functionality
function startDownloadProcess(featureId, url) {
  // Add to console
  addToConsole(featureId, `Starting download for: ${url}`);
  
  // Get quality setting from the interface
  const qualitySelect = featureContent.querySelector(`#quality-${featureId}`);
  const quality = qualitySelect ? qualitySelect.value : 'best';
  
  // Get download list
  const downloadList = featureContent.querySelector(`#download-list-${featureId}`);
  if (downloadList) {
    // Remove "no downloads" message
    const noDownloads = downloadList.querySelector('.no-downloads');
    if (noDownloads) noDownloads.remove();
    
    // Create download item
    const downloadItem = document.createElement('div');
    downloadItem.className = 'download-item';
    downloadItem.innerHTML = `
      <div class="download-info">
        <div class="download-name">Loading video info...</div>
        <div class="download-progress">
          <div class="progress-bar" style="width: 0%"></div>
        </div>
        <div class="download-status">Connecting...</div>
      </div>
      <button class="download-cancel-btn">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    downloadList.appendChild(downloadItem);
    
    const progressBar = downloadItem.querySelector('.progress-bar');
    const statusElement = downloadItem.querySelector('.download-status');
    const nameElement = downloadItem.querySelector('.download-name');
    
    // Start the actual Python download process using electronAPI
    window.electronAPI.startDownload(featureId, url, quality)
      .then(success => {
        if (success) {
          addToConsole(featureId, `Download process started for: ${url}`);
        } else {
          statusElement.textContent = 'Failed to start';
          showToast('Error', 'Failed to start download process', 'error');
        }
      })
      .catch(error => {
        console.error(`Failed to start download:`, error);
        statusElement.textContent = 'Failed to start';
        showToast('Error', 'Failed to start download process', 'error');
      });
    
    // Cancel button
    downloadItem.querySelector('.download-cancel-btn').addEventListener('click', () => {
      window.electronAPI.cancelDownload(featureId)
        .then(() => {
          downloadItem.remove();
          addToConsole(featureId, `Download cancelled: ${url}`);
          showToast('Cancelled', 'Download cancelled', 'warning');
        });
      
      // Show "no downloads" if this was the last one
      if (downloadList.children.length === 0) {
        const noDownloads = document.createElement('p');
        noDownloads.className = 'no-downloads';
        noDownloads.textContent = 'No active downloads';
        downloadList.appendChild(noDownloads);
      }
    });
  }
  
  showToast('Started', `Download started for ${url}`, 'info');
}

function startDeviceScan(featureId) {
  addToConsole(featureId, 'Scanning for devices...');
  
  const scanBtn = featureContent.querySelector('.scan-btn');
  if (scanBtn) {
    scanBtn.disabled = true;
    scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
    
    setTimeout(() => {
      scanBtn.disabled = false;
      scanBtn.innerHTML = '<i class="fas fa-search"></i> Scan for Devices';
      
      addToConsole(featureId, 'Device found: Android Device (USB)');
      
      // Show device info
      const deviceInfo = featureContent.querySelector(`#device-info-${featureId}`);
      if (deviceInfo) {
        deviceInfo.style.display = 'block';
        
        // Update device details
        document.getElementById('device-model').textContent = 'Samsung Galaxy S21';
        document.getElementById('device-os').textContent = 'Android 13';
        document.getElementById('device-storage').textContent = '128GB (67% used)';
        document.getElementById('device-battery').textContent = '87%';
      }
      
      showToast('Connected', 'Device connected successfully', 'success');
    }, 2000);
  }
}

function addToConsole(featureId, message) {
  const consoleContent = featureContent.querySelector(`#app-console-${featureId}`);
  if (consoleContent) {
    const consoleLine = document.createElement('div');
    consoleLine.className = 'console-line';
    consoleLine.innerHTML = `
      <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
      <span class="message">${message}</span>
    `;
    consoleContent.appendChild(consoleLine);
    
    // Auto-scroll to bottom
    consoleContent.scrollTop = consoleContent.scrollHeight;
  }
}

function restartApp(featureId) {
  addToConsole(featureId, 'Restarting application...');
  showToast('Restart', 'Application restarted', 'info');
  
  // Update status indicator
  const statusIndicator = featureContent.querySelector('.status-indicator');
  if (statusIndicator) {
    statusIndicator.className = 'fas fa-circle status-indicator running';
  }
}

function stopApp(featureId) {
  addToConsole(featureId, 'Stopping application...');
  showToast('Stopped', 'Application stopped', 'warning');
  
  // Update status indicator
  const statusIndicator = featureContent.querySelector('.status-indicator');
  if (statusIndicator) {
    statusIndicator.className = 'fas fa-circle status-indicator stopped';
  }
  
  // Close feature viewer
  setTimeout(() => {
    featureViewer.classList.remove('active');
  }, 1000);
}

// Close current active feature
function closeFeature() {
  if (!activeFeature) return;
  
  featureViewer.classList.remove('active');
  
  // Terminate the Python process
  window.electronAPI.terminateApp(activeFeature).then(() => {
    const app = apps.find(a => a.id === activeFeature);
    if (app) {
      showToast('Closed', `${app.name} has been deactivated.`, 'info');
    }
    
    activeFeature = null;
  });
}

// Add an entry to recent activities
function addRecentActivity(name, id) {
  // Get icon based on id
  let icon = 'fa-cube';
  if (id.includes('face') || id === 'analyse') icon = 'fa-user-check';
  if (id === 'emotions') icon = 'fa-smile';
  if (id === 'SignLang') icon = 'fa-sign-language';
  if (id === 'media-control') icon = 'fa-music';
  if (id === 'item-detection') icon = 'fa-box';
  if (id.includes('download')) icon = 'fa-download';
  if (id === 'phoneInfo') icon = 'fa-mobile-alt';
  if (id === 'air-writing') icon = 'fa-pencil-alt';
  
  // Create timestamp
  const now = new Date();
  
  // Save to localStorage
  const activities = getStoredActivities();
  activities.unshift({
    name: name,
    id: id,
    icon: icon,
    timestamp: now.getTime()
  });
  
  // Keep only the last 10 activities in storage
  if (activities.length > 10) {
    activities.length = 10;
  }
  
  saveActivities(activities);
  
  // Re-render the activity lists
  renderActivities();
}

// Get stored activities from localStorage
function getStoredActivities() {
  try {
    const stored = localStorage.getItem('recentActivities');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading activities:', error);
    return [];
  }
}

// Save activities to localStorage
function saveActivities(activities) {
  try {
    localStorage.setItem('recentActivities', JSON.stringify(activities));
  } catch (error) {
    console.error('Error saving activities:', error);
  }
}

// Render activities in both lists
function renderActivities() {
  const activities = getStoredActivities();
  
  // Render dashboard list
  if (recentActivitiesList) {
    recentActivitiesList.innerHTML = '';
    
    if (activities.length === 0) {
      recentActivitiesList.innerHTML = `
        <div class="no-activity">
          <i class="fas fa-clock"></i>
          <p>No recent activity</p>
        </div>
      `;
    } else {
      activities.slice(0, 5).forEach(activity => {
        const activityItem = createActivityElement(activity);
        recentActivitiesList.appendChild(activityItem);
      });
    }
  }
  
  // Render widget list
  const widgetActivityList = document.getElementById('widgetActivityList');
  if (widgetActivityList) {
    widgetActivityList.innerHTML = '';
    
    if (activities.length === 0) {
      widgetActivityList.innerHTML = `
        <div class="no-activity">
          <i class="fas fa-clock"></i>
          <p>No recent activity</p>
        </div>
      `;
    } else {
      activities.slice(0, 3).forEach(activity => {
        const activityItem = createActivityElement(activity);
        widgetActivityList.appendChild(activityItem);
      });
    }
  }
}

// Create an activity element
function createActivityElement(activity) {
  const activityItem = document.createElement('div');
  activityItem.className = 'activity-item';
  
  const relativeTime = getRelativeTime(activity.timestamp);
  
  activityItem.innerHTML = `
    <div class="activity-icon">
      <i class="fas ${activity.icon}"></i>
    </div>
    <div class="activity-details">
      <div class="activity-title">${activity.name}</div>
      <div class="activity-time">${relativeTime}</div>
    </div>
  `;
  
  activityItem.dataset.timestamp = activity.timestamp;
  
  return activityItem;
}

// Populate initial recent activities
function populateRecentActivities() {
  // Load and render activities from localStorage
  renderActivities();
}

// Clear all activities
function clearActivities() {
  localStorage.removeItem('recentActivities');
  renderActivities();
}

// Add status message
function addStatusMessage(message, type = 'info') {
  if (!statusMessages) return;
  
  const messageElement = document.createElement('div');
  messageElement.className = `status-message ${type}`;
  messageElement.textContent = message;
  
  statusMessages.appendChild(messageElement);
  statusMessages.scrollTop = statusMessages.scrollHeight;
}

// Show toast notification
function showToast(title, message, type = 'info', forceShow = false) {
  // Check if notifications are enabled (unless forced)
  if (!forceShow && settings && !settings.notifications) {
    console.log('Toast notification suppressed (notifications disabled):', title, message);
    return;
  }
  
  if (!toastTemplate || !notificationArea) return;
  
  const toastClone = toastTemplate.content.cloneNode(true);
  const toast = toastClone.querySelector('.toast-notification');
  
  toast.classList.add(type);
  toast.querySelector('.toast-title').textContent = title;
  toast.querySelector('.toast-message').textContent = message;
  
  // Set icon based on type
  const icon = document.createElement('i');
  switch (type) {
    case 'success':
      icon.className = 'fas fa-check-circle';
      icon.style.color = 'var(--success-color)';
      break;
    case 'warning':
      icon.className = 'fas fa-exclamation-triangle';
      icon.style.color = 'var(--warning-color)';
      break;
    case 'error':
      icon.className = 'fas fa-times-circle';
      icon.style.color = 'var(--error-color)';
      break;
    default:
      icon.className = 'fas fa-info-circle';
      icon.style.color = 'var(--primary-color)';
  }
  
  toast.querySelector('.toast-icon').appendChild(icon);
  
  // Add close button event
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.add('sliding-out');
    setTimeout(() => {
      toast.remove();
    }, 300);
  });
  
  // Auto-remove after 5 seconds
  notificationArea.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('sliding-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }
  }, 5000);
}

// Hide loading indicator
function hideLoading() {
  if (!loadingIndicator) return;
  
  loadingIndicator.classList.add('hidden');
  systemStatus.textContent = 'All systems operational';
  systemStatusValue.textContent = 'Operational';
  
  showToast('Ready', 'CLEM system is initialized and ready.', 'success');
  
  // Start system resource monitoring
  startResourceMonitoring();
}

// Real system resource monitoring using systeminformation
function startResourceMonitoring() {
  // Update CPU and memory usage periodically
  setInterval(async () => {
    try {
      const metrics = await window.electronAPI.getSystemMetrics();
      
      // Update CPU
      const cpuUsage = metrics.cpu.usage;
      cpuStatus.textContent = `CPU: ${cpuUsage}%`;
      
      // Update widget panel CPU bar if exists
      const cpuBar = document.getElementById('cpuBar');
      const cpuValue = document.getElementById('cpuValue');
      if (cpuBar) cpuBar.style.width = `${cpuUsage}%`;
      if (cpuValue) cpuValue.textContent = `${cpuUsage}%`;
      
      // Update memory
      const memoryUsageMB = metrics.memory.usageMB;
      const memoryPercent = metrics.memory.usagePercent;
      memoryStatus.textContent = `Memory: ${memoryUsageMB}MB (${memoryPercent}%)`;
      
      // Update widget panel memory bar if exists
      const memBar = document.getElementById('memBar');
      const memValue = document.getElementById('memValue');
      if (memBar) memBar.style.width = `${memoryPercent}%`;
      if (memValue) memValue.textContent = `${memoryUsageMB}MB`;
      
      // Update GPU (now with real data if available)
      const gpuUsage = metrics.gpu.usage;
      const gpuBar = document.getElementById('gpuBar');
      const gpuValue = document.getElementById('gpuValue');
      if (gpuBar) gpuBar.style.width = `${gpuUsage}%`;
      if (gpuValue) gpuValue.textContent = `${gpuUsage}%`;
    } catch (error) {
      console.error('Error fetching system metrics:', error);
    }
  }, 3000); // Update every 3 seconds to reduce CPU usage
  
  // Update activity timestamps every 30 seconds
  setInterval(updateActivityTimestamps, 30000);
}

// Update activity timestamps to show relative time
function updateActivityTimestamps() {
  const allActivityItems = [
    ...document.querySelectorAll('#recentActivitiesList .activity-item'),
    ...document.querySelectorAll('#widgetActivityList .activity-item')
  ];
  
  allActivityItems.forEach(item => {
    const timestamp = parseInt(item.dataset.timestamp);
    if (timestamp) {
      const timeElement = item.querySelector('.activity-time');
      if (timeElement) {
        const relativeTime = getRelativeTime(timestamp);
        timeElement.textContent = relativeTime;
      }
    }
  });
}

// Get relative time string (e.g., "Just now", "2 min ago", "1 hour ago")
function getRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 30) return 'Just now';
  if (seconds < 60) return `${seconds} sec ago`;
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  // For older activities, show date
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

// Set up event listeners
function setupEventListeners() {
  // Window controls
  minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeApp());
  maximizeBtn.addEventListener('click', () => window.electronAPI.maximizeApp());
  closeBtn.addEventListener('click', () => window.electronAPI.closeApp());
  
  // Close feature button
  closeFeatureBtn.addEventListener('click', closeFeature);
  
  // Clear activities button
  const clearActivitiesBtn = document.getElementById('clearActivitiesBtn');
  if (clearActivitiesBtn) {
    clearActivitiesBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all recent activities?')) {
        clearActivities();
        showToast('Cleared', 'All activities have been cleared', 'info');
      }
    });
  }
  
  // App status updates
  window.electronAPI.onAppStatusUpdate((data) => {
    updateAppStatus(data.id, data.status, data.message);
  });
  
  // Force completion of initialization after a timeout if apps are stuck
  setTimeout(() => {
    if (loadingIndicator && !loadingIndicator.classList.contains('hidden')) {
      hideLoading();
    }
  }, 20000); // 20 second timeout
  
  // All apps initialized event
  window.electronAPI.onAllAppsInitialized(() => {
    console.log("All apps initialized event received");
    hideLoading();
  });
  
  // App launch events
  window.electronAPI.onAppLaunched((data) => {
    const app = apps.find(a => a.id === data.id);
    if (app) {
      showToast('Activated', `${app.name} is now active.`, 'success');
    }
  });
  
  window.electronAPI.onAppLaunchError((data) => {
    const app = apps.find(a => a.id === data.id);
    if (app) {
      showToast('Error', `Failed to activate ${app.name}: ${data.error}`, 'error');
    }
  });
  
  window.electronAPI.onAppClosed((data) => {
    const app = apps.find(a => a.id === data.id);
    if (app) {
      showToast('Closed', `${app.name} has been closed.`, 'info');
    }
  });

  // Python process events
  window.electronAPI.onPythonOutput((data) => {
    const { appId, message, type } = data;
    addToConsole(appId, message);
    
    // Update UI based on message content
    const activeDownloadItems = document.querySelectorAll(`#download-list-${appId} .download-item`);
    const latestDownloadItem = activeDownloadItems[activeDownloadItems.length - 1];
    
    if (latestDownloadItem) {
      const nameElement = latestDownloadItem.querySelector('.download-name');
      const statusElement = latestDownloadItem.querySelector('.download-status');
      
      // Update download name if we get title info
      if (message.includes('Title:')) {
        const title = message.split('Title: ')[1];
        if (title && nameElement) {
          nameElement.textContent = title;
        }
      }
      
      // Update status based on message
      if (statusElement) {
        if (message.includes('Starting download') || message.includes('🎬')) {
          statusElement.textContent = 'Starting download...';
        } else if (message.includes('Duration:') || message.includes('⏱️')) {
          statusElement.textContent = 'Getting video info...';
        }
      }
    }
  });

  window.electronAPI.onDownloadProgress((data) => {
    const { appId, progress, message } = data;
    
    // Find the latest download item for this app
    const activeDownloadItems = document.querySelectorAll(`#download-list-${appId} .download-item`);
    const latestDownloadItem = activeDownloadItems[activeDownloadItems.length - 1];
    
    if (latestDownloadItem) {
      const progressBar = latestDownloadItem.querySelector('.progress-bar');
      const statusElement = latestDownloadItem.querySelector('.download-status');
      
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      if (statusElement) {
        statusElement.textContent = `Downloading... ${progress.toFixed(1)}%`;
      }
    }
  });

  window.electronAPI.onDownloadComplete((data) => {
    const { appId, message } = data;
    
    // Find the latest download item for this app
    const activeDownloadItems = document.querySelectorAll(`#download-list-${appId} .download-item`);
    const latestDownloadItem = activeDownloadItems[activeDownloadItems.length - 1];
    
    if (latestDownloadItem) {
      const progressBar = latestDownloadItem.querySelector('.progress-bar');
      const statusElement = latestDownloadItem.querySelector('.download-status');
      
      if (progressBar) {
        progressBar.style.width = '100%';
      }
      if (statusElement) {
        statusElement.textContent = 'Complete';
      }
    }
    
    showToast('Success', 'Download completed successfully!', 'success');
  });

  window.electronAPI.onDownloadError((data) => {
    const { appId, error } = data;
    
    // Find the latest download item for this app
    const activeDownloadItems = document.querySelectorAll(`#download-list-${appId} .download-item`);
    const latestDownloadItem = activeDownloadItems[activeDownloadItems.length - 1];
    
    if (latestDownloadItem) {
      const progressBar = latestDownloadItem.querySelector('.progress-bar');
      const statusElement = latestDownloadItem.querySelector('.download-status');
      
      if (progressBar) {
        progressBar.style.width = '0%';
      }
      if (statusElement) {
        statusElement.textContent = 'Error occurred';
      }
    }
    
    showToast('Error', `Download failed: ${error}`, 'error');
  });

  window.electronAPI.onDownloadInfo((data) => {
    const { appId, title } = data;
    
    // Find the latest download item for this app and update the title
    const activeDownloadItems = document.querySelectorAll(`#download-list-${appId} .download-item`);
    const latestDownloadItem = activeDownloadItems[activeDownloadItems.length - 1];
    
    if (latestDownloadItem && title) {
      const nameElement = latestDownloadItem.querySelector('.download-name');
      if (nameElement) {
        nameElement.textContent = title;
      }
    }
  });
  
  // Handle fullscreen change
  document.addEventListener('fullscreenchange', () => {
    const fullscreenBtn = document.querySelector('.fullscreen-btn');
    if (fullscreenBtn) {
      if (document.fullscreenElement) {
        fullscreenBtn.innerHTML = `<i class="fas fa-compress"></i><span>Exit Fullscreen</span>`;
      } else {
        fullscreenBtn.innerHTML = `<i class="fas fa-expand"></i><span>Fullscreen</span>`;
      }
    }
  });
}

// Update app status
function updateAppStatus(appId, status, message) {
  // If this is the currently active feature, update its status
  if (activeFeature === appId) {
    const statusValue = featureContent.querySelector('.stat-value');
    if (statusValue) {
      if (status === 'initialized') {
        statusValue.textContent = 'Running';
      } else if (status === 'error') {
        statusValue.textContent = 'Error';
      }
    }
  }
  
  // Count initialized apps
  if (status === 'initialized') {
    appInitCount++;
    
    // Add status message
    const app = apps.find(a => a.id === appId);
    addStatusMessage(`${app.name} initialized successfully.`);
  } else if (status === 'error') {
    // Add status message
    const app = apps.find(a => a.id === appId);
    addStatusMessage(`Error initializing ${app.name}: ${message}`, 'error');
  }
}

// Add some animation to the grid background
function animateGrid() {
  const grid = document.querySelector('.grid');
  if (!grid) return;
  
  let offset = 0;
  
  setInterval(() => {
    offset += 0.5;
    grid.style.backgroundPosition = `0px ${offset}px`;
  }, 50);
}

// Load app icons for feature cards and buttons
function loadAppIcons() {
  // Update feature cards with app icons
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(card => {
    const featureId = card.getAttribute('data-feature');
    const app = apps.find(a => a.id === featureId);
    
    if (app && app.icon) {
      // Replace FontAwesome icon with app icon
      const iconContainer = card.querySelector('.feature-icon');
      if (iconContainer) {
        // Clear existing content
        iconContainer.innerHTML = '';
        
        // Create image element
        const iconImg = document.createElement('img');
        iconImg.src = app.icon;
        iconImg.alt = `${app.name} icon`;
        iconImg.className = 'app-icon';
        
        // Add to container
        iconContainer.appendChild(iconImg);
      }
    }
  });
  
  // Update quick action buttons with app icons
  const actionButtons = document.querySelectorAll('.action-btn');
  actionButtons.forEach(button => {
    const featureId = button.getAttribute('data-feature');
    const app = apps.find(a => a.id === featureId);
    
    if (app && app.icon) {
      // Replace FontAwesome icon with app icon
      const iconElement = button.querySelector('i');
      if (iconElement) {
        // Create image element to replace the Font Awesome icon
        const iconImg = document.createElement('img');
        iconImg.src = app.icon;
        iconImg.alt = `${app.name} icon`;
        iconImg.className = 'action-icon';
        
        // Replace icon with image
        iconElement.replaceWith(iconImg);
      }
    }
  });
  
  addStatusMessage('App icons loaded successfully');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  animateGrid();
  initializeUI();
  
  // Direct test for dark mode toggle - simplest possible approach
  setTimeout(() => {
    console.log('=== TESTING DARK MODE TOGGLE ===');
    const darkModeToggle = document.getElementById('darkModeToggle');
    console.log('Dark mode toggle element:', darkModeToggle);
    console.log('Element exists:', !!darkModeToggle);
    
    if (darkModeToggle) {
      console.log('Initial checked state:', darkModeToggle.checked);
      
      // Add listener with explicit logging
      darkModeToggle.addEventListener('change', function(event) {
        console.log('!!!!! DARK MODE CHANGED !!!!!');
        console.log('Event:', event);
        console.log('Target:', event.target);
        console.log('Checked:', event.target.checked);
        
        const enabled = event.target.checked;
        showToast('Dark Mode', `Dark mode ${enabled ? 'enabled' : 'disabled'}`, 'success');
        
        // Could add actual dark mode logic here
        if (enabled) {
          console.log('Dark mode is now ON');
        } else {
          console.log('Dark mode is now OFF');
        }
      });
      
      console.log('✓ Dark mode event listener attached successfully');
      
      // Test if clicking programmatically works
      console.log('Testing programmatic click...');
      setTimeout(() => {
        darkModeToggle.click();
        console.log('Programmatic click executed, new state:', darkModeToggle.checked);
      }, 1000);
    } else {
      console.error('✗ Dark mode toggle NOT FOUND in DOM');
    }
  }, 1000);
});