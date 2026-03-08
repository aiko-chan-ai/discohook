import {
  ButtonStyle,
  MessageFlags,
} from "discord-api-types/v10";
import { useCallback, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { twJoin, twMerge } from "tailwind-merge";
import { UAParser } from "ua-parser-js";
import type { BotProfile, EditorMode } from "~/api/EditorAPI";
import { Button } from "~/components/Button";
import { useError } from "~/components/Error";
import { Header } from "~/components/Header";
import { MessageEditor } from "~/components/editor/MessageEditor.client";
import { CoolIcon } from "~/components/icons/CoolIcon";
import { Logo } from "~/components/icons/Logo";
import { Message } from "~/components/preview/Message.client";
import { useEditorAPI } from "~/hooks/useEditorAPI";
import { useElectronBridge } from "~/hooks/useElectronBridge";
import {
  ComponentEditModal,
  type EditingComponentData,
} from "~/modals/ComponentEditModal";
import { useConfirmModal } from "~/modals/ConfirmModal";
import { ImageModal, type ImageModalProps } from "~/modals/ImageModal";
import {
  JsonEditorModal,
  type JsonEditorProps,
} from "~/modals/JsonEditorModal";
import { MessageAllowedMentionsModal } from "~/modals/MessageAllowedMentionsModal";
import { MessageFlagsEditModal } from "~/modals/MessageFlagsEditModal";
import type {
  QueryData,
} from "~/types/QueryData";
import type { DraftFile } from "~/types/editor";
import { useCache } from "~/util/cache/CacheManager";
import {
  isComponentsV2,
} from "~/util/discord";
import { useDragManager } from "~/util/drag";
import { ATTACHMENT_URI_EXTENSIONS, transformFileName } from "~/util/files";
import { useLocalStorage } from "~/util/localstorage";
import { copyText, randomString } from "~/util/text";

export const getQdMessageId = (message: QueryData["messages"][number]) => {
  if (message._id) return message._id;
  const id = randomString(10);
  message._id = id;
  return id;
};

declare const __APP_VERSION__: string;
const EDITOR_VERSION = __APP_VERSION__;

export const EditorPage: React.FC = () => {
  const { t } = useTranslation();
  const [settings] = useLocalStorage();
  const [error, setError] = useError(t);
  const cache = useCache();

  // Editor mode state
  const [mode, setMode] = useState<EditorMode>({ type: "create" });

  // Editor state - always a single message
  const [files, setFiles] = useState<Record<string, DraftFile[]>>({});
  const [data, setData] = useReducer(
    (_cur: QueryData, d: QueryData) => {
      const newData = d;
      setFiles(
        Object.fromEntries(
          newData.messages.map((d) => [
            getQdMessageId(d),
            files[getQdMessageId(d)]?.map((f) => {
              const uri = `attachment://${transformFileName(f.file.name)}`;
              if (
                ATTACHMENT_URI_EXTENSIONS.find((ext) =>
                  f.file.name.toLowerCase().endsWith(ext),
                ) !== undefined
              ) {
                f.embed =
                  !!d.data.embeds &&
                  d.data.embeds?.filter(
                    (e) =>
                      e.author?.icon_url?.trim() === uri ||
                      e.image?.url?.trim() === uri ||
                      e.thumbnail?.url?.trim() === uri ||
                      e.footer?.icon_url?.trim() === uri,
                  ).length !== 0;
                if (f.embed && f.is_thumbnail) {
                  f.is_thumbnail = false;
                }
              }
              return f;
            }) ?? [],
          ]),
        ),
      );
      return newData;
    },
    {
      version: "d2",
      messages: [{ data: {} }],
    },
  );

  const [editingComponent, setEditingComponent] =
    useState<EditingComponentData>();
  const drag = useDragManager();
  const [editingMessageFlags, setEditingMessageFlags] = useState<number>();
  const [editingAllowedMentions, setEditingAllowedMentions] = useState<number>();
  const [imageModalData, setImageModalData] = useState<ImageModalProps>();
  const [jsonEditor, setJsonEditor] = useState<JsonEditorProps>();
  const [confirm, setConfirm] = useConfirmModal();
  const [tab, setTab] = useState<"editor" | "preview">("editor");
  const profileRef = useRef<BotProfile | null>(null);
  const [profile, setProfileState] = useState<BotProfile | null>(null);

  const ua = new UAParser(navigator.userAgent).getResult();

  // The single message
  const message = data.messages[0];
  const messageId = message ? getQdMessageId(message) : "";
  const isCV2 = message ? isComponentsV2(message.data) : false;

  // Mode constraints for Standard option
  const standardDisabled =
    mode.type === "edit" && mode.messageType === "components-v2";

  // Handle mode switch from header toggle
  const handleModeSwitch = useCallback(
    (toCV2: boolean) => {
      if (!message) return;

      // In create mode, clear content when switching
      if (mode.type === "create") {
        if (toCV2 && !isCV2) {
          // Switch to Components V2 - clear standard content
          setData({
            ...data,
            messages: [{
              _id: message._id,
              data: { flags: MessageFlags.IsComponentsV2 },
            }],
          });
        } else if (!toCV2 && isCV2) {
          // Switch to Standard - clear CV2 content
          setData({
            ...data,
            messages: [{
              _id: message._id,
              data: {},
            }],
          });
        }
      } else {
        // Edit mode - clear content and switch format
        if (toCV2 && !isCV2) {
          setData({
            ...data,
            messages: [{
              _id: message._id,
              data: { flags: MessageFlags.IsComponentsV2 },
            }],
          });
        } else if (!toCV2 && isCV2 && !standardDisabled) {
          setData({
            ...data,
            messages: [{
              _id: message._id,
              data: {},
            }],
          });
        }
      }
    },
    [message, isCV2, standardDisabled, data, setData, mode],
  );

  // EditorAPI bridge
  const setModeCallback = useCallback(
    (m: EditorMode) => setMode(m),
    [],
  );
  useEditorAPI(data, setData, mode, setModeCallback, cache, handleModeSwitch, files, profileRef, setProfileState);

  // Electron MessagePort bridge
  const { sendToHost } = useElectronBridge({
    onInit: (msg) => {
      // Set profile from host
      if (msg.profile) {
        profileRef.current = msg.profile;
        setProfileState(msg.profile);
      }
      // Set mode from host
      if (msg.mode) {
        const m = msg.mode;
        if (m.type === "create") {
          setMode({ type: "create" });
          if (m.messageType) {
            handleModeSwitch(m.messageType === "components-v2");
          }
        } else if (m.type === "edit" && m.messageType) {
          setMode({ type: "edit", messageType: m.messageType });
          handleModeSwitch(m.messageType === "components-v2");
        }
      }
      // Set initial message data from host
      if (msg.messages && msg.messages.length > 0) {
        setData({ version: "d2", messages: msg.messages });
      }
      // Set custom emojis from host
      if (msg.emojis && msg.emojis.length > 0) {
        window.DiscohookEditor.importCustomEmojis(msg.emojis);
      }
    },
  });

  // Handle Send / Edit button click
  const handleSend = useCallback(() => {
    const messageData = data.messages;
    const attachedFiles: File[] = [];
    for (const draftFiles of Object.values(files)) {
      for (const df of draftFiles) {
        attachedFiles.push(df.file);
      }
    }
    const profile = profileRef.current;

    sendToHost({
      type: "submit",
      action: mode.type === "edit" ? "edit" : "send",
      profile,
      messages: messageData,
      rawFiles: attachedFiles,
    });
  }, [data, files, mode, sendToHost]);

  return (
    <div className="h-screen overflow-hidden">
      <ComponentEditModal
        open={!!editingComponent}
        setOpen={() => setEditingComponent(undefined)}
        {...editingComponent}
        submit={undefined}
      />
      <MessageFlagsEditModal
        open={editingMessageFlags !== undefined}
        setOpen={() => setEditingMessageFlags(undefined)}
        data={data}
        setData={setData}
        messageIndex={editingMessageFlags}
      />
      <MessageAllowedMentionsModal
        open={editingAllowedMentions !== undefined}
        setOpen={() => setEditingAllowedMentions(undefined)}
        messageIndex={editingAllowedMentions}
        data={data}
        setData={setData}
        cache={cache}
      />
      <JsonEditorModal
        open={!!jsonEditor}
        setOpen={() => setJsonEditor(undefined)}
        {...jsonEditor}
      />
      {confirm}
      <ImageModal
        {...imageModalData}
        clear={() => setImageModalData(undefined)}
      />
      <Header
        isComponentsV2={isCV2}
        onModeSwitch={handleModeSwitch}
        standardDisabled={standardDisabled}
      />
      <div
        className={twJoin(
          "h-[calc(100%_-_3rem)]",
          settings.forceDualPane ? "flex" : "md:flex",
        )}
      >
        <div
          className={twMerge(
            "py-4 h-full overflow-y-scroll",
            settings.forceDualPane
              ? "w-1/2"
              : twJoin("md:w-1/2", tab === "editor" ? "" : "hidden md:block"),
          )}
        >
          <div className="px-4">
            {error}
            <div className="flex">
              <Button
                className={twJoin(
                  "ms-auto",
                  settings.forceDualPane ? "hidden" : "md:hidden",
                )}
                onClick={() => setTab("preview")}
                discordstyle={ButtonStyle.Secondary}
              >
                {t("preview")}{" "}
                <CoolIcon icon="Chevron_Right" rtl="Chevron_Left" />
              </Button>
            </div>
          </div>
          {/* Single message editor */}
          {message && (
            <MessageEditor
              key={`edit-message-${messageId}`}
              index={0}
              data={data}
              files={files[messageId] ?? []}
              discordApplicationId=""
              setData={setData}
              setFiles={(newF) =>
                setFiles({ ...files, [messageId]: newF as DraftFile[] })
              }
              setEditingMessageFlags={setEditingMessageFlags}
              setEditingAllowedMentions={setEditingAllowedMentions}
              setJsonEditor={setJsonEditor}
              setEditingComponent={setEditingComponent}
              drag={drag}
              cache={cache}
              onSend={handleSend}
              sendLabel={mode.type === "edit" ? t("editMessage") : t("sendMessage")}
            />
          )}
          <div className="px-4">
            <hr className="border border-gray-400 dark:border-gray-600 my-6" />
            <div className="grayscale hover:grayscale-0 group flex text-sm opacity-60 hover:opacity-100 transition-opacity">
              <div className="mb-auto mt-1 ms-2">
                <Logo />
              </div>
              <div className="ms-6">
                <p>
                  Powered by DiscordBotClient. Built upon the open-source Discohook project by shay & contributors.
                </p>
                <p>
                  This is a modified version and is not affiliated with the original creators.
                </p>
                <hr className="border-gray-400 dark:border-gray-600 mb-1 mt-2" />
                <button
                  type="button"
                  className="text-muted dark:text-muted-dark text-xs text-start"
                  title={t("clickToCopy")}
                  onClick={(e) => copyText(e.currentTarget.textContent ?? "")}
                >
                  Discohook {EDITOR_VERSION}
                  {"\n"}
                  <br />
                  {ua.browser.name} {ua.browser.version} ({ua.engine.name})
                  {"\n"}
                  <br />
                  {ua.os.name} {ua.os.version}
                </button>
                <hr className="border-gray-400 dark:border-gray-600 mt-1 mb-2" />
                <p className="flex flex-wrap gap-2">
                  <a
                    href="https://github.com/discohook/discohook"
                    className="underline hover:no-underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Original Source (GitHub)
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          className={twMerge(
            "h-full flex-col",
            "border-s-gray-400 dark:border-s-[#1E1F22]",
            settings.forceDualPane
              ? "flex w-1/2 border-s-2"
              : twJoin(
                  "md:w-1/2 md:border-s-2",
                  tab === "preview" ? "flex" : "hidden md:flex",
                ),
          )}
        >
          <div className="overflow-y-scroll grow p-4 pb-8">
            <div className={settings.forceDualPane ? "hidden" : "md:hidden"}>
              <Button
                onClick={() => setTab("editor")}
                discordstyle={ButtonStyle.Secondary}
              >
                <CoolIcon icon="Chevron_Left" rtl="Chevron_Right" />{" "}
                {t("editor")}
              </Button>
              <hr className="border border-gray-400 dark:border-gray-600 my-4" />
            </div>
            {message && (
              <Message
                key={`preview-message-${messageId}`}
                message={{
                  ...message.data,
                  ...(profile ? {
                    username: profile.username,
                    avatar_url: profile.avatar_url ?? undefined,
                  } : {}),
                }}
                discordApplicationId=""
                cache={cache}
                index={0}
                data={data}
                files={files[messageId]}
                setImageModalData={setImageModalData}
                messageDisplay={settings.messageDisplay}
                compactAvatars={settings.compactAvatars}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
