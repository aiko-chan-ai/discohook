import type { QueryData } from "~/types/QueryData";

export interface EmojiGuildData {
  guild_id: string | null;   // null = Application Emoji (global)
  name?: string | null;      // guild display name
  icon_url: string | null;   // guild icon URL
  emojis: { id: string; name: string; animated?: boolean }[];
}

export type EditorMode =
  | { type: "create" }
  | { type: "edit"; messageType: "standard" | "components-v2" };

export type DataChangeCallback = (data: { messages: QueryData["messages"] }) => void;

export interface DiscohookEditorAPI {
  setMode(modeType: "create" | "edit", messageType?: "standard" | "components-v2"): void;
  getMode(): EditorMode;
  getData(): { messages: QueryData["messages"] };
  setData(newData: { messages: QueryData["messages"] }): void;
  onDataChange(callback: DataChangeCallback): () => void;
  importCustomEmojis(guilds: EmojiGuildData[]): void;
  setProfile(profile: BotProfile): void;
  getProfile(): BotProfile | null;
  getFiles(): File[];
}

export interface BotProfile {
  username: string;
  avatar_url: string | null;
  token?: string;
}

export interface ElectronAPI {
  reactReady(): void;
}

declare global {
  interface Window {
    DiscohookEditor: DiscohookEditorAPI;
    electronAPI?: ElectronAPI;
  }
}
