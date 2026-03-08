import { useEffect, useRef } from "react";
import type {
  BotProfile,
  DataChangeCallback,
  DiscohookEditorAPI,
  EditorMode,
  EmojiGuildData,
} from "~/api/EditorAPI";
import type { QueryData } from "~/types/QueryData";
import type { DraftFile } from "~/types/editor";
import type { CacheManager, ResolutionKey, ResolvableAPIEmoji } from "~/util/cache/CacheManager";

export function useEditorAPI(
  data: QueryData,
  setData: React.Dispatch<QueryData>,
  mode: EditorMode,
  setMode: (mode: EditorMode) => void,
  cache?: CacheManager,
  handleModeSwitch?: (toCV2: boolean) => void,
  filesMap?: Record<string, DraftFile[]>,
  profileRef?: React.MutableRefObject<BotProfile | null>,
  setProfileState?: (profile: BotProfile | null) => void,
) {
  const callbacksRef = useRef<Set<DataChangeCallback>>(new Set());
  const dataRef = useRef(data);
  const modeRef = useRef(mode);
  dataRef.current = data;
  modeRef.current = mode;

  // Notify subscribers when data changes
  useEffect(() => {
    for (const cb of callbacksRef.current) {
      cb({ messages: data.messages });
    }
  }, [data]);

  // Install global API
  useEffect(() => {
    const api: DiscohookEditorAPI = {
      setMode(
        modeType: "create" | "edit",
        messageType?: "standard" | "components-v2",
      ) {
        if (modeType === "create") {
          setMode({ type: "create" });
          // Also switch UI if messageType is specified
          if (messageType && handleModeSwitch) {
            handleModeSwitch(messageType === "components-v2");
          }
        } else if (modeType === "edit" && messageType) {
          setMode({ type: "edit", messageType });
          // Also switch UI
          if (handleModeSwitch) {
            handleModeSwitch(messageType === "components-v2");
          }
        }
      },
      getMode() {
        return modeRef.current;
      },
      getData() {
        return { messages: dataRef.current.messages };
      },
      setData(newData) {
        setData({ version: "d2", messages: newData.messages });
      },
      onDataChange(callback) {
        callbacksRef.current.add(callback);
        return () => {
          callbacksRef.current.delete(callback);
        };
      },
      importCustomEmojis(guilds: EmojiGuildData[]) {
        if (!cache) return;
        const entries: [ResolutionKey, ResolvableAPIEmoji][] = [];
        for (const guild of guilds) {
          for (const emoji of guild.emojis) {
            entries.push([
              `emoji:${emoji.id}` as ResolutionKey,
              {
                id: emoji.id,
                name: emoji.name,
                animated: emoji.animated || undefined,
              },
            ]);
          }
        }
        if (entries.length > 0) {
          cache.fill(...entries);
        }
        // Also store guild data for emoji picker categorization
        cache.customEmojiGuilds = guilds;
      },
      setProfile(profile: BotProfile) {
        if (profileRef) {
          profileRef.current = profile;
        }
        if (setProfileState) {
          setProfileState(profile);
        }
      },
      getProfile() {
        return profileRef?.current ?? null;
      },
      getFiles() {
        if (!filesMap) return [];
        const allFiles: File[] = [];
        for (const draftFiles of Object.values(filesMap)) {
          for (const df of draftFiles) {
            allFiles.push(df.file);
          }
        }
        return allFiles;
      },
    };

    window.DiscohookEditor = api;

    return () => {
      delete (window as any).DiscohookEditor;
    };
  }, [setData, setMode, cache, handleModeSwitch, filesMap, profileRef, setProfileState]);
}
