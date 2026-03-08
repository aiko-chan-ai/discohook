# Discohook Editor JS API

The Editor exposes a global JavaScript API on the `window` object to allow external wrappers and parent windows to interact with and control the editor state. 

You can access the API via `window.DiscohookEditor`.

## Interface

```typescript
interface DiscohookEditorAPI {
  // Mode Management
  getMode(): EditorMode;
  setMode(modeType: "create" | "edit", messageType?: "standard" | "components-v2"): void;

  // Data Management
  getData(): { messages: any[] };
  setData(newData: { messages: any[] }): void;
  onDataChange(callback: (data: { messages: any[] }) => void): () => void;

  // Profile Management
  setProfile(profile: BotProfile): void;
  getProfile(): BotProfile | null;

  // Files
  getFiles(): File[];

  // Utilities
  importCustomEmojis(guilds: EmojiGuildData[]): void;
}
```

---

## Methods

### `getMode()`
Returns the current operational mode of the editor.
- **Returns:** `EditorMode` object.

```typescript
type EditorMode = 
  | { type: "create" }
  | { type: "edit"; messageType: "standard" | "components-v2" };
```

### `setMode(modeType, messageType?)`
Updates the editor's current mode. This determines whether the editor acts as a clean slate (Create) or locks into an existing message format (Edit).

- **`modeType`**: `"create" | "edit"`
- **`messageType`** *(optional)*: `"standard" | "components-v2"`. Required if `modeType` is `"edit"`.

**Example:**
```js
// Switch to creating a new message
window.DiscohookEditor.setMode("create");

// Lock editor to editing a Components V2 message
window.DiscohookEditor.setMode("edit", "components-v2");
```

### `getData()`
Retrieves the current raw JSON message data from the editor.
- **Returns:** `{ messages: any[] }` containing the current array of Discohook messages (following the Discord API structure).

### `setData(newData)`
Replaces the editor's current message payload with the provided data.
- **`newData`**: `{ messages: any[] }` containing the array of messages to inject into the editor.

**Example:**
```js
window.DiscohookEditor.setData({
  messages: [{
    data: {
      content: "Hello World!"
    }
  }]
});
```

### `onDataChange(callback)`
Subscribes to all data changes within the editor (e.g., when the user types a character, adds an embed, or clicks a button). 

- **`callback`**: `(data: { messages: any[] }) => void` Function that runs whenever data mutates.
- **Returns:** A cleanup or unsubscribe function `() => void`.

**Example:**
```js
const unsubscribe = window.DiscohookEditor.onDataChange((data) => {
  console.log("Editor content updated:", data.messages);
});

// To stop listening:
// unsubscribe();
```

### `importCustomEmojis(guilds)`
Allows injecting custom Discord emojis into the editor's local cache so that they populate cleanly inside the standard Emoji Picker. 

- **`guilds`**: Array of `EmojiGuildData` objects. If a guild is `null`, it acts as a global application emoji.

```typescript
interface EmojiGuildData {
  guild_id: string | null;  
  icon_url: string | null;
  name: string | null;  
  emojis: { 
    id: string; 
    name: string; 
    animated?: boolean;
  }[];
}
```

**Example:**
```js
window.DiscohookEditor.importCustomEmojis([
  {
    guild_id: "123456789012345678",
    icon_url: "https://cdn.discordapp.com/icons/123.../icon.webp",
    emojis: [
      { id: "987654321098765432", name: "pepe_happy", animated: false }
    ]
  }
]);
```

---

## Profile Management

### `setProfile(profile)`
Sets the bot profile that will be used when sending messages (username, avatar, and optionally a token).

```typescript
interface BotProfile {
  username: string;
  avatar_url: string | null;
  token?: string;
}
```

**Example:**
```js
window.DiscohookEditor.setProfile({
  username: "MyBot",
  avatar_url: "https://cdn.discordapp.com/avatars/123.../avatar.webp",
  token: "<unused>" // optional
});
```

### `getProfile()`
Returns the currently set bot profile, or `null` if none has been set.

### `getFiles()`
Returns all attached `File` objects from the editor's draft file list. These can be used to send as multipart form data alongside the message JSON.

**Example:**
```js
const files = window.DiscohookEditor.getFiles();
console.log(`${files.length} files attached`);
for (const file of files) {
  console.log(file.name, file.size, file.type);
}
```

---

## Send / Edit Button

The editor includes a **Send Message** / **Edit Message** button (green, right-aligned next to Add/Options). When clicked, it logs the following to the browser console:

- **Mode** — current `EditorMode` object
- **Profile** — the `BotProfile` set via `setProfile()`, or `null`
- **Message Data** — full JSON payload of the message(s)
- **Attached Files** — array of `File` objects

This is designed to be replaced with an Electron `MessageChannel` or `ipcRenderer.send()` call when integrating into a desktop wrapper.

