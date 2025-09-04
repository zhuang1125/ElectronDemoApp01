/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';

const { ipcRenderer } = require('electron');

console.log('👋 This message is being logged by "renderer.js", included via Vite');

// 获取DOM元素
const currentVersionEl = document.getElementById('current-version');
const latestVersionEl = document.getElementById('latest-version');
const checkUpdateBtn = document.getElementById('check-update-btn');
const downloadUpdateBtn = document.getElementById('download-update-btn');
const updateStatusEl = document.getElementById('update-status');

// 显示状态消息
function showStatus(message, type = 'info') {
  updateStatusEl.textContent = message;
  updateStatusEl.className = `status-message status-${type}`;
  updateStatusEl.style.display = 'block';
}

// 获取当前版本
function getCurrentVersion() {
  const { ipcRenderer } = require('electron');
  try {
    return ipcRenderer.sendSync('get-version');
  } catch (e) {
    // 如果同步通信失败，尝试异步方式
    return new Promise((resolve) => {
      ipcRenderer.once('version-response', (event, version) => {
        resolve(version);
      });
      ipcRenderer.send('request-version');
    });
  }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const currentVersion = await getCurrentVersion();
    currentVersionEl.textContent = currentVersion;
    showStatus('应用已启动，可以检查更新', 'info');
  } catch (error) {
    currentVersionEl.textContent = '1.0.0';
    showStatus('应用已启动，可以检查更新', 'info');
  }
});

// 检查更新按钮点击事件
checkUpdateBtn.addEventListener('click', () => {
  checkUpdateBtn.disabled = true;
  checkUpdateBtn.textContent = '检查中...';
  showStatus('正在检查更新...', 'info');
  
  // 发送检查更新事件到主进程
  ipcRenderer.send('check-for-update');
});

// 下载更新按钮点击事件
downloadUpdateBtn.addEventListener('click', () => {
  downloadUpdateBtn.disabled = true;
  downloadUpdateBtn.textContent = '下载中...';
  showStatus('正在下载更新...', 'info');
  
  // 发送下载更新事件到主进程
  ipcRenderer.send('download-update');
});

// 监听主进程发送的更新事件
ipcRenderer.on('update-status', (event, data) => {
  showStatus(data.message, data.type);
  
  if (data.type === 'success' && data.hasUpdate) {
    latestVersionEl.textContent = data.version;
    downloadUpdateBtn.style.display = 'inline-block';
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.textContent = '检查更新';
  } else if (data.type === 'success' && !data.hasUpdate) {
    getCurrentVersion().then(version => {
      latestVersionEl.textContent = version;
    });
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.textContent = '检查更新';
  } else if (data.type === 'error') {
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.textContent = '检查更新';
  }
});

ipcRenderer.on('download-progress', (event, data) => {
  showStatus(`下载进度: ${data.percent}%`, 'info');
});

ipcRenderer.on('download-complete', (event, data) => {
  showStatus('下载完成，准备安装', 'success');
  downloadUpdateBtn.textContent = '下载完成';
});

ipcRenderer.on('update-error', (event, data) => {
  showStatus(data.message, 'error');
  checkUpdateBtn.disabled = false;
  checkUpdateBtn.textContent = '检查更新';
  downloadUpdateBtn.disabled = false;
  downloadUpdateBtn.textContent = '下载更新';
});
