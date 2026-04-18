const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const si = require('systeminformation');
const { PythonShell } = require('python-shell');
const Store = require('electron-store');

const store = new Store();

// Keep references to prevent garbage collection
let mainWindow;
const pythonProcesses = {};

// Read app configuration
const appsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'apps.json'), 'utf8'));

// Function to get CPU usage via Windows performance counter
async function getWindowsCpuUsage() {
  try {
    const { stdout } = await execPromise('wmic cpu get loadpercentage /value');
    const match = stdout.match(/LoadPercentage=(\d+)/);
    return match ? parseInt(match[1]) : 0;
  } catch (error) {
    console.error('Error getting CPU from wmic:', error);
    return 0;
  }
}

// Function to get real system metrics
async function getSystemMetrics() {
  try {
    // Get CPU usage from Windows performance counter (most accurate)
    const cpuPercent = await getWindowsCpuUsage();
    
    // Get memory information from systeminformation (this is accurate)
    const memory = await si.mem();
    const memoryUsageMB = Math.round(memory.used / (1024 * 1024));
    const memoryUsagePercent = Math.round((memory.used / memory.total) * 100);
    const memoryTotalGB = (memory.total / (1024 * 1024 * 1024)).toFixed(1);
    
    return {
      cpu: {
        usage: cpuPercent,
        cores: os.cpus().length
      },
      memory: {
        total: memory.total,
        free: memory.free,
        used: memory.used,
        usagePercent: memoryUsagePercent,
        usageMB: memoryUsageMB,
        totalGB: memoryTotalGB
      },
      gpu: {
        usage: 0  // GPU monitoring disabled - too CPU intensive
      },
      platform: os.platform(),
      uptime: os.uptime()
    };
  } catch (error) {
    console.error('Error getting system metrics:', error);
    return {
      cpu: { usage: 0, cores: os.cpus().length },
      memory: { total: 0, free: 0, used: 0, usagePercent: 0, usageMB: 0, totalGB: '0' },
      gpu: { usage: 0 },
      platform: os.platform(),
      uptime: os.uptime()
    };
  }
}

function createWindow() {
  // Create icons directory if it doesn't exist
  const iconsDir = path.join(__dirname, 'assets', 'icons', 'app-icons');
  if (!fs.existsSync(iconsDir)) {
    try {
      fs.mkdirSync(iconsDir, { recursive: true });
      console.log(`Created directory: ${iconsDir}`);
    } catch (err) {
      console.error(`Error creating directory: ${err}`);
    }
  }
  
  // Create placeholder icon if icons are missing
  appsConfig.apps.forEach(app => {
    if (app.icon) {
      const iconPath = path.join(__dirname, app.icon);
      if (!fs.existsSync(iconPath)) {
        // Extract just the filename
        const iconFilename = path.basename(app.icon);
        
        // Copy default icon as placeholder
        try {
          const defaultIcon = path.join(__dirname, 'assets', 'icons', 'logo.png');
          if (fs.existsSync(defaultIcon)) {
            fs.copyFileSync(defaultIcon, iconPath);
            console.log(`Created placeholder icon for ${app.name}`);
          }
        } catch (err) {
          console.error(`Error creating icon for ${app.name}: ${err}`);
        }
      }
    }
  });
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false, 
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Add a secure Content-Security-Policy to fix the unsafe-eval warning
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets', 'icons', 'logo.png')
  });

  // Set a secure Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self';"]
      }
    });
  });

  // Disable security warnings in the console that trigger console window to appear
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

  // Load the main HTML file
  mainWindow.loadFile('index.html');
  
  // Only open DevTools when explicitly requested with --dev flag
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    terminateAllPythonProcesses();
  });
}

// Initialize all Python apps in the background
function initializePythonApps() {
  let appsInitialized = 0;
  
  appsConfig.apps.forEach(app => {
    console.log(`Initializing ${app.name}...`);
    
    // Check if app has an initialization script
    if (app.initializationScript) {
      const options = {
        mode: 'text',
        pythonPath: app.pythonPath || 'python', // Use specified Python path or default
        pythonOptions: ['-u'], // Unbuffered output
        scriptPath: app.scriptPath,
        args: app.initArgs || []
      };
      
      try {
        const pyshell = new PythonShell(app.initializationScript, options);
        pythonProcesses[app.id] = pyshell;
        
        pyshell.on('message', (message) => {
          console.log(`[${app.name}] ${message}`);
          // Send initialization status to the renderer
          if (mainWindow) {
            mainWindow.webContents.send('app-status-update', {
              id: app.id,
              status: 'initialized',
              message: message
            });
          }
        });
        
        pyshell.on('error', (err) => {
          console.error(`[${app.name}] Error: ${err}`);
          if (mainWindow) {
            mainWindow.webContents.send('app-status-update', {
              id: app.id,
              status: 'error',
              message: err.toString()
            });
          }
          
          // Count as initialized even if there's an error
          appsInitialized++;
          if (appsInitialized >= appsConfig.apps.length && mainWindow) {
            mainWindow.webContents.send('all-apps-initialized');
          }
        });
        
        pyshell.on('close', () => {
          console.log(`[${app.name}] Process closed`);
          
          // Count this app as initialized
          appsInitialized++;
          if (appsInitialized >= appsConfig.apps.length && mainWindow) {
            mainWindow.webContents.send('all-apps-initialized');
          }
        });
      } catch (err) {
        console.error(`Failed to initialize ${app.name}: ${err}`);
        
        // Still mark this app as initialized for the counter
        appsInitialized++;
        
        // Send initialization status to the renderer
        if (mainWindow) {
          mainWindow.webContents.send('app-status-update', {
            id: app.id,
            status: 'initialized',
            message: 'Ready'
          });
        }
      }
    } else {
      // If there's no initialization script, mark as initialized immediately
      console.log(`${app.name} has no initialization script, marking as ready`);
      
      if (mainWindow) {
        mainWindow.webContents.send('app-status-update', {
          id: app.id,
          status: 'initialized',
          message: 'Ready'
        });
      }
      
      // Count this app as initialized
      appsInitialized++;
    }
  });
  
  // If all apps were immediately marked as initialized, send the all-initialized event
  if (appsInitialized >= appsConfig.apps.length && mainWindow) {
    mainWindow.webContents.send('all-apps-initialized');
  }
}

// Launch a specific app
function launchApp(appId) {
  const app = appsConfig.apps.find(a => a.id === appId);
  
  if (!app) {
    console.error(`App with ID ${appId} not found`);
    return false;
  }
  
  console.log(`Launching ${app.name}...`);
  
  // Validate paths first
  const rootDir = path.resolve(__dirname);
  const scriptPath = path.join(rootDir, app.scriptPath);
  const mainScript = app.mainScript;
  
  // Validate app directory exists
  if (!fs.existsSync(scriptPath)) {
    console.error(`App directory not found: ${scriptPath}`);
    if (mainWindow) {
      mainWindow.webContents.send('app-launch-error', {
        id: appId,
        error: `App directory not found: ${scriptPath}`
      });
    }
    return false;
  }
  
  // Validate main script exists
  const mainScriptPath = path.join(scriptPath, mainScript);
  if (!fs.existsSync(mainScriptPath)) {
    console.error(`Main script not found: ${mainScriptPath}`);
    if (mainWindow) {
      mainWindow.webContents.send('app-launch-error', {
        id: appId,
        error: `Main script not found: ${mainScriptPath}`
      });
    }
    return false;
  }
  
  // Get script directory (might be a subdirectory)
  const mainScriptDir = path.dirname(mainScriptPath);
  const mainScriptName = path.basename(mainScriptPath);
  
  // Setup Python options
  let pythonPath;
  if (app.pythonPath && app.pythonPath.startsWith("env/")) {
    // Relative path, make it absolute
    pythonPath = path.join(rootDir, app.pythonPath);
  } else if (app.pythonPath) {
    // Use provided path
    pythonPath = app.pythonPath;
  } else {
    // Default to env Python
    pythonPath = path.join(rootDir, "env", "Scripts", "python.exe");
  }
  
  // Check if Python executable exists
  if (!fs.existsSync(pythonPath)) {
    console.error(`Python interpreter not found at ${pythonPath}, using default python command`);
    pythonPath = "python";
  }
  
  // All apps should now be embedded within the feature viewer
  // No more separate terminal windows
  
  // Regular app launch with PythonShell for embedded execution
  const options = {
    mode: 'text',
    encoding: 'utf8',
    pythonPath: pythonPath,
    pythonOptions: ['-u'], // Unbuffered output
    scriptPath: mainScriptDir,
    args: app.launchArgs || [],
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  };
  
  try {
    // If this app already has a running process, terminate it
    if (pythonProcesses[appId]) {
      pythonProcesses[appId].terminate();
      delete pythonProcesses[appId];
    }
    
    console.log(`Running ${app.name} with options:`, options);
    
    const pyshell = new PythonShell(mainScriptName, options);
    pythonProcesses[appId] = pyshell;
    
    pyshell.on('message', (message) => {
      console.log(`[${app.name}] ${message}`);
      // Forward messages to the renderer for embedded display
      if (mainWindow) {
        mainWindow.webContents.send('app-message', {
          id: appId,
          message: message
        });
      }
    });
    
    pyshell.on('stderr', (stderr) => {
      console.error(`[${app.name}] Error: ${stderr}`);
      if (mainWindow) {
        mainWindow.webContents.send('app-stderr', {
          id: appId,
          error: stderr
        });
      }
    });
    
    pyshell.on('error', (err) => {
      console.error(`[${app.name}] Error: ${err}`);
      if (mainWindow) {
        mainWindow.webContents.send('app-launch-error', {
          id: appId,
          error: err.toString()
        });
      }
    });
    
    pyshell.on('close', (code) => {
      console.log(`[${app.name}] Process closed with code ${code}`);
      
      delete pythonProcesses[appId];
      
      if (mainWindow) {
        mainWindow.webContents.send('app-closed', {
          id: appId,
          code: code
        });
      }
    });
    
    if (mainWindow) {
      mainWindow.webContents.send('app-launched', {
        id: appId
      });
    }
    
    return true;
  } catch (err) {
    console.error(`Failed to launch ${app.name}: ${err}`);
    if (mainWindow) {
      mainWindow.webContents.send('app-launch-error', {
        id: appId,
        error: err.toString()
      });
    }
    return false;
  }
}

function terminateAllPythonProcesses() {
  Object.values(pythonProcesses).forEach(process => {
    if (process && typeof process.terminate === 'function') {
      process.terminate();
    }
  });
}

// Download process management
function startDownloadProcess(appId, url, quality = 'best') {
  try {
    const outputPath = path.join(require('os').homedir(), 'Videos');
    const scriptPath = path.join(__dirname, 'python-apps', appId.replace('-', '_'));
    
    const options = {
      mode: 'text',
      pythonPath: path.join(__dirname, 'env', 'Scripts', 'python.exe'),
      pythonOptions: ['-u'],
      scriptPath: scriptPath,
      args: [url, outputPath, quality]
    };

    console.log(`Starting ${appId} with options:`, options);
    
    const pyshell = new PythonShell('main.py', options);
    pythonProcesses[appId] = pyshell;
    
    // Track completion state
    let downloadCompleted = false;
    let hasError = false;

    // Helper function to process output (works for both stdout and stderr)
    const processOutput = (message) => {
      console.log(`[${appId}]`, message);
      
      // Send message to renderer
      if (mainWindow) {
        mainWindow.webContents.send('python-output', { 
          appId, 
          message, 
          type: 'output' 
        });
        
        // Parse progress information from yt-dlp output
        if (message.includes('%')) {
          // Handle yt-dlp progress format: "[download] 45.2% of 123.45MiB at 1.23MiB/s ETA 00:30"
          const progressMatch = message.match(/(?:\[download\]|\[hlsnative\])?.*?(\d+(?:\.\d+)?)%/);
          if (progressMatch) {
            const progress = parseFloat(progressMatch[1]);
            console.log(`Progress detected: ${progress}% from message: "${message}"`);
            mainWindow.webContents.send('download-progress', { 
              appId, 
              progress, 
              message 
            });
          }
        }
        
        // Also check for "ExtractAudio" progress (for music downloads)
        if (message.includes('[ExtractAudio]')) {
          mainWindow.webContents.send('download-progress', { 
            appId, 
            progress: 95, 
            message: 'Converting to MP3...' 
          });
        }
      }
    };
    
    pyshell.on('message', function (message) {
      processOutput(message);
      
      if (mainWindow) {
        // Also handle title extraction
        if (message.includes('Title:') || message.includes('📺 Title:')) {
          const title = message.split('Title: ')[1] || message.split('📺 Title: ')[1];
          if (title) {
            mainWindow.webContents.send('download-info', { 
              appId, 
              title: title.trim()
            });
          }
        }
        
        // Detect completion from various messages
        if (message.includes('Download completed') || 
            message.includes('✅') ||
            message.includes('[Merger] Merging formats') ||
            message.includes('Deleting original file')) {
          downloadCompleted = true;
          mainWindow.webContents.send('download-complete', { 
            appId, 
            message 
          });
        }
        
        // Detect actual errors (not warnings)
        if (message.includes('ERROR:') || message.includes('❌ Download error:')) {
          hasError = true;
          mainWindow.webContents.send('download-error', { 
            appId, 
            error: message 
          });
        }
      }
    });
    
    // Also listen to stderr where yt-dlp sends progress updates
    pyshell.on('stderr', function (stderr) {
      // Process stderr output for progress and other info
      processOutput(stderr);
      
      if (mainWindow) {
        // Same handlers as message event
        if (stderr.includes('Title:') || stderr.includes('📺 Title:')) {
          const title = stderr.split('Title: ')[1] || stderr.split('📺 Title: ')[1];
          if (title) {
            mainWindow.webContents.send('download-info', { 
              appId, 
              title: title.trim()
            });
          }
        }
      }
    });

    pyshell.on('error', function (err) {
      console.error(`[${appId}] Error:`, err);
      hasError = true;
      if (mainWindow && !downloadCompleted) {
        mainWindow.webContents.send('download-error', { 
          appId, 
          error: err.message 
        });
      }
    });

    pyshell.on('close', function (code) {
      console.log(`[${appId}] Process closed with code ${code}`);
      delete pythonProcesses[appId];
      
      // Only send completion if we haven't detected it yet and there were no errors
      if (mainWindow && !downloadCompleted && !hasError && code === 0) {
        mainWindow.webContents.send('download-complete', { 
          appId, 
          message: 'Download completed successfully' 
        });
      }
    });

    return true;
    
  } catch (error) {
    console.error(`Failed to start download process for ${appId}:`, error);
    if (mainWindow) {
      mainWindow.webContents.send('download-error', { 
        appId, 
        error: error.message 
      });
    }
    return false;
  }
}

// Generic Python app launcher
function startPythonApp(appId, args = []) {
  try {
    // Look up the app config to get the correct script path and python path
    const appCfg = appsConfig.apps.find(a => a.id === appId);
    const scriptDir = appCfg
      ? path.join(__dirname, appCfg.scriptPath)
      : path.join(__dirname, 'python-apps', appId.replace(/-/g, '_'));

    let pythonPath;
    if (appCfg && appCfg.pythonPath) {
      pythonPath = appCfg.pythonPath.startsWith('env/')
        ? path.join(__dirname, appCfg.pythonPath)
        : appCfg.pythonPath;
    } else {
      pythonPath = path.join(__dirname, 'env', 'Scripts', 'python.exe');
    }
    if (!fs.existsSync(pythonPath)) pythonPath = 'python';

    const mainScript = (appCfg && appCfg.mainScript) ? appCfg.mainScript : 'main.py';

    const options = {
      mode: 'text',
      encoding: 'utf8',
      pythonPath,
      pythonOptions: ['-u'],
      scriptPath: scriptDir,
      args: args,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    };

    console.log(`Starting ${appId} with options:`, options);
    
    const pyshell = new PythonShell(mainScript, options);
    pythonProcesses[appId] = pyshell;

    pyshell.on('message', function (message) {
      // Route frame data to dedicated channel to avoid flooding the text console
      if (message.startsWith('FRAME:')) {
        if (mainWindow) {
          mainWindow.webContents.send('python-frame', { appId, frame: message.slice(6) });
        }
        return;
      }
      console.log(`[${appId}]`, message);
      if (mainWindow) {
        mainWindow.webContents.send('python-output', { 
          appId, 
          message, 
          type: 'output' 
        });
      }
    });

    pyshell.on('error', function (err) {
      console.error(`[${appId}] Error:`, err);
      if (mainWindow) {
        mainWindow.webContents.send('python-output', { 
          appId, 
          message: `Error: ${err.message}`, 
          type: 'error' 
        });
      }
    });

    pyshell.on('close', function (code) {
      console.log(`[${appId}] Process closed with code ${code}`);
      delete pythonProcesses[appId];
      
      if (mainWindow) {
        mainWindow.webContents.send('python-output', { 
          appId, 
          message: `Process closed with code ${code}`, 
          type: code === 0 ? 'info' : 'error'
        });
      }
    });

    return true;
    
  } catch (error) {
    console.error(`Failed to start Python app ${appId}:`, error);
    if (mainWindow) {
      mainWindow.webContents.send('python-output', { 
        appId, 
        message: `Failed to start: ${error.message}`, 
        type: 'error'
      });
    }
    return false;
  }
}

// App lifecycle events
app.whenReady().then(() => {
  createWindow();
  
  // Load app configuration and initialize Python apps
  initializePythonApps();
  
  // IPC handlers for renderer communication
  ipcMain.handle('get-apps', () => appsConfig.apps);
  ipcMain.handle('launch-app', (event, appId) => launchApp(appId));
  ipcMain.handle('terminate-app', (event, appId) => {
    if (pythonProcesses[appId]) {
      pythonProcesses[appId].terminate();
      delete pythonProcesses[appId];
      return true;
    }
    return false;
  });
  
  ipcMain.handle('close-app', () => {
    app.quit();
  });
  
  ipcMain.handle('minimize-app', () => {
    if (mainWindow) mainWindow.minimize();
  });
  
  ipcMain.handle('maximize-app', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  // Python process management handlers
  ipcMain.handle('start-download', (event, appId, url, quality) => {
    return startDownloadProcess(appId, url, quality);
  });

  ipcMain.handle('cancel-download', (event, appId) => {
    if (pythonProcesses[appId]) {
      pythonProcesses[appId].kill();
      delete pythonProcesses[appId];
      return true;
    }
    return false;
  });

  ipcMain.handle('start-python-app', (event, appId, args) => {
    return startPythonApp(appId, args);
  });

  ipcMain.handle('send-input', (event, appId, input) => {
    if (pythonProcesses[appId]) {
      pythonProcesses[appId].send(input);
      return true;
    }
    return false;
  });

  ipcMain.handle('stop-python-app', (event, appId) => {
    if (pythonProcesses[appId]) {
      pythonProcesses[appId].kill();
      delete pythonProcesses[appId];
      mainWindow.webContents.send('python-output', { appId, message: 'Process stopped', type: 'info' });
      return true;
    }
    return false;
  });

  // Health report file handlers
  ipcMain.handle('list-health-reports', () => {
    const outputDir = path.join(__dirname, 'python-apps', 'analyse', 'output');
    try {
      if (!fs.existsSync(outputDir)) return [];
      return fs.readdirSync(outputDir)
        .filter(f => f.endsWith('.json') && !f.endsWith('_report.json'))
        .map(f => {
          const full = path.join(outputDir, f);
          const stat = fs.statSync(full);
          return { name: f, path: full, size: stat.size, mtime: stat.mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);
    } catch (e) {
      return [];
    }
  });

  ipcMain.handle('read-health-report', (event, filePath) => {
    try {
      // Restrict to the analyse output directory to prevent path traversal
      const allowed = path.resolve(path.join(__dirname, 'python-apps', 'analyse', 'output'));
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(allowed)) throw new Error('Access denied');
      return JSON.parse(fs.readFileSync(resolved, 'utf8'));
    } catch (e) {
      return null;
    }
  });

  // System metrics handler
  ipcMain.handle('get-system-metrics', () => {
    return getSystemMetrics();
  });
  
  // macOS-specific behavior
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    terminateAllPythonProcesses();
    app.quit();
  }
});

// Clean up before exit
app.on('before-quit', () => {
  terminateAllPythonProcesses();
});