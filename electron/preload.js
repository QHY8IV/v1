const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 数据库操作
  dbQuery: (sql, params) => window.electronAPI.dbQuery(sql, params),
  dbExecute: (sql, params) => window.electronAPI.dbExecute(sql, params),
  // 窗口控制
  minimizeWindow: () => window.electronAPI.minimizeWindow(),
  maximizeWindow: () => window.electronAPI.maximizeWindow(),
  closeWindow: () => window.electronAPI.closeWindow(),
  // 文件操作
  openFile: () => window.electronAPI.openFile()
});
