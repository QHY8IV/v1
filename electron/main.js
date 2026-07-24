const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const initSqlJs = require('sql.js');
const fs = require('fs');

let mainWindow;
let db = null;
const DB_PATH = path.join(app.getPath('userData'), 'feiman-tutor.db');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    backgroundColor: '#F0F5FF'
  });

  if (true) { // development mode always
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initDatabase() {
  // 尝试从 node_modules 加载 WASM
  const wasmPath = path.join(
    require('electron').app.getAppPath ? require('electron').app.getAppPath() : process.cwd(),
    'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'
  );

  const SQL = await initSqlJs({
    locateFile: file => {
      if (fs.existsSync(wasmPath)) {
        return wasmPath;
      }
      return `https://sql.js.org/dist/${file}`;
    }
  });

  let sqlDB;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlDB = new SQL.Database(buffer);
  } else {
    sqlDB = new SQL.Database();
  }

  // 建表
  sqlDB.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '小明',
      grade INTEGER DEFAULT 3,
      avatar TEXT DEFAULT '👦',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  sqlDB.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER DEFAULT 1,
      day_of_week INTEGER NOT NULL,
      time TEXT NOT NULL,
      topic TEXT NOT NULL,
      knowledge_point TEXT,
      color TEXT DEFAULT '#4A90D9',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  sqlDB.run(`
    CREATE TABLE IF NOT EXISTS lesson_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER DEFAULT 1,
      schedule_id INTEGER,
      date DATE NOT NULL,
      duration_minutes INTEGER DEFAULT 25,
      clarity_score REAL DEFAULT 0,
      logic_score REAL DEFAULT 0,
      completeness_score REAL DEFAULT 0,
      ai_comment TEXT,
      reward_amount REAL DEFAULT 1.0,
      status TEXT DEFAULT 'completed'
    )
  `);

  sqlDB.run(`
    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER DEFAULT 1,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  sqlDB.run(`
    CREATE TABLE IF NOT EXISTS credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER DEFAULT 1,
      balance REAL DEFAULT 50.0,
      total_earned REAL DEFAULT 0.0,
      total_spent REAL DEFAULT 0.0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 默认数据
  const rows = sqlDB.exec("SELECT COUNT(*) as cnt FROM students WHERE id = 1");
  const count = rows.length > 0 ? rows[0].values[0][0] : 0;
  if (count === 0) {
    sqlDB.run("INSERT INTO students (id, name, grade) VALUES (1, '小明', 3)");
  }

  const cRows = sqlDB.exec("SELECT COUNT(*) as cnt FROM credits WHERE id = 1");
  const cCount = cRows.length > 0 ? cRows[0].values[0][0] : 0;
  if (cCount === 0) {
    sqlDB.run("INSERT INTO credits (id, balance) VALUES (1, 50)");
  }

  saveDatabase(sqlDB);
  return sqlDB;
}

function saveDatabase(sqlDB) {
  const data = sqlDB.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// IPC
ipcMain.handle('db:query', async (event, sql, params = []) => {
  if (!db) return [];
  try {
    const results = db.exec(sql, params);
    if (!results.length) return [];
    const columns = results[0].columns;
    return results[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('db:execute', async (event, sql, params = []) => {
  if (!db) return { changes: 0 };
  try {
    const result = db.run(sql, params);
    saveDatabase(db);
    return { changes: result.changes };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.on('window:minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});
ipcMain.on('window:close', () => { if (mainWindow) mainWindow.close(); });

ipcMain.handle('dialog:openFile', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg'] }]
  });
  return result.filePaths;
});

app.whenReady().then(async () => {
  db = await initDatabase();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (db) saveDatabase(db);
  if (process.platform !== 'darwin') app.quit();
});
