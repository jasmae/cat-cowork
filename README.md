# 🐱 Cat Cowork

A desktop pet cat powered by Claude AI. The cat walks around your screen, and when you click it, a chat window opens where you can ask it to do things — just like Cowork.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Add your API key
cp .env.example .env
# Edit .env and paste your Anthropic API key

# 3. Run
npm start
```

## Controls

- **Click the cat** → opens/closes the chat window
- **Drag the cat** → reposition it on screen
- **Right-click tray icon** → menu with Chat and Quit options
- **Shift+Enter** in chat → new line (Enter sends)

## Customizing the Cat Sprite

The placeholder cat is built with CSS. To use your own pixel art:

1. Create a spritesheet PNG with frames laid out horizontally:
   - Frame 0: idle
   - Frame 1-2: walk cycle
   - Frame 3: sitting

2. Save it to `pet/sprites/cat-sheet.png`

3. In `pet/pet.html`, replace the CSS cat divs with a single `<div id="cat"></div>` and update the styles:

```css
#cat {
  width: 64px;
  height: 64px;
  background-image: url('./sprites/cat-sheet.png');
  background-size: 256px 64px;  /* 4 frames × 64px */
  image-rendering: pixelated;
}

/* Animate walk cycle */
.walking #cat {
  animation: walk-cycle 0.4s steps(2) infinite;
}

@keyframes walk-cycle {
  from { background-position: -64px 0; }
  to   { background-position: -192px 0; }
}

.sitting #cat {
  background-position: -192px 0;
}
```

## Project Structure

```
cat-cowork/
├── main.js           ← Electron main process
├── preload.js        ← Secure IPC bridge
├── pet/
│   ├── pet.html      ← Cat sprite & animation
│   └── sprites/      ← Your custom sprites go here
├── chat/
│   └── chat.html     ← Chat panel UI
├── .env              ← Your API key (git-ignored)
├── .env.example
└── package.json
```

## Tips

- The chat uses `claude-sonnet-4-20250514` by default. Change the model in `main.js` if you prefer a different one.
- Conversation history persists until you clear it (⟲ button) or restart.
- The cat walks along the bottom of your screen and bounces off the edges.
