# Discohook Editor (Custom)

> **⚠️ Disclaimer:** This is a **modified version** of the [Discohook](https://github.com/discohook/discohook) editor. It is **not affiliated with, endorsed by, or connected to** the original authors or project in any way.
>
> AI tools were used extensively to assist with building, debugging, refactoring, and writing documentation for this project.

A lightweight, static Discord message editor and previewer — stripped down from the original Discohook project for embedding in desktop applications (Electron).

## What's Different

This fork removes all server-dependent features from the original Discohook and converts it from a Remix SSR app into a **static Vite + React SPA**:

| Removed                            | Kept                                    |
| ---------------------------------- | --------------------------------------- |
| Authentication & Login             | Message Editor (Standard & Components V2) |
| Webhooks & Webhook management      | Live Preview                            |
| Sharing, oEmbed, Link Shortener    | Embeds, Buttons, Select Menus, etc.     |
| Flows & Triggers                   | File Attachments                        |
| Server/Bot management              | JSON Editor Modal                       |
| Backups & Database                 | Emoji Picker (with custom emoji support)|
| Code Generator & Query URL data    | Allowed Mentions                        |
| Thread & Profile sections          | Send/Edit Message button                |
| Help Modal, Donate & Support links | Full JS API for external control        |

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server runs on `http://localhost:5173` by default.

## JS API

The editor exposes `window.DiscohookEditor` for programmatic control. See [JS_API.md](./JS_API.md) for full documentation.

```js
// Set editor mode
window.DiscohookEditor.setMode("edit", "standard");

// Set bot profile (reflected in preview)
window.DiscohookEditor.setProfile({
  username: "MyBot",
  avatar_url: "https://cdn.discordapp.com/avatars/123/abc.webp",
  token: "<unused>"
});

// Get message data
const data = window.DiscohookEditor.getData();

// Import custom emojis (grouped by guild)
window.DiscohookEditor.importCustomEmojis([
  {
    guild_id: "123456789",
    name: "My Server",
    icon_url: "https://cdn.discordapp.com/icons/123/icon.webp",
    emojis: [
      { id: "987654321", name: "pepe_happy", animated: false }
    ]
  }
]);
```

## Electron Integration

This editor is designed to be embedded in Electron apps via `MessageChannelMain` for zero-IPC-overhead bidirectional communication.

### Workflow

1. **Main App (Render A)** opens the editor in a `BrowserWindow`
2. Main process creates `MessageChannelMain`, sends `port1` → Render A, `port2` → Editor
3. Render A sends `init` message with profile, mode, and message data
4. User edits the message in the Editor
5. User clicks **Send/Edit** → Editor posts `submit` message back to Render A

### Preload Script (Editor)

```js
const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  reactReady: () => ipcRenderer.send('editor-react-ready'),
});

// Forward MessagePort via window.postMessage (contextBridge can't pass native ports)
ipcRenderer.on('receive-port', (event) => {
  const [port] = event.ports;
  window.postMessage('forward-editor-port', '*', [port]);
});
```

### Message Protocol

**Incoming (Render A → Editor):**
```ts
{ type: "init", profile: BotProfile, mode: { type, messageType? }, messages?: [...], emojis?: [...] }
```

**Outgoing (Editor → Render A):**
```ts
{ type: "submit", action: "send" | "edit", profile, messages, files: [{ name, size, type, buffer }] }
```

When not running inside Electron, the Send button falls back to `console.log`.

## Tech Stack

- **Vite** + **React** (TypeScript)
- **Tailwind CSS**
- **discord-api-types** for Discord type definitions
- **i18next** for internationalization
- **highlight.js** for code block syntax highlighting

## License

AGPL-3.0-or-later — Same as the original Discohook project.

## Credits

- Original project: [Discohook](https://github.com/discohook/discohook) by shay & contributors
- This modified version: Built with AI assistance for code generation, refactoring, bug fixing, and documentation
