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
  
  // Show the feature viewer - hide sections, let viewer fill space naturally
  featureTitle.textContent = app.name;
  document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
  document.querySelector('.content').classList.add('has-viewer');
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
    // Phone Info uses a form-based UI; skip auto-launch
    if (featureId === 'phone-info') {
      showToast('Ready', 'Phone Info ready. Enter a phone number to look up.', 'info');
      featureContent.innerHTML = '';
      const contentContainer = document.createElement('div');
      contentContainer.className = 'feature-content-container';
      contentContainer.innerHTML = `
        <div class="embedded-app-interface">
          <div class="app-header">
            <h3>Phone Number Intelligence</h3>
            <div class="app-status">
              <i class="fas fa-circle status-indicator" id="phone-info-status-dot"></i>
              <span id="phone-info-status-text">Ready</span>
            </div>
          </div>
          <div class="app-content">
            <div class="connection-section">
              <div class="connection-status">
                <i class="fas fa-mobile-alt"></i>
                <h4>Phone Number Lookup</h4>
                <p>Enter a phone number in international format (e.g. +15551234567)</p>
                <div class="connection-buttons" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <input type="text" id="phone-number-input" placeholder="+15551234567"
                    style="flex:1;padding:8px 12px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:14px;min-width:200px;" />
                  <button class="connection-btn phone-lookup-btn" id="phone-lookup-btn">
                    <i class="fas fa-search"></i>
                    Look Up
                  </button>
                </div>
              </div>
            </div>
            <div class="app-console">
              <div class="console-header">
                <h4>Results</h4>
                <button class="console-clear-btn">
                  <i class="fas fa-trash"></i>
                  Clear
                </button>
              </div>
              <div class="console-content" id="app-console-phone-info">
                <div class="console-line">
                  <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
                  <span class="message">Phone Info ready. Enter a number and click Look Up.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      featureContent.appendChild(contentContainer);

      // Wire lookup button
      const lookupBtn = contentContainer.querySelector('#phone-lookup-btn');
      const phoneInput = contentContainer.querySelector('#phone-number-input');
      const statusDot = contentContainer.querySelector('#phone-info-status-dot');
      const statusText = contentContainer.querySelector('#phone-info-status-text');

      const doLookup = async () => {
        const number = phoneInput.value.trim();
        if (!number) {
          showToast('Error', 'Please enter a phone number', 'error');
          return;
        }
        lookupBtn.disabled = true;
        lookupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Looking up...';
        statusDot.className = 'fas fa-circle status-indicator running';
        statusText.textContent = 'Running';
        addToConsole('phone-info', `Looking up: ${number}`);
        await window.electronAPI.startPythonApp('phone-info', [number]);
      };

      lookupBtn.addEventListener('click', doLookup);
      phoneInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doLookup();
      });

      // Console clear
      const consoleClearBtn = contentContainer.querySelector('.console-clear-btn');
      if (consoleClearBtn) {
        consoleClearBtn.addEventListener('click', () => {
          const consoleContent = contentContainer.querySelector('#app-console-phone-info');
          if (consoleContent) {
            consoleContent.innerHTML = `
              <div class="console-line">
                <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
                <span class="message">Console cleared</span>
              </div>`;
          }
        });
      }
      return;
    }

    // Face Scanner uses a pre-launch profile form instead of tkinter dialogs
    if (featureId === 'face-scanner') {
      showToast('Ready', 'Fill in the profile details to begin face scanning.', 'info');
      featureContent.innerHTML = '';
      const contentContainer = document.createElement('div');
      contentContainer.className = 'feature-content-container';
      contentContainer.innerHTML = `
        <div class="embedded-app-interface">
          <div class="app-header">
            <h3>Face Scanner - New Profile</h3>
            <div class="app-status">
              <i class="fas fa-circle status-indicator" id="face-scanner-status-dot"></i>
              <span id="face-scanner-status-text">Ready</span>
            </div>
          </div>
          <div class="app-content" style="overflow-y:auto;max-height:calc(100vh - 260px);">
            <div class="connection-section">
              <div class="connection-status">
                <i class="fas fa-user-plus"></i>
                <h4>Profile Details</h4>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;text-align:left;">
                  <div>
                    <label style="font-size:12px;color:#aaa;">Full Name *</label>
                    <input type="text" id="fs-name" placeholder="e.g. John Doe"
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:13px;box-sizing:border-box;" />
                  </div>
                  <div>
                    <label style="font-size:12px;color:#aaa;">Age</label>
                    <input type="number" id="fs-age" value="25" min="1" max="120"
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:13px;box-sizing:border-box;" />
                  </div>
                  <div>
                    <label style="font-size:12px;color:#aaa;">Gender</label>
                    <select id="fs-gender"
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:13px;box-sizing:border-box;">
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size:12px;color:#aaa;">Occupation</label>
                    <input type="text" id="fs-occupation" placeholder="e.g. Engineer"
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:13px;box-sizing:border-box;" />
                  </div>
                  <div>
                    <label style="font-size:12px;color:#aaa;">Nationality</label>
                    <input type="text" id="fs-nationality" placeholder="e.g. USA"
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:13px;box-sizing:border-box;" />
                  </div>
                  <div>
                    <label style="font-size:12px;color:#aaa;">Status</label>
                    <select id="fs-status"
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:13px;box-sizing:border-box;">
                      <option>CIVILIAN</option><option>PERSON OF INTEREST</option>
                      <option>UNDER SURVEILLANCE</option><option>WANTED</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size:12px;color:#aaa;">Threat Level</label>
                    <select id="fs-threat"
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:13px;box-sizing:border-box;">
                      <option>LOW</option><option>MODERATE</option><option>HIGH</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size:12px;color:#aaa;">Auto-Capture</label>
                    <select id="fs-auto"
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:13px;box-sizing:border-box;">
                      <option>Yes</option><option>No</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size:12px;color:#aaa;">Capture Interval (s)</label>
                    <input type="number" id="fs-interval" value="3.0" min="0.5" step="0.5"
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:13px;box-sizing:border-box;" />
                  </div>
                  <div>
                    <label style="font-size:12px;color:#aaa;">Target Image Count</label>
                    <input type="number" id="fs-count" value="10" min="1" max="100"
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:13px;box-sizing:border-box;" />
                  </div>
                  <div style="grid-column:1/-1;">
                    <label style="font-size:12px;color:#aaa;">Notes</label>
                    <textarea id="fs-notes" rows="2" placeholder="Additional notes..."
                      style="width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#1e1e2e;color:#fff;font-size:13px;box-sizing:border-box;resize:vertical;"></textarea>
                  </div>
                </div>
                <div style="margin-top:14px;">
                  <button class="connection-btn" id="face-scanner-start-btn" style="width:100%;">
                    <i class="fas fa-play"></i> Start Face Scanner
                  </button>
                </div>
              </div>
            </div>
            <div class="app-console">
              <div class="console-header">
                <h4>Output</h4>
                <button class="console-clear-btn">
                  <i class="fas fa-trash"></i> Clear
                </button>
              </div>
              <div class="console-content" id="app-console-face-scanner">
                <div class="console-line">
                  <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
                  <span class="message">Fill in the profile details and click Start Face Scanner. A camera window will open.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      featureContent.appendChild(contentContainer);

      const startBtn = contentContainer.querySelector('#face-scanner-start-btn');
      const statusDot = contentContainer.querySelector('#face-scanner-status-dot');
      const statusText = contentContainer.querySelector('#face-scanner-status-text');

      startBtn.addEventListener('click', async () => {
        const name = contentContainer.querySelector('#fs-name').value.trim();
        if (!name) {
          showToast('Error', 'Please enter a name for the profile.', 'error');
          return;
        }

        const profile = {
          name,
          age: contentContainer.querySelector('#fs-age').value,
          gender: contentContainer.querySelector('#fs-gender').value,
          occupation: contentContainer.querySelector('#fs-occupation').value || 'Unknown',
          nationality: contentContainer.querySelector('#fs-nationality').value || 'Unknown',
          status: contentContainer.querySelector('#fs-status').value,
          threat_level: contentContainer.querySelector('#fs-threat').value,
          notes: contentContainer.querySelector('#fs-notes').value || 'Profile created via CLEM.'
        };

        const settings = {
          auto_capture: contentContainer.querySelector('#fs-auto').value,
          interval: contentContainer.querySelector('#fs-interval').value,
          target_count: contentContainer.querySelector('#fs-count').value
        };

        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
        statusDot.className = 'fas fa-circle status-indicator running';
        statusText.textContent = 'Running';
        addToConsole('face-scanner', `Starting face scan for: ${name}`);

        const ok = await window.electronAPI.startPythonApp('face-scanner', [
          JSON.stringify(profile),
          JSON.stringify(settings)
        ]);

        if (!ok) {
          startBtn.disabled = false;
          startBtn.innerHTML = '<i class="fas fa-play"></i> Start Face Scanner';
          statusDot.className = 'fas fa-circle status-indicator';
          statusText.textContent = 'Ready';
          return;
        }

        // Switch to camera view
        const targetCount = parseInt(settings.target_count) || 10;
        featureContent.innerHTML = '';
        featureContent.style.padding = '0';
        featureContent.innerHTML = `
          <div style="display:flex;flex-direction:column;height:100%;background:var(--vision-bg-primary);border-radius:var(--radius-2xl);overflow:hidden;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="font-weight:600;font-size:15px;">Face Scanner — ${name}</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <i class="fas fa-circle" style="color:#2ecc71;font-size:8px;"></i>
                <span style="font-size:13px;color:#aaa;" id="fs-live-status">Initializing...</span>
              </div>
            </div>
            <div style="position:relative;flex:1;background:#000;min-height:0;">
              <canvas id="face-scanner-canvas" style="width:100%;height:100%;display:block;object-fit:contain;"></canvas>
              <div id="fs-loading-overlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0a;color:#aaa;gap:12px;">
                <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
                <span>Opening camera...</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:16px;padding:8px 16px;border-top:1px solid rgba(255,255,255,0.06);font-size:13px;color:#aaa;">
              <span id="fs-stat-faces">Faces: 0</span>
              <span style="opacity:0.3;">|</span>
              <span id="fs-stat-fps">FPS: 0</span>
              <span style="opacity:0.3;">|</span>
              <span id="fs-stat-captured" style="color:#4af;">Captured: 0/${targetCount}</span>
              <span style="opacity:0.3;">|</span>
              <span id="fs-stat-auto" style="color:#2ecc71;">Auto: ${settings.auto_capture === 'Yes' ? 'ON' : 'OFF'}</span>
            </div>
            <div style="display:flex;gap:8px;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);">
              <button id="fs-btn-capture" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(74,144,255,0.15);color:#fff;cursor:pointer;font-size:13px;">
                <i class="fas fa-camera"></i> Capture
              </button>
              <button id="fs-btn-toggle-auto" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(46,204,113,0.15);color:#fff;cursor:pointer;font-size:13px;">
                <i class="fas fa-sync"></i> Toggle Auto
              </button>
              <button id="fs-btn-stop" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(231,76,60,0.15);color:#fff;cursor:pointer;font-size:13px;">
                <i class="fas fa-stop"></i> Stop
              </button>
            </div>
            <div style="padding:0 16px 10px;">
              <div class="console-content" id="app-console-face-scanner" style="max-height:80px;font-size:11px;"></div>
            </div>
          </div>
        `;

        // Wire control buttons
        document.getElementById('fs-btn-capture').addEventListener('click', () => {
          window.electronAPI.sendInput('face-scanner', 'CAPTURE');
        });
        document.getElementById('fs-btn-toggle-auto').addEventListener('click', () => {
          window.electronAPI.sendInput('face-scanner', 'TOGGLE_AUTO');
        });
        document.getElementById('fs-btn-stop').addEventListener('click', () => {
          window.electronAPI.sendInput('face-scanner', 'QUIT');
        });

        // Render frames from Python onto the canvas
        const canvas = document.getElementById('face-scanner-canvas');
        const ctx = canvas.getContext('2d');
        window.electronAPI.removeAllListeners('python-frame');
        window.electronAPI.onPythonFrame((data) => {
          if (data.appId !== 'face-scanner') return;
          const overlay = document.getElementById('fs-loading-overlay');
          if (overlay) overlay.style.display = 'none';
          const img = new Image();
          img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
          };
          img.src = 'data:image/jpeg;base64,' + data.frame;
        });
      });

      const consoleClearBtn = contentContainer.querySelector('.console-clear-btn');
      if (consoleClearBtn) {
        consoleClearBtn.addEventListener('click', () => {
          const consoleEl = contentContainer.querySelector('#app-console-face-scanner');
          if (consoleEl) consoleEl.innerHTML = `<div class="console-line"><span class="timestamp">[${new Date().toLocaleTimeString()}]</span><span class="message">Console cleared</span></div>`;
        });
      }
      return;
    }

    // Emotions: launch app then stream camera + emotion bar chart in-app
    if (featureId === 'emotions') {
      showToast('Ready', 'Starting Emotion Recognition...', 'info');
      featureContent.innerHTML = '';
      featureContent.style.padding = '0';

      const LABELS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise'];
      const COLORS = {
        angry:'#e74c3c', disgust:'#8e44ad', fear:'#e67e22',
        happy:'#2ecc71', neutral:'#95a5a6', sad:'#3498db', surprise:'#f1c40f'
      };

      featureContent.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%;background:var(--vision-bg-primary);border-radius:var(--radius-2xl);overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="font-weight:600;font-size:15px;">Emotion Recognition</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-circle" style="color:#2ecc71;font-size:8px;" id="em-dot"></i>
              <span style="font-size:13px;color:#aaa;" id="em-status-text">Initializing...</span>
            </div>
          </div>
          <div style="display:flex;flex:1;min-height:0;gap:0;">
            <div style="position:relative;flex:1;background:#000;min-height:0;">
              <canvas id="em-canvas" style="width:100%;height:100%;display:block;object-fit:contain;"></canvas>
              <div id="em-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0a;color:#aaa;gap:12px;">
                <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
                <span>Loading model &amp; opening camera...</span>
              </div>
            </div>
            <div style="width:200px;padding:16px 12px;border-left:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:10px;overflow:hidden;">
              <div style="font-size:12px;color:#aaa;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">Emotion Probabilities</div>
              <div id="em-top-label" style="font-size:22px;font-weight:700;text-align:center;margin-bottom:8px;color:#fff;">—</div>
              ${LABELS.map(l => `
                <div style="display:flex;flex-direction:column;gap:3px;">
                  <div style="display:flex;justify-content:space-between;font-size:11px;">
                    <span style="color:${COLORS[l] || '#aaa'};text-transform:capitalize;">${l}</span>
                    <span id="em-pct-${l}" style="color:#aaa;">0%</span>
                  </div>
                  <div style="background:rgba(255,255,255,0.07);border-radius:4px;height:6px;overflow:hidden;">
                    <div id="em-bar-${l}" style="height:100%;width:0%;background:${COLORS[l] || '#aaa'};border-radius:4px;transition:width 0.15s ease;"></div>
                  </div>
                </div>`).join('')}
              <div style="margin-top:auto;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#555;" id="em-fps-stat">FPS: —</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);">
            <button id="em-btn-stop" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(231,76,60,0.15);color:#fff;cursor:pointer;font-size:13px;">
              <i class="fas fa-stop"></i> Stop
            </button>
          </div>
          <div style="padding:0 16px 8px;">
            <div class="console-content" id="app-console-emotions" style="max-height:60px;font-size:11px;"></div>
          </div>
        </div>
      `;

      // Launch the app
      const ok = await window.electronAPI.startPythonApp('emotions', []);
      if (!ok) {
        addToConsole('emotions', 'Failed to start emotion recognition.');
        return;
      }

      document.getElementById('em-btn-stop').addEventListener('click', () => {
        window.electronAPI.sendInput('emotions', 'QUIT');
      });

      const canvas = document.getElementById('em-canvas');
      const ctx = canvas.getContext('2d');

      window.electronAPI.removeAllListeners('python-frame');
      window.electronAPI.onPythonFrame((data) => {
        if (data.appId !== 'emotions') return;
        const overlay = document.getElementById('em-loading');
        if (overlay) overlay.style.display = 'none';
        const img = new Image();
        img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
        };
        img.src = 'data:image/jpeg;base64,' + data.frame;
      });

      return;
    }

    // Facial Analysis: stream camera + health metrics panel in-app
    if (featureId === 'analyse') {
      showToast('Ready', 'Starting Facial Analysis...', 'info');
      featureContent.innerHTML = '';
      featureContent.style.padding = '0';

      featureContent.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%;background:var(--vision-bg-primary);border-radius:var(--radius-2xl);overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="font-weight:600;font-size:15px;">Facial Health Analysis</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-circle" style="color:#2ecc71;font-size:8px;" id="fa-dot"></i>
              <span style="font-size:13px;color:#aaa;" id="fa-status-text">Initializing...</span>
            </div>
          </div>
          <div style="display:flex;flex:1;min-height:0;gap:0;">
            <div style="position:relative;flex:1;background:#000;min-height:0;">
              <canvas id="fa-canvas" style="width:100%;height:100%;display:block;object-fit:contain;"></canvas>
              <div id="fa-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0a;color:#aaa;gap:12px;">
                <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
                <span>Loading model &amp; opening camera...</span>
              </div>
            </div>
            <div style="width:220px;padding:16px 12px;border-left:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:10px;overflow:hidden;">
              <div style="font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:0.05em;">Health Metrics</div>

              <div style="display:flex;flex-direction:column;align-items:center;padding:12px;background:rgba(255,255,255,0.05);border-radius:10px;gap:4px;">
                <div style="font-size:32px;font-weight:700;color:#7af;" id="fa-score">—</div>
                <div style="font-size:11px;color:#aaa;">/10 Health Score</div>
                <div style="font-size:13px;font-weight:600;color:#2ecc71;" id="fa-health-status">Analyzing...</div>
              </div>

              <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;">
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:#aaa;">Symmetry</span>
                  <span id="fa-symmetry" style="color:#fff;">—</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:#aaa;">Eye Fatigue</span>
                  <span id="fa-eye-fatigue" style="color:#fff;">—</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:#aaa;">Skin Texture</span>
                  <span id="fa-skin-texture" style="color:#fff;">—</span>
                </div>
              </div>

              <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">
                <div style="font-size:11px;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Recommendations</div>
                <div id="fa-recs" style="font-size:11px;color:#ccc;line-height:1.5;">—</div>
              </div>

              <div style="margin-top:auto;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#555;" id="fa-fps">FPS: —</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);">
            <button id="fa-btn-capture" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(46,204,113,0.15);color:#fff;cursor:pointer;font-size:13px;">
              <i class="fas fa-camera"></i> Capture
            </button>
            <button id="fa-btn-stop" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(231,76,60,0.15);color:#fff;cursor:pointer;font-size:13px;">
              <i class="fas fa-stop"></i> Stop
            </button>
          </div>
          <div style="padding:0 16px 8px;">
            <div class="console-content" id="app-console-analyse" style="max-height:60px;font-size:11px;"></div>
          </div>
        </div>
      `;

      const ok = await window.electronAPI.startPythonApp('analyse', ['--method', 'opencv']);
      if (!ok) {
        addToConsole('analyse', 'Failed to start facial analysis.');
        return;
      }

      document.getElementById('fa-btn-capture').addEventListener('click', () => {
        window.electronAPI.sendInput('analyse', 'CAPTURE');
        const btn = document.getElementById('fa-btn-capture');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }
        setTimeout(() => {
          const b = document.getElementById('fa-btn-capture');
          if (b) { b.disabled = false; b.innerHTML = '<i class="fas fa-camera"></i> Capture'; }
        }, 3000);
      });

      document.getElementById('fa-btn-stop').addEventListener('click', () => {
        window.electronAPI.sendInput('analyse', 'QUIT');
      });

      const canvas = document.getElementById('fa-canvas');
      const ctx = canvas.getContext('2d');

      window.electronAPI.removeAllListeners('python-frame');
      window.electronAPI.onPythonFrame((data) => {
        if (data.appId !== 'analyse') return;
        const overlay = document.getElementById('fa-loading');
        if (overlay) overlay.style.display = 'none';
        const img = new Image();
        img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
        };
        img.src = 'data:image/jpeg;base64,' + data.frame;
      });

      return;
    }

    // Health Report: read JSON files directly and render in-app UI
    if (featureId === 'health-report') {
      showToast('Loading', 'Loading health reports...', 'info');
      featureContent.innerHTML = '';
      const contentContainer = document.createElement('div');
      contentContainer.className = 'feature-content-container';
      featureContent.appendChild(contentContainer);

      // Delegated back-button handler (robust regardless of innerHTML timing)
      contentContainer.addEventListener('click', e => {
        if (e.target.closest && e.target.closest('#hr-back-btn')) renderHealthReportList();
      });

      async function renderHealthReportList() {
        const reports = await window.electronAPI.listHealthReports();
        if (!reports || reports.length === 0) {
          contentContainer.innerHTML = `
            <div class="embedded-app-interface">
              <div class="app-header"><h3>Health Reports</h3></div>
              <div class="app-content" style="display:flex;align-items:center;justify-content:center;height:200px;color:#aaa;">
                <div style="text-align:center;">
                  <i class="fas fa-file-medical" style="font-size:48px;opacity:0.3;display:block;margin-bottom:16px;"></i>
                  <p>No health reports found. Run a Facial Analysis first.</p>
                </div>
              </div>
            </div>`;
          return;
        }

        const listHTML = reports.map((r, i) => {
          const date = new Date(r.mtime).toLocaleString();
          const kb = (r.size / 1024).toFixed(1);
          const isComplete = r.name.startsWith('complete_');
          const badge = isComplete
            ? `<span style="background:rgba(0,200,100,0.15);border:0.5px solid rgba(0,200,100,0.4);color:#0c8;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">COMPLETE</span>`
            : `<span style="background:rgba(0,122,255,0.15);border:0.5px solid rgba(0,122,255,0.4);color:#48f;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">FACIAL</span>`;
          return `
            <div class="health-report-row" data-path="${r.path.replace(/\\/g,'\\\\')}" data-idx="${i}"
              style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:8px;
                     border:0.5px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);
                     cursor:pointer;transition:all 0.2s;margin-bottom:6px;">
              <i class="fas fa-file-medical-alt" style="font-size:20px;color:#7af;flex-shrink:0;"></i>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;color:#eee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.name}</div>
                <div style="font-size:11px;color:#888;margin-top:2px;">${date} &bull; ${kb} KB</div>
              </div>
              ${badge}
              <i class="fas fa-chevron-right" style="color:#555;font-size:12px;flex-shrink:0;"></i>
            </div>`;
        }).join('');

        contentContainer.innerHTML = `
          <div class="embedded-app-interface">
            <div class="app-header">
              <h3><i class="fas fa-heartbeat" style="margin-right:8px;color:#f66;"></i>Health Reports</h3>
              <span style="font-size:12px;color:#888;">${reports.length} report${reports.length !== 1 ? 's' : ''} found</span>
            </div>
            <div class="app-content" style="overflow-y:auto;max-height:calc(100vh - 220px);">
              <div style="padding:16px;">${listHTML}</div>
            </div>
          </div>`;

        // Wire click handlers
        contentContainer.querySelectorAll('.health-report-row').forEach(row => {
          row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,0.08)'; row.style.borderColor = 'rgba(0,122,255,0.3)'; });
          row.addEventListener('mouseleave', () => { row.style.background = 'rgba(255,255,255,0.04)'; row.style.borderColor = 'rgba(255,255,255,0.08)'; });
          row.addEventListener('click', () => renderHealthReportDetail(row.dataset.path));
        });
      }

      async function renderHealthReportDetail(filePath) {
        const data = await window.electronAPI.readHealthReport(filePath);
        if (!data) {
          showToast('Error', 'Failed to read report file.', 'error');
          return;
        }

        const records = Array.isArray(data) ? data : [data];
        const fileName = filePath.replace(/\\/g, '/').split('/').pop();

        function scoreColor(score) {
          if (score >= 8) return '#0c8';
          if (score >= 6) return '#fa0';
          return '#f44';
        }

        function renderRecord(rec, idx) {
          const score  = rec.overall_health_score ?? rec.health_score ?? 0;
          const status = rec.overall_health_status ?? rec.health_status ?? '--';
          const ts     = rec.timestamp ?? '--';
          const recs   = rec.recommendations ?? [];
          const ha     = (rec.facial_analysis ?? {}).health_analysis ?? {};
          const cats   = rec.category_scores ?? {};
          const raw    = rec.raw_data ?? {};

          const sc = v => typeof v === 'number' ? v.toFixed(2) : (v ?? '--');
          const pct = (v, max=10) => Math.round((v/max)*100);

          const row = (label, val, unit='') => val != null && val !== '' ? `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:0.5px solid rgba(255,255,255,0.06);">
              <span style="color:#999;font-size:12px;">${label}</span>
              <span style="color:#eee;font-size:12px;font-weight:500;">${typeof val==='number'?val.toFixed(3):val}${unit?' '+unit:''}</span>
            </div>` : '';

          const catBar = (label, val, color='#7af') => {
            if (val == null) return '';
            const p = pct(val);
            return `<div style="margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:12px;color:#ccc;">${label}</span>
                <span style="font-size:12px;font-weight:600;color:${scoreColor(val)};">${val}/10</span>
              </div>
              <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
                <div style="height:100%;width:${p}%;background:${scoreColor(val)};border-radius:3px;transition:width 0.4s;"></div>
              </div>
            </div>`;
          };

          const sectionHead = t => `<div style="font-size:11px;color:#7af;text-transform:uppercase;letter-spacing:0.07em;font-weight:700;margin:14px 0 8px;">${t}</div>`;

          // Category scores section
          const catSection = (cats.symmetry!=null||cats.fatigue!=null) ? `
            ${sectionHead('Category Scores')}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">
              ${catBar('Symmetry',    cats.symmetry)}
              ${catBar('Fatigue',     cats.fatigue)}
              ${catBar('Stress',      cats.stress)}
              ${catBar('Skin',        cats.skin)}
              ${catBar('Structural',  cats.structural)}
              ${catBar('Circulation',cats.circulation)}
            </div>` : '';

          // Symmetry section
          const symSection = ha.facial_symmetry != null ? `
            ${sectionHead('Symmetry Analysis')}
            ${row('Overall Symmetry',      ha.facial_symmetry)}
            ${row('Evaluation',            ha.symmetry_evaluation)}
            ${row('Eye Level Symmetry',    ha.eyes_level_symmetry)}
            ${row('Nose Deviation',        ha.nose_deviation)}
            ${row('Chin Deviation',        ha.chin_deviation)}
            ${ha.note_symmetry    ? `<div style="font-size:11px;color:#fa8;padding:6px 0;">${ha.note_symmetry}</div>` : ''}
            ${ha.jaw_alignment_note ? `<div style="font-size:11px;color:#fa8;padding:4px 0;">${ha.jaw_alignment_note}</div>` : ''}` : '';

          // Eye & Fatigue section
          const eyeSection = ha.eye_fatigue ? `
            ${sectionHead('Eye & Fatigue')}
            ${row('Fatigue Level',    ha.eye_fatigue)}
            ${row('Avg Eye Aspect Ratio', ha.eye_aspect_ratio)}
            ${row('Left EAR',         ha.left_ear)}
            ${row('Right EAR',        ha.right_ear)}
            ${row('EAR Asymmetry',    ha.ear_asymmetry)}
            ${row('L Eye Openness',   ha.left_eye_openness_px,  'px')}
            ${row('R Eye Openness',   ha.right_eye_openness_px, 'px')}
            ${row('Brow Height Ratio',ha.brow_height_ratio)}
            ${ha.eye_health_note      ? `<div style="font-size:11px;color:#fa8;padding:4px 0;">${ha.eye_health_note}</div>` : ''}
            ${ha.ear_asymmetry_note   ? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.ear_asymmetry_note}</div>` : ''}
            ${ha.brow_position_note   ? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.brow_position_note}</div>` : ''}` : '';

          // Stress section
          const stressSection = ha.stress_level ? `
            ${sectionHead('Stress & Tension')}
            ${row('Stress Level',       ha.stress_level)}
            ${row('Composite Score',    ha.stress_composite)}
            ${row('Inner Brow Distance',ha.inner_brow_distance)}
            ${row('Brow Asymmetry',     ha.brow_asymmetry)}
            ${row('Brow Arch',          ha.brow_arch)}
            ${row('Mouth Aspect Ratio', ha.mouth_aspect_ratio)}
            ${row('Smile Index',        ha.smile_index)}
            ${row('Jaw Angle',          ha.jaw_angle, 'deg')}
            ${ha.stress_note     ? `<div style="font-size:11px;color:#fa8;padding:4px 0;">${ha.stress_note}</div>` : ''}
            ${ha.brow_furrow_note? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.brow_furrow_note}</div>` : ''}
            ${ha.lip_tension_note? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.lip_tension_note}</div>` : ''}
            ${ha.jaw_tension_note? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.jaw_tension_note}</div>` : ''}
            ${ha.mouth_expression? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.mouth_expression}</div>` : ''}` : '';

          // Skin section
          const skinRegions = ha.skin_regions_summary
            ? Object.entries(ha.skin_regions_summary).map(([name,r]) =>
                `<div style="padding:6px 0;border-bottom:0.5px solid rgba(255,255,255,0.05);">
                  <div style="font-size:11px;font-weight:600;color:#7cf;text-transform:capitalize;margin-bottom:3px;">${name.replace('_',' ')}</div>
                  ${row('Brightness', r.brightness)} ${row('Redness', r.redness)} ${row('Yellowness', r.yellowness)} ${row('Texture', r.texture)}
                </div>`).join('') : '';

          const skinSection = ha.skin_texture != null || ha.skin_tone_note ? `
            ${sectionHead('Skin Health')}
            ${row('Skin Texture',    ha.skin_texture)}
            ${row('Brightness',      ha.skin_brightness ?? ha.avg_skin_brightness)}
            ${row('Saturation',      ha.skin_saturation)}
            ${row('Peak Redness',    ha.peak_redness)}
            ${row('Avg Yellowness',  ha.avg_yellowness)}
            ${row('Skin Uniformity', ha.skin_uniformity)}
            ${row('Hydration Est.',  ha.skin_hydration_estimate)}
            ${ha.skin_tone_note     ? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.skin_tone_note}</div>` : ''}
            ${ha.texture_note       ? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.texture_note}</div>` : ''}
            ${ha.pallor_screen      ? `<div style="font-size:11px;color:#fa8;padding:4px 0;">${ha.pallor_screen}</div>` : ''}
            ${ha.jaundice_screen    ? `<div style="font-size:11px;color:#fa8;padding:4px 0;">${ha.jaundice_screen}</div>` : ''}
            ${ha.redness_note       ? `<div style="font-size:11px;color:#fa8;padding:4px 0;">${ha.redness_note}</div>` : ''}
            ${ha.hydration_note     ? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.hydration_note}</div>` : ''}
            ${ha.uniformity_note    ? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.uniformity_note}</div>` : ''}
            ${skinRegions ? `<div style="margin-top:8px;font-size:11px;color:#777;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Regional Breakdown</div>${skinRegions}` : ''}` : '';

          // Structure section
          const structSection = ha.face_shape ? `
            ${sectionHead('Structural Harmony')}
            ${row('Face Shape',          ha.face_shape)}
            ${row('Golden Ratio Harmony',ha.golden_ratio_harmony)}
            ${row('Golden Ratio Diff',   ha.golden_ratio_diff)}
            ${row('Eye Spacing Ratio',   ha.eye_spacing_ratio)}
            ${row('Jaw Width Ratio',     ha.jaw_width_ratio)}
            ${row('Chin Height Ratio',   ha.chin_height_ratio)}
            ${row('Nose Width Ratio',    ha.nose_width_ratio)}
            ${row('Nose Length',         ha.nose_length_px, 'px')}
            ${row('Face W/H Ratio',      ha.face_width_height_ratio)}
            ${row('Facial Fullness',     ha.facial_fullness)}
            ${ha.face_shape_note      ? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.face_shape_note}</div>` : ''}
            ${ha.golden_ratio_note    ? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.golden_ratio_note}</div>` : ''}
            ${ha.eye_spacing_note     ? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.eye_spacing_note}</div>` : ''}
            ${ha.jaw_note             ? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.jaw_note}</div>` : ''}
            ${ha.nose_note            ? `<div style="font-size:11px;color:#adf;padding:4px 0;">${ha.nose_note}</div>` : ''}
            ${ha.fullness_evaluation  ? `<div style="font-size:11px;color:#fa8;padding:4px 0;">${ha.fullness_evaluation}</div>` : ''}` : '';

          // Circulation section
          const circSection = ha.lip_redness_index != null ? `
            ${sectionHead('Circulatory Screening')}
            ${row('Lip Redness Index', ha.lip_redness_index)}
            ${row('Lip Brightness',    ha.lip_brightness)}
            ${row('Lip Hue',           ha.lip_hue)}
            ${row('Lip Saturation',    ha.lip_saturation)}
            ${ha.lip_rgb ? row('Lip RGB', `R:${ha.lip_rgb.r} G:${ha.lip_rgb.g} B:${ha.lip_rgb.b}`) : ''}
            ${ha.lip_color_note     ? `<div style="font-size:11px;color:#fa8;padding:4px 0;">${ha.lip_color_note}</div>` : ''}
            ${ha.cyanosis_screen    ? `<div style="font-size:11px;color:#fa8;padding:4px 0;">${ha.cyanosis_screen}</div>` : ''}
            ${ha.lip_jaundice_screen? `<div style="font-size:11px;color:#fa8;padding:4px 0;">${ha.lip_jaundice_screen}</div>` : ''}` : '';

          // Raw measurements (collapsible)
          const rawKeys = Object.keys(raw).filter(k => !['skin_regions','lip_rgb'].includes(k));
          const rawSection = rawKeys.length ? `
            ${sectionHead('Raw Measurements')}
            <details style="margin-top:4px;">
              <summary style="font-size:12px;color:#888;cursor:pointer;padding:4px 0;">Show / Hide raw data (${rawKeys.length} groups)</summary>
              <div style="margin-top:8px;font-size:11px;color:#aaa;font-family:monospace;white-space:pre-wrap;max-height:300px;overflow-y:auto;background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;">${JSON.stringify(raw, null, 2)}</div>
            </details>` : '';

          // Trends
          const trendsHtml = (ha.fatigue_trend||ha.stress_trend||ha.symmetry_trend) ? `
            ${sectionHead('Trends (Session)')}
            ${row('Symmetry Trend', ha.symmetry_trend)}
            ${row('Fatigue Trend',  ha.fatigue_trend)}
            ${row('Stress Trend',   ha.stress_trend)}
            ${row('Skin Trend',     ha.skin_trend)}` : '';

          const recsHTML = recs.length
            ? recs.map(r => `<li style="padding:4px 0;color:#ccc;font-size:12px;">${r}</li>`).join('')
            : '<li style="color:#666;font-size:12px;">No recommendations at this time</li>';

          return `
            <div style="background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin-bottom:16px;">
              <!-- HEADER -->
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                <div>
                  <div style="font-size:11px;color:#666;letter-spacing:0.04em;">RECORD ${idx+1} &bull; ${ts}</div>
                  <div style="font-size:22px;font-weight:700;color:${scoreColor(score)};margin-top:4px;">${score}<span style="font-size:13px;color:#888;">/10</span></div>
                  <div style="font-size:13px;color:#bbb;margin-top:2px;">${status}</div>
                </div>
                <div style="position:relative;width:68px;height:68px;">
                  <svg viewBox="0 0 68 68" style="width:68px;height:68px;transform:rotate(-90deg);">
                    <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="7"/>
                    <circle cx="34" cy="34" r="28" fill="none" stroke="${scoreColor(score)}" stroke-width="7"
                      stroke-dasharray="${Math.round(2*Math.PI*28*score/10)} 999" stroke-linecap="round"/>
                  </svg>
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:${scoreColor(score)};">${score}</div>
                </div>
              </div>
              <!-- CATEGORIES -->
              ${catSection}
              <!-- ANALYSIS SECTIONS -->
              ${symSection}${eyeSection}${stressSection}${skinSection}${structSection}${circSection}
              <!-- TRENDS -->
              ${trendsHtml}
              <!-- RECOMMENDATIONS -->
              ${sectionHead('Recommendations')}
              <ul style="margin:0;padding-left:18px;">${recsHTML}</ul>
              <!-- RAW DATA -->
              ${rawSection}
            </div>`;
        }

        const allRecords = records.map(renderRecord).join('');
        contentContainer.innerHTML = `
          <div class="embedded-app-interface">
            <div class="app-header" style="gap:12px;">
              <button id="hr-back-btn" style="background:rgba(255,255,255,0.08);border:0.5px solid rgba(255,255,255,0.15);color:#eee;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;pointer-events:auto;-webkit-text-fill-color:#eee;">
                &#8592; Back
              </button>
              <h3 style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;">${fileName}</h3>
            </div>
            <div class="app-content" style="overflow-y:auto;max-height:calc(100vh - 220px);">
              <div style="padding:16px;">${allRecords}</div>
            </div>
          </div>`;

        // Back button: direct listener (delegated listener on contentContainer also handles it)
        const backBtn = contentContainer.querySelector('#hr-back-btn');
        if (backBtn) backBtn.onclick = () => renderHealthReportList();
      }

      await renderHealthReportList();
      return;
    }

    // Item Detection: stream camera + detection stats in-app
    if (featureId === 'item-detection') {
      showToast('Ready', 'Starting Item Detection...', 'info');
      featureContent.innerHTML = '';
      featureContent.style.padding = '0';

      featureContent.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%;background:var(--vision-bg-primary);border-radius:var(--radius-2xl);overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="font-weight:600;font-size:15px;">Item Detection</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-circle" style="color:#2ecc71;font-size:8px;" id="id-dot"></i>
              <span style="font-size:13px;color:#aaa;" id="id-status-text">Initializing...</span>
            </div>
          </div>
          <div style="display:flex;flex:1;min-height:0;gap:0;">
            <div style="position:relative;flex:1;background:#000;min-height:0;">
              <canvas id="id-canvas" style="width:100%;height:100%;display:block;object-fit:contain;"></canvas>
              <div id="id-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0a;color:#aaa;gap:12px;">
                <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
                <span>Loading model &amp; opening camera...</span>
              </div>
            </div>
            <div style="width:220px;padding:16px 12px;border-left:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:10px;overflow:hidden;">
              <div style="font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:0.05em;">Detections</div>
              <div style="display:flex;justify-content:space-between;font-size:13px;">
                <span style="color:#aaa;">Objects</span>
                <span id="id-obj-count" style="color:#fff;font-weight:600;">0</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:13px;">
                <span style="color:#aaa;">FPS</span>
                <span id="id-fps" style="color:#fff;font-weight:600;">—</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:13px;">
                <span style="color:#aaa;">Device</span>
                <span id="id-device" style="color:#f39c12;font-weight:600;">—</span>
              </div>
              <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">
                <div style="font-size:11px;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Detected Items</div>
                <div id="id-detections" style="font-size:12px;color:#ccc;line-height:1.8;">—</div>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);">
            <button id="id-btn-stop" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(231,76,60,0.15);color:#fff;cursor:pointer;font-size:13px;">
              <i class="fas fa-stop"></i> Stop
            </button>
          </div>
          <div style="padding:0 16px 8px;">
            <div class="console-content" id="app-console-item-detection" style="max-height:60px;font-size:11px;"></div>
          </div>
        </div>
      `;

      const ok = await window.electronAPI.startPythonApp('item-detection', []);
      if (!ok) {
        addToConsole('item-detection', 'Failed to start item detection.');
        return;
      }

      document.getElementById('id-btn-stop').addEventListener('click', () => {
        window.electronAPI.sendInput('item-detection', 'QUIT');
      });

      const canvas = document.getElementById('id-canvas');
      const ctx = canvas.getContext('2d');

      window.electronAPI.removeAllListeners('python-frame');
      window.electronAPI.onPythonFrame((data) => {
        if (data.appId !== 'item-detection') return;
        const overlay = document.getElementById('id-loading');
        if (overlay) overlay.style.display = 'none';
        const img = new Image();
        img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
        };
        img.src = 'data:image/jpeg;base64,' + data.frame;
      });

      return;
    }

    // Media Control: stream camera + gesture stats in-app
    if (featureId === 'media-control') {
      showToast('Ready', 'Starting Media Gesture Control...', 'info');
      featureContent.innerHTML = '';
      featureContent.style.padding = '0';

      featureContent.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%;background:var(--vision-bg-primary);border-radius:var(--radius-2xl);overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="font-weight:600;font-size:15px;">Media Gesture Control</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-circle" style="color:#2ecc71;font-size:8px;" id="mc-dot"></i>
              <span style="font-size:13px;color:#aaa;" id="mc-status-text">Initializing...</span>
            </div>
          </div>
          <div style="display:flex;flex:1;min-height:0;gap:0;">
            <div style="position:relative;flex:1;background:#000;min-height:0;">
              <canvas id="mc-canvas" style="width:100%;height:100%;display:block;object-fit:contain;"></canvas>
              <div id="mc-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0a;color:#aaa;gap:12px;">
                <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
                <span>Opening camera...</span>
              </div>
            </div>
            <div style="width:220px;padding:16px 12px;border-left:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:10px;overflow:hidden;">
              <div style="font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:0.05em;">Status</div>
              <div style="display:flex;justify-content:space-between;font-size:13px;">
                <span style="color:#aaa;">Mode</span>
                <span id="mc-mode" style="color:#f39c12;font-weight:600;">—</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:13px;">
                <span style="color:#aaa;">Volume</span>
                <span id="mc-volume" style="color:#fff;font-weight:600;">—</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:13px;">
                <span style="color:#aaa;">FPS</span>
                <span id="mc-fps" style="color:#fff;font-weight:600;">—</span>
              </div>
              <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">
                <div style="font-size:11px;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Now Playing</div>
                <div id="mc-song" style="font-size:12px;color:#ccc;line-height:1.6;">—</div>
              </div>
              <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">
                <div id="mc-action" style="font-size:13px;color:#2ecc71;font-weight:600;min-height:20px;"></div>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);">
            <button id="mc-btn-stop" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(231,76,60,0.15);color:#fff;cursor:pointer;font-size:13px;">
              <i class="fas fa-stop"></i> Stop
            </button>
          </div>
          <div style="padding:0 16px 8px;">
            <div class="console-content" id="app-console-media-control" style="max-height:60px;font-size:11px;"></div>
          </div>
        </div>
      `;

      const ok = await window.electronAPI.startPythonApp('media-control', []);
      if (!ok) {
        addToConsole('media-control', 'Failed to start media control.');
        return;
      }

      document.getElementById('mc-btn-stop').addEventListener('click', () => {
        window.electronAPI.sendInput('media-control', 'QUIT');
      });

      const canvas = document.getElementById('mc-canvas');
      const ctx = canvas.getContext('2d');

      window.electronAPI.removeAllListeners('python-frame');
      window.electronAPI.onPythonFrame((data) => {
        if (data.appId !== 'media-control') return;
        const overlay = document.getElementById('mc-loading');
        if (overlay) overlay.style.display = 'none';
        const img = new Image();
        img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
        };
        img.src = 'data:image/jpeg;base64,' + data.frame;
      });

      return;
    }

    // YouTube Downloader: full custom UI
    if (featureId === 'youtube-download') {
      featureContent.innerHTML = '';
      featureContent.style.padding = '0';

      featureContent.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%;background:#111;border-radius:16px;overflow:hidden;font-family:inherit;">

          <!-- Header -->
          <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;background:linear-gradient(135deg,rgba(229,57,53,0.15),transparent);border-bottom:1px solid rgba(255,255,255,0.07);">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#e53935,#b71c1c);border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <i class="fab fa-youtube" style="color:#fff;font-size:18px;"></i>
            </div>
            <div>
              <div style="font-weight:700;font-size:15px;color:#fff;">YouTube Downloader</div>
              <div style="font-size:11px;color:#aaa;" id="yt-status">Ready to download</div>
            </div>
            <div style="margin-left:auto;display:flex;align-items:center;gap:6px;">
              <div id="yt-dot" style="width:8px;height:8px;border-radius:50%;background:#2ecc71;"></div>
            </div>
          </div>

          <!-- Scrollable body -->
          <div style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px;">

            <!-- URL input -->
            <div>
              <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">Video URL</div>
              <div style="display:flex;gap:8px;">
                <input id="yt-url" type="text" placeholder="Paste YouTube URL here..."
                  style="flex:1;padding:11px 14px;background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:13px;outline:none;transition:border 0.2s;"
                  onfocus="this.style.borderColor='rgba(229,57,53,0.6)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'" />
                <button id="yt-paste"
                  style="padding:11px 16px;background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#ccc;cursor:pointer;font-size:13px;white-space:nowrap;transition:background 0.2s;"
                  onmouseover="this.style.background='#252525'" onmouseout="this.style.background='#1a1a1a'">
                  <i class="fas fa-clipboard"></i> Paste
                </button>
              </div>
            </div>

            <!-- Type + Quality -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">Type</div>
                <div style="display:flex;background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:10px;overflow:hidden;">
                  <button id="yt-type-video"
                    style="flex:1;padding:10px 8px;background:rgba(229,57,53,0.25);border:none;color:#fff;cursor:pointer;font-size:13px;font-weight:600;border-right:1px solid rgba(255,255,255,0.08);">
                    <i class="fas fa-film" style="margin-right:5px;"></i>Video
                  </button>
                  <button id="yt-type-audio"
                    style="flex:1;padding:10px 8px;background:transparent;border:none;color:#666;cursor:pointer;font-size:13px;font-weight:600;">
                    <i class="fas fa-music" style="margin-right:5px;"></i>Audio
                  </button>
                </div>
              </div>
              <div id="yt-quality-wrap">
                <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">Quality</div>
                <select id="yt-quality"
                  style="width:100%;padding:10px 14px;background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:13px;cursor:pointer;outline:none;appearance:none;">
                  <option value="best">Best available</option>
                  <option value="1080p">1080p HD</option>
                  <option value="720p">720p HD</option>
                  <option value="480p">480p</option>
                  <option value="360p">360p</option>
                </select>
              </div>
            </div>

            <!-- Save folder -->
            <div>
              <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">Save Location</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <div id="yt-folder-display"
                  style="flex:1;padding:11px 14px;background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#888;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  <i class="fas fa-folder" style="margin-right:6px;color:#f39c12;"></i>Default (~/Videos)
                </div>
                <button id="yt-browse"
                  style="padding:11px 16px;background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#ccc;cursor:pointer;font-size:13px;white-space:nowrap;transition:background 0.2s;"
                  onmouseover="this.style.background='#252525'" onmouseout="this.style.background='#1a1a1a'">
                  <i class="fas fa-folder-open"></i> Browse
                </button>
              </div>
            </div>

            <!-- Download button -->
            <button id="yt-download-btn"
              style="padding:14px;background:linear-gradient(135deg,#e53935,#c62828);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:0.3px;transition:opacity 0.2s;box-shadow:0 4px 20px rgba(229,57,53,0.3);"
              onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
              <i class="fas fa-download" style="margin-right:8px;"></i>Download
            </button>

            <!-- Video info card -->
            <div id="yt-info-card" style="display:none;padding:14px;background:#1a1a1a;border-radius:12px;border:1px solid rgba(255,255,255,0.08);display:none;align-items:center;gap:12px;">
              <div style="width:40px;height:40px;background:rgba(229,57,53,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fab fa-youtube" style="color:#e53935;font-size:18px;"></i>
              </div>
              <div style="overflow:hidden;">
                <div id="yt-title" style="font-size:13px;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div>
                <div id="yt-duration" style="font-size:11px;color:#888;margin-top:2px;"></div>
              </div>
            </div>

            <!-- Progress -->
            <div id="yt-progress-area" style="display:none;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:12px;color:#aaa;" id="yt-progress-label">Downloading...</span>
                <span style="font-size:13px;font-weight:700;color:#fff;" id="yt-progress-pct">0%</span>
              </div>
              <div style="background:#1a1a1a;border-radius:8px;height:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
                <div id="yt-progress-bar" style="height:100%;background:linear-gradient(90deg,#e53935,#ff7043);border-radius:8px;width:0%;transition:width 0.5s ease;"></div>
              </div>
            </div>

            <!-- Done banner -->
            <div id="yt-done" style="display:none;padding:14px 16px;background:rgba(46,204,113,0.1);border:1px solid rgba(46,204,113,0.25);border-radius:12px;align-items:center;gap:12px;">
              <i class="fas fa-check-circle" style="color:#2ecc71;font-size:22px;flex-shrink:0;"></i>
              <div>
                <div style="font-size:13px;font-weight:700;color:#2ecc71;">Download complete!</div>
                <div style="font-size:11px;color:#888;margin-top:2px;" id="yt-done-path"></div>
              </div>
              <button id="yt-open-folder"
                style="margin-left:auto;padding:8px 14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;cursor:pointer;font-size:12px;white-space:nowrap;">
                <i class="fas fa-folder-open"></i> Open
              </button>
            </div>

            <!-- Console -->
            <div>
              <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                Console
                <button id="yt-clear-console" style="background:none;border:none;color:#555;cursor:pointer;font-size:10px;text-transform:none;letter-spacing:0;">
                  <i class="fas fa-trash"></i> clear
                </button>
              </div>
              <div id="yt-console"
                style="background:#0d0d0d;border-radius:10px;border:1px solid rgba(255,255,255,0.05);padding:12px;font-family:'Courier New',monospace;font-size:11px;color:#aaa;height:160px;overflow-y:auto;line-height:1.6;">
              </div>
            </div>

          </div>
        </div>
      `;

      let ytFolder = null;
      let currentDownloadType = 'video';

      const ytLog = (msg, color) => {
        const c = document.getElementById('yt-console');
        if (!c) return;
        const line = document.createElement('div');
        line.style.color = color || '#888';
        line.textContent = msg;
        c.appendChild(line);
        c.scrollTop = c.scrollHeight;
      };

      const setStatus = (text, dotColor) => {
        const s = document.getElementById('yt-status');
        const d = document.getElementById('yt-dot');
        if (s) s.textContent = text;
        if (d && dotColor) d.style.background = dotColor;
      };

      // Type toggle
      document.getElementById('yt-type-video').addEventListener('click', () => {
        currentDownloadType = 'video';
        document.getElementById('yt-type-video').style.background = 'rgba(229,57,53,0.25)';
        document.getElementById('yt-type-video').style.color = '#fff';
        document.getElementById('yt-type-audio').style.background = 'transparent';
        document.getElementById('yt-type-audio').style.color = '#666';
        const sel = document.getElementById('yt-quality');
        sel.innerHTML = '<option value="best">Best available</option><option value="1080p">1080p HD</option><option value="720p">720p HD</option><option value="480p">480p</option><option value="360p">360p</option>';
        document.getElementById('yt-quality-wrap').style.display = '';
      });

      document.getElementById('yt-type-audio').addEventListener('click', () => {
        currentDownloadType = 'audio';
        document.getElementById('yt-type-audio').style.background = 'rgba(52,152,219,0.25)';
        document.getElementById('yt-type-audio').style.color = '#fff';
        document.getElementById('yt-type-video').style.background = 'transparent';
        document.getElementById('yt-type-video').style.color = '#666';
        const sel = document.getElementById('yt-quality');
        sel.innerHTML = '<option value="audio">MP3 — Best quality</option>';
        document.getElementById('yt-quality-wrap').style.display = '';
      });

      // Paste
      document.getElementById('yt-paste').addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          document.getElementById('yt-url').value = text;
        } catch(e) { ytLog('Clipboard read failed: ' + e, '#e74c3c'); }
      });

      // Browse
      document.getElementById('yt-browse').addEventListener('click', async () => {
        const chosen = await window.electronAPI.showFolderDialog();
        if (chosen) {
          ytFolder = chosen;
          document.getElementById('yt-folder-display').innerHTML =
            `<i class="fas fa-folder" style="margin-right:6px;color:#f39c12;"></i>${chosen}`;
        }
      });

      // Clear console
      document.getElementById('yt-clear-console').addEventListener('click', () => {
        document.getElementById('yt-console').innerHTML = '';
      });

      // Open folder — ytFolder null = main.js falls back to ~/Videos
      document.getElementById('yt-open-folder').addEventListener('click', () => {
        window.electronAPI.openFolder(ytFolder);
      });

      // Download
      document.getElementById('yt-download-btn').addEventListener('click', async () => {
        const url = document.getElementById('yt-url').value.trim();
        if (!url) { ytLog('Please enter a URL first.', '#e74c3c'); return; }

        const quality = currentDownloadType === 'audio' ? 'audio' : document.getElementById('yt-quality').value;

        // Reset UI state
        document.getElementById('yt-info-card').style.display = 'none';
        const done = document.getElementById('yt-done');
        done.style.display = 'none';
        const progArea = document.getElementById('yt-progress-area');
        progArea.style.display = '';
        document.getElementById('yt-progress-bar').style.width = '0%';
        document.getElementById('yt-progress-pct').textContent = '0%';
        document.getElementById('yt-progress-label').textContent = 'Fetching info...';
        setStatus('Downloading...', '#f39c12');

        const btn = document.getElementById('yt-download-btn');
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Downloading...';

        ytLog(`> ${url}`, '#3498db');
        ytLog(`  Type: ${currentDownloadType === 'audio' ? 'Audio (MP3)' : 'Video'}  |  Quality: ${quality}`, '#555');

        // Remove old listeners
        window.electronAPI.removeAllListeners('download-progress');
        window.electronAPI.removeAllListeners('download-complete');
        window.electronAPI.removeAllListeners('download-error');
        window.electronAPI.removeAllListeners('download-info');
        window.electronAPI.removeAllListeners('python-output');

        window.electronAPI.onDownloadInfo((data) => {
          if (data.appId !== 'youtube-download') return;
          const card = document.getElementById('yt-info-card');
          card.style.display = 'flex';
          document.getElementById('yt-title').textContent = data.title || '';
          document.getElementById('yt-progress-label').textContent = 'Downloading...';
        });

        window.electronAPI.onDownloadProgress((data) => {
          if (data.appId !== 'youtube-download') return;
          const pct = Math.min(100, Math.round(data.progress));
          document.getElementById('yt-progress-bar').style.width = pct + '%';
          document.getElementById('yt-progress-pct').textContent = pct + '%';
          if (pct >= 100) document.getElementById('yt-progress-label').textContent = 'Processing...';
        });

        window.electronAPI.onDownloadComplete((data) => {
          if (data.appId !== 'youtube-download') return;
          document.getElementById('yt-progress-bar').style.width = '100%';
          document.getElementById('yt-progress-pct').textContent = '100%';
          document.getElementById('yt-progress-label').textContent = 'Done!';
          setStatus('Done', '#2ecc71');
          done.style.display = 'flex';
          document.getElementById('yt-done-path').textContent = ytFolder || '~/Videos';
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.innerHTML = '<i class="fas fa-download" style="margin-right:8px;"></i>Download';
          ytLog('Download complete!', '#2ecc71');
        });

        window.electronAPI.onDownloadError((data) => {
          if (data.appId !== 'youtube-download') return;
          setStatus('Error', '#e74c3c');
          progArea.style.display = 'none';
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.innerHTML = '<i class="fas fa-download" style="margin-right:8px;"></i>Download';
          ytLog('ERROR: ' + (data.message || 'Download failed'), '#e74c3c');
        });

        window.electronAPI.onPythonOutput((data) => {
          if (data.appId !== 'youtube-download') return;
          const msg = data.message || '';
          if (!msg.trim() || msg.startsWith('===')) return; // skip banner
          const dim = msg.startsWith('[youtube]') || msg.startsWith('[info]') || msg.includes('Downloading webpage') || msg.includes('tv client');
          ytLog(msg, dim ? '#444' : '#777');
        });

        await window.electronAPI.startDownload('youtube-download', url, quality, ytFolder || null);
      });

      return;
    }

    // Air Writing: stream camera + drawing canvas in-app
    if (featureId === 'SignLang') {
      showToast('Ready', 'Starting ASL Translator...', 'info');
      featureContent.innerHTML = '';
      featureContent.style.padding = '0';

      featureContent.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%;background:var(--vision-bg-primary);border-radius:var(--radius-2xl);overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="font-weight:600;font-size:15px;">ASL Translator</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-circle" style="color:#2ecc71;font-size:8px;" id="asl-dot"></i>
              <span style="font-size:13px;color:#aaa;" id="asl-status-text">Initializing...</span>
            </div>
          </div>
          <div style="position:relative;flex:1;background:#000;min-height:0;">
            <canvas id="asl-canvas" style="width:100%;height:100%;display:block;object-fit:contain;"></canvas>
            <div id="asl-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0a;color:#aaa;gap:12px;">
              <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
              <span>Loading model &amp; opening camera...</span>
            </div>
            <!-- Overlay: current letter + confidence -->
            <div id="asl-overlay" style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);border-radius:12px;padding:12px 18px;min-width:110px;text-align:center;display:none;">
              <div id="asl-letter" style="font-size:52px;font-weight:700;color:#2ecc71;line-height:1;">-</div>
              <div style="margin-top:6px;height:6px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden;">
                <div id="asl-conf-bar" style="height:100%;width:0%;background:#2ecc71;border-radius:3px;transition:width 0.2s;"></div>
              </div>
              <div id="asl-conf-pct" style="font-size:11px;color:#aaa;margin-top:4px;">0%</div>
            </div>
          </div>
          <!-- Subtitle bar -->
          <div style="padding:10px 16px;background:rgba(255,255,255,0.04);border-top:1px solid rgba(255,255,255,0.06);">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="font-size:12px;color:#888;white-space:nowrap;">Subtitle:</span>
              <span id="asl-subtitle" style="font-size:14px;color:#fff;flex:1;word-break:break-all;"></span>
              <button id="asl-btn-clear" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.08);color:#aaa;cursor:pointer;font-size:12px;">Clear</button>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span id="asl-buffer" style="font-size:11px;color:#666;flex:1;"></span>
              <button id="asl-btn-stop" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(231,76,60,0.15);color:#fff;cursor:pointer;font-size:13px;">
                <i class="fas fa-stop"></i> Stop
              </button>
            </div>
          </div>
        </div>
      `;

      const ok = await window.electronAPI.startPythonApp('SignLang', []);
      if (!ok) {
        document.getElementById('asl-status-text').textContent = 'Failed to start';
        return;
      }

      document.getElementById('asl-btn-stop').addEventListener('click', () => {
        window.electronAPI.sendInput('SignLang', 'QUIT');
      });

      // Clear button only clears UI — the Python side manages its own subtitle state
      document.getElementById('asl-btn-clear').addEventListener('click', () => {
        document.getElementById('asl-subtitle').textContent = '';
      });

      const canvas = document.getElementById('asl-canvas');
      const ctx = canvas.getContext('2d');

      window.electronAPI.removeAllListeners('python-frame');
      window.electronAPI.onPythonFrame((data) => {
        if (data.appId !== 'SignLang') return;
        const loading = document.getElementById('asl-loading');
        if (loading) loading.style.display = 'none';
        const img = new Image();
        img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
        };
        img.src = 'data:image/jpeg;base64,' + data.frame;
      });

      return;
    }

    if (featureId === 'air-writing') {
      showToast('Ready', 'Starting Air Writing...', 'info');
      featureContent.innerHTML = '';
      featureContent.style.padding = '0';

      featureContent.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%;background:var(--vision-bg-primary);border-radius:var(--radius-2xl);overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="font-weight:600;font-size:15px;">Air Writing</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-circle" style="color:#2ecc71;font-size:8px;" id="aw-dot"></i>
              <span style="font-size:13px;color:#aaa;" id="aw-status-text">Initializing...</span>
            </div>
          </div>
          <div style="position:relative;flex:1;background:#000;min-height:0;">
            <canvas id="aw-canvas" style="width:100%;height:100%;display:block;object-fit:contain;"></canvas>
            <div id="aw-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0a;color:#aaa;gap:12px;">
              <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
              <span>Opening camera &amp; loading hand tracking...</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);align-items:center;">
            <span style="font-size:12px;color:#888;">Strokes: <span id="aw-strokes">0</span></span>
            <span style="font-size:12px;color:#888;margin-left:12px;"><span id="aw-drawing-state"></span></span>
            <button id="aw-btn-stop" style="margin-left:auto;padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(231,76,60,0.15);color:#fff;cursor:pointer;font-size:13px;">
              <i class="fas fa-stop"></i> Stop
            </button>
          </div>
        </div>
      `;

      const ok = await window.electronAPI.startPythonApp('air-writing', []);
      if (!ok) {
        document.getElementById('aw-status-text').textContent = 'Failed to start';
        return;
      }

      document.getElementById('aw-btn-stop').addEventListener('click', () => {
        window.electronAPI.sendInput('air-writing', 'QUIT');
      });

      const canvas = document.getElementById('aw-canvas');
      const ctx = canvas.getContext('2d');

      window.electronAPI.removeAllListeners('python-frame');
      window.electronAPI.onPythonFrame((data) => {
        if (data.appId !== 'air-writing') return;
        const overlay = document.getElementById('aw-loading');
        if (overlay) overlay.style.display = 'none';
        const img = new Image();
        img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
        };
        img.src = 'data:image/jpeg;base64,' + data.frame;
      });

      return;
    }

    showToast('Activating', `Starting ${app.name}...`, 'info');
    const success = await window.electronAPI.launchApp(featureId);
    
    if (success) {
      showToast('Success', `${app.name} activated successfully.`, 'success');
      
      // Create feature content container
      const contentContainer = document.createElement('div');
      contentContainer.className = 'feature-content-container';
      
      // For features that might have a video feed, create a video area
      if (['face-reco', 'emotions', 'analyse'].includes(featureId)) {
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
      else if (featureId === 'phone-info') {
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
    document.querySelector('.content').classList.remove('has-viewer');
    document.querySelectorAll('.content-section').forEach(s => s.style.display = '');
  }, 1000);
}

// Close current active feature
function closeFeature() {
  if (!activeFeature) return;

  // Clean up frame listener if face-scanner was active
  window.electronAPI.removeAllListeners('python-frame');

  featureViewer.classList.remove('active');
  document.querySelector('.content').classList.remove('has-viewer');
  document.querySelectorAll('.content-section').forEach(s => s.style.display = '');
  
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

    // Parse face-scanner STATUS lines — update UI, don't log to console
    if (appId === 'face-scanner' && message && message.startsWith('STATUS:')) {
      try {
        const s = JSON.parse(message.slice(7));
        const el = (id) => document.getElementById(id);
        if (el('fs-stat-faces'))   el('fs-stat-faces').textContent   = `Faces: ${s.faces}`;
        if (el('fs-stat-fps'))     el('fs-stat-fps').textContent     = `FPS: ${s.fps}`;
        if (el('fs-stat-captured'))el('fs-stat-captured').textContent= `Captured: ${s.captured}/${s.target}`;
        if (el('fs-stat-auto')) {
          el('fs-stat-auto').textContent = `Auto: ${s.auto ? 'ON' : 'OFF'}`;
          el('fs-stat-auto').style.color = s.auto ? '#2ecc71' : '#e74c3c';
        }
        if (el('fs-live-status'))  el('fs-live-status').textContent  = 'Live';
      } catch(e) {}
      return;
    }

    // Capture confirmation / failure from analyse app
    if (appId === 'analyse' && message && message.startsWith('CAPTURED:')) {
      const btn = document.getElementById('fa-btn-capture');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Captured!'; setTimeout(() => { const b = document.getElementById('fa-btn-capture'); if (b) { b.disabled = false; b.innerHTML = '<i class="fas fa-camera"></i> Capture'; } }, 2500); }
      showToast('Saved', 'Health report captured. Open Health Reports to view it.', 'success');
      return;
    }
    if (appId === 'analyse' && message && message.startsWith('CAPTURE_FAILED:')) {
      const btn = document.getElementById('fa-btn-capture');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-camera"></i> Capture'; }
      showToast('Capture Failed', message.slice(15) || 'No face detected yet.', 'warning');
      return;
    }

    // Parse facial-analysis STATUS lines — update health metrics UI
    if (appId === 'analyse' && message && message.startsWith('STATUS:')) {
      try {
        const s = JSON.parse(message.slice(7));
        const el = (id) => document.getElementById(id);
        if (el('fa-score')) el('fa-score').textContent = s.score !== undefined ? s.score : '—';
        if (el('fa-health-status')) el('fa-health-status').textContent = s.status || '—';
        if (el('fa-symmetry')) el('fa-symmetry').textContent = s.symmetry !== undefined ? s.symmetry : '—';
        if (el('fa-eye-fatigue')) el('fa-eye-fatigue').textContent = s.eye_fatigue || '—';
        if (el('fa-skin-texture')) el('fa-skin-texture').textContent = s.skin_texture !== undefined ? s.skin_texture : '—';
        if (el('fa-fps')) el('fa-fps').textContent = `FPS: ${s.fps}`;
        if (el('fa-status-text')) el('fa-status-text').textContent = s.face ? 'Face Detected' : 'Searching...';
        if (el('fa-recs') && s.recommendations && s.recommendations.length) {
          el('fa-recs').innerHTML = s.recommendations.map(r => `• ${r}`).join('<br>');
        }
      } catch(e) {}
      return;
    }

    // Parse item-detection STATUS lines — update detection stats UI
    if (appId === 'item-detection' && message && message.startsWith('STATUS:')) {
      try {
        const s = JSON.parse(message.slice(7));
        const el = (id) => document.getElementById(id);
        if (el('id-fps'))       el('id-fps').textContent       = s.fps !== undefined ? s.fps : '—';
        if (el('id-obj-count')) el('id-obj-count').textContent = s.objects !== undefined ? s.objects : '0';
        if (el('id-device'))    el('id-device').textContent    = s.device || '—';
        if (el('id-status-text')) el('id-status-text').textContent = 'Live';
        if (el('id-detections') && s.detections && s.detections.length) {
          el('id-detections').innerHTML = s.detections
            .map(d => `<div style="display:flex;justify-content:space-between;"><span style="color:#4af;">${d.label}</span><span style="color:#888;">${Math.round(d.conf * 100)}%</span></div>`)
            .join('');
        } else if (el('id-detections') && s.objects === 0) {
          el('id-detections').innerHTML = '<span style="color:#555;">No objects detected</span>';
        }
        if (s.error) {
          const overlay = document.getElementById('id-loading');
          if (overlay) {
            overlay.innerHTML = `<i class="fas fa-exclamation-triangle" style="font-size:28px;color:#e74c3c;"></i><span style="color:#e74c3c;">${s.error}</span>`;
          }
          if (el('id-status-text')) { el('id-status-text').textContent = s.error; el('id-status-text').style.color = '#e74c3c'; }
        }
      } catch(e) {}
      return;
    }

    // Parse air-writing STATUS lines
    if (appId === 'air-writing' && message && message.startsWith('STATUS:')) {
      try {
        const s = JSON.parse(message.slice(7));
        const el = (id) => document.getElementById(id);
        if (el('aw-status-text')) el('aw-status-text').textContent = s.info || 'Live';
        if (el('aw-strokes') && s.strokes !== undefined) el('aw-strokes').textContent = s.strokes;
        if (el('aw-drawing-state')) el('aw-drawing-state').textContent = s.drawing ? '✏️ Drawing' : '';
      } catch(e) {}
      return;
    }

    // Parse media-control STATUS lines — update gesture stats UI
    if (appId === 'media-control' && message && message.startsWith('STATUS:')) {
      try {
        const s = JSON.parse(message.slice(7));
        const el = (id) => document.getElementById(id);
        if (el('mc-fps'))    el('mc-fps').textContent    = s.fps !== undefined ? s.fps : '—';
        if (el('mc-volume')) el('mc-volume').textContent = s.muted ? 'MUTED' : (s.volume !== undefined ? s.volume + '%' : '—');
        if (el('mc-song'))   el('mc-song').textContent   = s.song || '—';
        if (el('mc-action') && s.action) el('mc-action').textContent = s.action;
        if (el('mc-status-text')) el('mc-status-text').textContent = 'Live';
        if (el('mc-mode') && s.mode) {
          el('mc-mode').textContent = s.mode;
          el('mc-mode').style.color = s.mode === 'LOCKED' ? '#e74c3c' : s.mode === 'MEDIA' ? '#3498db' : '#2ecc71';
        }
      } catch(e) {}
      return;
    }

    // Parse emotions STATUS lines — update bar chart UI
    if (appId === 'emotions' && message && message.startsWith('STATUS:')) {
      try {
        const s = JSON.parse(message.slice(7));
        const LABELS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise'];
        const el = (id) => document.getElementById(id);
        if (el('em-top-label') && s.label !== 'none') {
          el('em-top-label').textContent = s.label.charAt(0).toUpperCase() + s.label.slice(1);
        }
        if (el('em-fps-stat')) el('em-fps-stat').textContent = `FPS: ${s.fps}`;
        if (el('em-status-text')) el('em-status-text').textContent = 'Live';
        if (s.probs && s.probs.length === LABELS.length) {
          LABELS.forEach((l, i) => {
            const pct = Math.round(s.probs[i] * 100);
            const bar = el(`em-bar-${l}`);
            const pctEl = el(`em-pct-${l}`);
            if (bar) bar.style.width = pct + '%';
            if (pctEl) pctEl.textContent = pct + '%';
          });
        }
      } catch(e) {}
      return;
    }

    // Parse SignLang STATUS lines — update ASL overlay UI
    if (appId === 'SignLang' && message && message.startsWith('STATUS:')) {
      try {
        const s = JSON.parse(message.slice(7));
        const el = (id) => document.getElementById(id);
        const overlay = el('asl-overlay');
        if (overlay) overlay.style.display = 'block';
        if (el('asl-letter')) el('asl-letter').textContent = s.letter || '-';
        const confPct = Math.round((s.confidence || 0) * 100);
        if (el('asl-conf-bar')) el('asl-conf-bar').style.width = confPct + '%';
        if (el('asl-conf-pct')) el('asl-conf-pct').textContent = confPct + '%';
        if (el('asl-subtitle') && s.subtitle !== undefined) el('asl-subtitle').textContent = s.subtitle;
        if (el('asl-buffer')) el('asl-buffer').textContent = s.buffer && s.buffer.length ? 'Buffer: ' + s.buffer.join(' ') : '';
        if (el('asl-status-text')) el('asl-status-text').textContent = s.letter ? `Detecting: ${s.letter}` : 'Waiting for hand...';
      } catch(e) {}
      return;
    }

    addToConsole(appId, message);

    // Reset phone-info lookup button when process closes
    if (appId === 'phone-info' && message && message.startsWith('Process closed')) {
      const lookupBtn = document.querySelector('#phone-lookup-btn');
      const statusDot = document.querySelector('#phone-info-status-dot');
      const statusText = document.querySelector('#phone-info-status-text');
      if (lookupBtn) {
        lookupBtn.disabled = false;
        lookupBtn.innerHTML = '<i class="fas fa-search"></i> Look Up';
      }
      if (statusDot) statusDot.className = 'fas fa-circle status-indicator';
      if (statusText) statusText.textContent = 'Ready';
    }

    // Reset face-scanner start button when process closes
    if (appId === 'face-scanner' && message && message.startsWith('Process closed')) {
      const startBtn = document.querySelector('#face-scanner-start-btn');
      const statusDot = document.querySelector('#face-scanner-status-dot');
      const statusText = document.querySelector('#face-scanner-status-text');
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Start Face Scanner';
      }
      if (statusDot) statusDot.className = 'fas fa-circle status-indicator';
      if (statusText) statusText.textContent = 'Ready';
    }
    
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