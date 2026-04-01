const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

let petWindow = null;
let chatWindow = null;
let tray = null;

// ── Pet Window ──────────────────────────────────────────────
function createPetWindow() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  petWindow = new BrowserWindow({
    width: 128,
    height: 128,
    x: Math.floor(screenW / 2),
    y: screenH - 90,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  petWindow.loadFile(path.join(__dirname, "pet", "pet.html"));
  petWindow.setIgnoreMouseEvents(false);
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Start the cat walking
  startWalking();
}

// ── Cat Movement ────────────────────────────────────────────
let walkInterval = null;
let direction = 1; // 1 = right, -1 = left
let idleTicks = 0;
let isIdle = false;

function startWalking() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const speed = 2;
  const groundY = screenH - 90;

  walkInterval = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed()) return;

    // Occasionally idle
    if (isIdle) {
      idleTicks--;
      if (idleTicks <= 0) {
        isIdle = false;
        direction = Math.random() > 0.5 ? 1 : -1;
        petWindow.webContents.send("pet:state", direction === 1 ? "walk-right" : "walk-left");
      }
      return;
    }

    // Random chance to stop and idle
    if (Math.random() < 0.005) {
      isIdle = true;
      idleTicks = Math.floor(Math.random() * 100) + 50;
      petWindow.webContents.send("pet:state", "idle");
      return;
    }

    const [x, y] = petWindow.getPosition();
    let newX = x + speed * direction;

    // Bounce off screen edges
    if (newX > screenW - 128) {
      direction = -1;
      petWindow.webContents.send("pet:state", "walk-left");
    } else if (newX < 0) {
      direction = 1;
      petWindow.webContents.send("pet:state", "walk-right");
    }

    petWindow.setPosition(Math.max(0, Math.min(newX, screenW - 128)), groundY);
  }, 30);
}

// ── Chat Window ─────────────────────────────────────────────
function toggleChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
  if (chatWindow.isVisible()) {
    chatWindow.hide();
    petWindow.webContents.send("pet:state", "idle");
  } else {
    chatWindow.show();
    petWindow.webContents.send("pet:state", "sit");
  }
  return;
  }

  const [petX, petY] = petWindow.getPosition();

  chatWindow = new BrowserWindow({
    width: 420,
    height: 560,
    x: petX - 150,
    y: petY - 580,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    hasShadow: true,
    vibrancy: "under-window",
    visualEffectState: "active",
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  chatWindow.loadFile(path.join(__dirname, "chat", "chat.html"));

  // Cat sits down when chat is open
  petWindow.webContents.send("pet:state", "sit");

  chatWindow.on("closed", () => {
    chatWindow = null;
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send("pet:state", "idle");
    }
  });
}

// ── Claude API ─────────────────────────────────────────────
const conversationHistory = [];

ipcMain.handle("chat:send", async (_event, userMessage) => {
  conversationHistory.push({ role: "user", content: userMessage });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: "No API key found. Add ANTHROPIC_API_KEY to .env file." };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system:
        "You are a helpful cat assistant living on the user's desktop as an Electron app. You have system access. You CAN open URLs in the user's browser. When the user asks you to open any website or URL, you MUST include [OPEN_URL:https://example.com] in your response — this triggers the app to open it automatically. Never say you can't open URLs. Never say you don't have system access. Just include the tag and confirm you're opening it. Example: if user says 'open YouTube', respond with 'Opening YouTube for you! [OPEN_URL:https://www.youtube.com]'. Keep answers concise and friendly with a playful cat personality.",
        messages: conversationHistory,
      }),
    });

    const data = await res.json();

    if (data.error) {
      conversationHistory.pop(); // remove failed user msg
      return { error: data.error.message || "API error" };
    }

    const reply = data.content.map((b) => b.text || "").join("\n");
    conversationHistory.push({ role: "assistant", content: reply });

    return { reply };
  } catch (err) {
    conversationHistory.pop();
    return { error: err.message };
  }
});

ipcMain.handle("chat:clear", () => {
  conversationHistory.length = 0;
  return true;
});

// ── IPC: Pet click → toggle chat ────────────────────────────
ipcMain.on("pet:clicked", () => toggleChatWindow());

// ── IPC: Drag the cat ───────────────────────────────────────
ipcMain.on("pet:drag", (_event, deltaX, deltaY) => {
  if (!petWindow) return;
  const [x, y] = petWindow.getPosition();
  petWindow.setPosition(x + deltaX, y + deltaY);
});
ipcMain.on("chat:minimize", () => {
  if (chatWindow) chatWindow.hide();
});

ipcMain.on("chat:close", () => {
  if (chatWindow) chatWindow.close();
});

// ── System Tray ─────────────────────────────────────────────
function createTray() {
  // 16x16 tiny cat icon (1-pixel art)
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAOklEQVQ4y2N" +
        "gGAWjIYCRgYHhPwMDA8P/////M0ABTCMUMAP1MKICRnQFTOgKGNHcwITuBi" +
        "Z0NwxhAADmhQn/tDIGiAAAAABJRU5ErkJggg==",
      "base64"
    )
  );
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Chat", click: () => toggleChatWindow() },
    { type: "separator" },
    { label: "Quit Cat Cowork", click: () => app.quit() },
  ]);
  tray.setToolTip("Cat Cowork");
  tray.setContextMenu(contextMenu);
}

// ── App Lifecycle ───────────────────────────────────────────
app.whenReady().then(() => {
  createPetWindow();
  createTray();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
