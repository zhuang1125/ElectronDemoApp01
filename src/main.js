import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { autoUpdater } from 'electron-updater';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  
  // 存储窗口引用
  global.mainWindow = mainWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// 自动更新检查函数
function checkForUpdates() {
  const { ipcMain } = require('electron');
  
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'http://localhost/electron-updates'
  });
  
  // 设置自动更新选项
  autoUpdater.autoDownload = false; // 不自动下载，让用户确认
  autoUpdater.autoInstallOnAppQuit = false; // 退出时不自动安装
  
  // IPC通信处理
  ipcMain.on('check-for-update', () => {
    autoUpdater.checkForUpdates();
  });
  
  // 同步获取版本信息
  ipcMain.on('get-version', (event) => {
    event.returnValue = app.getVersion();
  });
  
  // 异步获取版本信息
  ipcMain.on('request-version', (event) => {
    event.reply('version-response', app.getVersion());
  });
  
  ipcMain.on('download-update', () => {
    autoUpdater.downloadUpdate();
  });
  
  autoUpdater.on('checking-for-update', () => {
    console.log('检查更新中...');
    sendStatusToWindow('正在检查更新...', 'info');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本:', info.version);
    sendStatusToWindow(`发现新版本 ${info.version}`, 'success', true, info.version);
  });
  
  autoUpdater.on('update-not-available', (info) => {
    console.log('当前已是最新版本');
    sendStatusToWindow('当前已是最新版本', 'success', false);
  });
  
  autoUpdater.on('error', (err) => {
    console.error('更新检查失败:', err);
    sendStatusToWindow(`更新检查失败: ${err.message}`, 'error');
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "下载速度: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - 下载 ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
    
    // 发送下载进度到渲染进程
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('download-progress', {
        percent: Math.round(progressObj.percent)
      });
    }
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('新版本下载完成');
    sendStatusToWindow('新版本下载完成', 'success');
    
    // 发送下载完成消息到渲染进程
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('download-complete', {});
    }
    
    // 显示安装提示
    const { dialog } = require('electron');
    dialog.showMessageBox({
      type: 'info',
      title: '下载完成',
      message: '新版本已下载完成，是否立即安装？',
      buttons: ['立即安装', '稍后安装'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
}

// 发送状态到渲染进程
function sendStatusToWindow(message, type = 'info', hasUpdate = false, version = '') {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    global.mainWindow.webContents.send('update-status', {
      message,
      type,
      hasUpdate,
      version
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  // 检查更新
  checkForUpdates();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
