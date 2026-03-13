import { useEffect, useRef } from "react";
import type { BotProfile, EmojiGuildData } from "~/api/EditorAPI";
import type { QueryData } from "~/types/QueryData";
import { transformFileName } from "~/util/files";

/**
 * Message types sent FROM Render A → Editor (incoming)
 */
export interface EditorIncomingMessage {
  type: "init";
  profile: BotProfile;
  mode: {
    type: "create" | "edit";
    messageType?: "standard" | "components-v2";
  };
  messages?: QueryData["messages"];
  emojis?: EmojiGuildData[];
}

/**
 * Message types sent FROM Editor → Render A (outgoing)
 */
export interface EditorOutgoingMessage {
  type: "submit";
  action: "send" | "edit";
  profile: BotProfile | null;
  messages: QueryData["messages"];
  // Files cannot be sent via MessagePort structured clone in all cases,
  // so we convert them to { name, size, type, buffer } objects
  files: { name: string; size: number; type: string; buffer: ArrayBuffer }[];
}

/**
 * Hook that sets up the Electron MessagePort bridge.
 *
 * When running inside Electron with a preload that exposes `window.electronAPI`,
 * this hook will:
 * 1. Call `electronAPI.reactReady()` to signal the main process
 * 2. Listen for a MessagePort via `window.addEventListener('message')` with
 *    the signal `'forward-editor-port'` (the preload forwards the port this way
 *    because `contextBridge` cannot pass native `MessagePort` objects)
 * 3. On receiving the port, listen for incoming `EditorIncomingMessage`
 * 4. Provide a `sendToHost()` function to post `EditorOutgoingMessage` back
 *
 * When running in a normal browser, this hook is a no-op.
 */
export function useElectronBridge(callbacks: {
  onInit: (msg: EditorIncomingMessage) => void;
}) {
  const portRef = useRef<MessagePort | null>(null);

  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (!electronAPI) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.source === window && event.data === "forward-editor-port") {
        const port = event.ports[0];
        if (!port) return;
        if (portRef.current) {
            portRef.current.close();
        }
        portRef.current = port;
        port.onmessage = (msgEvent: MessageEvent) => {
          const msg = msgEvent.data as EditorIncomingMessage;
          if (msg.type === "init") {
            console.log("Received init message:", msg);
            callbacks.onInit(msg);
          }
        };
        port.start();
      }
    };
    window.addEventListener("message", handleMessage);
    electronAPI.reactReady();
    return () => {
      window.removeEventListener("message", handleMessage);
      if (portRef.current) {
        portRef.current.close();
        portRef.current = null;
      }
    };
  }, []);

  /**
   * Send the edited message data back to the host (Render A)
   */
  const sendToHost = async (msg: Omit<EditorOutgoingMessage, "files"> & { rawFiles: File[] }) => {
    // Convert File objects to transferable ArrayBuffer payloads
    const filePayloads: EditorOutgoingMessage["files"] = [];
    for (const file of msg.rawFiles) {
      const buffer = await file.arrayBuffer();
      filePayloads.push({
        name: transformFileName(file.name), // Ensure the filename is transformed the same way as in the editor for attachment:// URLs
        size: file.size,
        type: file.type,
        buffer,
      });
    }

    const outgoing: EditorOutgoingMessage = {
      type: "submit",
      action: msg.action,
      profile: msg.profile,
      messages: msg.messages,
      files: filePayloads,
    };

    if (portRef.current) {
      // Transfer the ArrayBuffers for zero-copy performance
      const transferables = filePayloads.map((f) => f.buffer);
      portRef.current.postMessage(outgoing, transferables);
      // Close the port after sending, since we only need one message back to the host
      portRef.current.close();
      // Close window
      window.electronAPI?.closeWindow();
    } else {
      // Fallback: console log when not in Electron
      console.group(
        `%c[DiscohookEditor] ${msg.action === "edit" ? "Edit" : "Send"} Message`,
        "color: #5865f2; font-weight: bold;",
      );
      console.log("Profile:", msg.profile);
      console.log("Message Data:", msg.messages);
      console.log(`Attached Files (${msg.rawFiles.length}):`, msg.rawFiles);
      console.groupEnd();
    }
  };

  return { portRef, sendToHost };
}