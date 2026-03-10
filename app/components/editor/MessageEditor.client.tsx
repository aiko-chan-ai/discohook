import { Collapsible } from "@base-ui-components/react/collapsible";
import {
  ButtonStyle,
  ComponentType,
  MessageFlags,
} from "discord-api-types/v10";

import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { twJoin, twMerge } from "tailwind-merge";
import type { EditingComponentData } from "~/modals/ComponentEditModal";
import type { JsonEditorProps } from "~/modals/JsonEditorModal";
import {
  Modal,
  ModalFooter,
  type ModalProps,
  PlainModalHeader,
} from "~/modals/Modal";
import { getQdMessageId } from "~/pages/EditorPage";
import type { DraftFile } from "~/types/editor";
import type { TFunction } from "~/types/i18next";
import { type QueryData, ZodQueryDataMessage } from "~/types/QueryData";
import type {
  CacheManager,
  ResolvableAPIChannel,
} from "~/util/cache/CacheManager";
import { MAX_TOTAL_COMPONENTS, MAX_V1_ROWS } from "~/util/constants";
import { isComponentsV2, onlyActionRows } from "~/util/discord";
import type { DragManager } from "~/util/drag";
import {
  fileInputChangeHandler,
  MAX_FILES_PER_MESSAGE,
  transformFileName,
} from "~/util/files";
import { getMessageDisplayName } from "~/util/message";
import { randomString } from "~/util/text";
import { Button } from "../Button";
import { ButtonSelect } from "../ButtonSelect";
import { Checkbox } from "../Checkbox";
import { collapsibleStyles } from "../collapsible";
import { CoolIcon } from "../icons/CoolIcon";
import { InfoBox } from "../InfoBox";
import { isAudioType } from "../preview/FileAttachment";
import { linkClassName } from "../preview/Markdown";
import { TextArea } from "../TextArea";
import { TextInput } from "../TextInput";
import { ActionRowEditor } from "./ComponentEditor";
import { AutoTopLevelComponentEditor } from "./ContainerEditor";
import { DragArea } from "./DragArea";
import {
  EmbedEditor,
  EmbedEditorSection,
  getEmbedLength
} from "./EmbedEditor";
import { PasteFileButton } from "./PasteFileButton";

const FilePreview = ({
  file,
  className,
}: {
  file: DraftFile;
  className?: string;
}) => {
  const style = twJoin("rounded-xl", className);
  if (file.file.type.startsWith("image/") && file.url) {
    return <img src={file.url} className={style} alt="" />;
  } else if (file.file.type.startsWith("video/") && file.url) {
    return (
      <video
        src={file.url}
        className={twJoin("pointer-events-none", style)}
        muted
        autoPlay={false}
        controls={false}
      />
    );
  }
  return (
    <div
      className={twJoin(
        "bg-gray-200 dark:bg-gray-800 p-4 hidden sm:flex",
        style,
      )}
    >
      <CoolIcon icon="File_Document" className="text-4xl m-auto" />
    </div>
  );
};

const FileEditModal = (
  props: ModalProps & { file?: DraftFile; onSave: (file: DraftFile) => void },
) => {
  const { t } = useTranslation();
  const { file, onSave, ...restProps } = props;

  const [draft, setDraft] = useState<DraftFile>();
  const [name, setName] = useState<string>();
  useEffect(() => {
    // File#name is read-only so we wait until we save to duplicate it
    setName(file ? file.file.name : undefined);
    setDraft(file ? { ...file } : undefined);
  }, [file]);

  return (
    <Modal {...restProps}>
      <PlainModalHeader>
        {file ? transformFileName(file.file.name) : "File"}
      </PlainModalHeader>
      {draft ? (
        <div className="flex flex-wrap-reverse md:flex-nowrap">
          <div className="space-y-2 grow">
            <div>
              <TextInput
                label={t("filename")}
                className="w-full"
                onChange={(e) => setName(e.currentTarget.value)}
                value={name ?? ""}
                required
              />
            </div>
            {draft.file.type.startsWith("image/") ? (
              <div>
                <TextArea
                  label={t("fileDescription")}
                  placeholder={t("fileDescriptionPlaceholder")}
                  className="w-full"
                  onChange={(e) => {
                    setDraft({
                      ...draft,
                      description: e.currentTarget.value,
                    });
                  }}
                  value={draft.description ?? ""}
                  short
                />
              </div>
            ) : null}
            <div>
              <Checkbox
                label={t("markSpoiler")}
                onCheckedChange={(checked) => {
                  setDraft({ ...draft, spoiler: checked });
                }}
                checked={draft.spoiler}
              />
            </div>
          </div>
          <div className="mb-2 sm:mt-0 sm:mb-0 sm:ltr:ml-4 sm:rtl:mr-4 w-full sm:max-w-[33%]">
            <FilePreview file={draft} className="max-h-32 sm:max-h-60 w-full" />
          </div>
        </div>
      ) : (
        <div />
      )}
      <ModalFooter className="flex gap-2 flex-wrap">
        <button
          className={twJoin("ltr:ml-auto rtl:mr-auto", linkClassName)}
          type="button"
          onClick={() => {
            props.setOpen(false);
          }}
        >
          {t("cancel")}
        </button>
        <Button
          onClick={() => {
            props.setOpen(false);
            if (draft && name) {
              onSave({
                ...draft,
                // should reuse the same blob in memory
                file: new File([draft.file], name, {
                  type: draft.file.type,
                }),
              });
            }
          }}
        >
          {t("save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const MessageNameModal = (
  props: ModalProps & { name?: string; onSave: (name: string) => void },
) => {
  const { t } = useTranslation();
  const { name, onSave, ...restProps } = props;

  const [draft, setDraft] = useState(name);
  useEffect(() => {
    setDraft(name);
  }, [name]);

  return (
    <Modal {...restProps}>
      <form className="contents" onSubmit={(e) => e.preventDefault()}>
        <TextInput
          value={draft ?? ""}
          label={t("messageName")}
          onChange={({ currentTarget }) => {
            setDraft(currentTarget.value);
          }}
          maxLength={50}
          className="w-full"
        />
        <ModalFooter className="flex gap-2 flex-wrap mt-0">
          <button
            className={twJoin("ms-auto", linkClassName)}
            type="button"
            onClick={() => {
              props.setOpen(false);
            }}
          >
            {t("cancel")}
          </button>
          <Button
            type="submit"
            onClick={() => {
              props.setOpen(false);
              if (draft !== undefined) {
                onSave(draft);
              }
            }}
          >
            {t("save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

interface MessageEditorProps {
  data: QueryData;
  files: DraftFile[];
  discordApplicationId: string;
  index: number;
  setData: React.Dispatch<QueryData>;
  setFiles: React.Dispatch<React.SetStateAction<DraftFile[]>>;
  setEditingMessageFlags: React.Dispatch<
    React.SetStateAction<number | undefined>
  >;
  setEditingAllowedMentions: React.Dispatch<
    React.SetStateAction<number | undefined>
  >;
  setEditingComponent: React.Dispatch<
    React.SetStateAction<EditingComponentData | undefined>
  >;
  setJsonEditor: React.Dispatch<
    React.SetStateAction<JsonEditorProps | undefined>
  >;
  drag?: DragManager;
  cache?: CacheManager;
  cdn?: string;
  onSend?: () => void;
  sendLabel?: string;
}

export const MessageEditor: React.FC<MessageEditorProps> = (props) => {
  const { t } = useTranslation();
  const message = props.data.messages[props.index];
  // const id = getQdMessageId(message);

  // Hooks
  const [editingFile, setEditingFile] = useState<DraftFile>();
  const [editingName, setEditingName] = useState(false);

  const childProps: MessageEditorChildProps = {
    ...props,
    t,
    setEditingFile,
    setEditingName,
  };

  return (
    <div className="contents">
      <FileEditModal
        open={!!editingFile}
        setOpen={() => setEditingFile(undefined)}
        file={editingFile}
        onSave={(file) => {
          props.setFiles(props.files.map((f) => (f.id === file.id ? file : f)));
          props.setData({ ...props.data });
        }}
      />
      <MessageNameModal
        name={message.name}
        onSave={(newName) => {
          message.name = newName.trim() || undefined;
          props.setData({ ...props.data });
        }}
        open={editingName}
        setOpen={setEditingName}
      />
      {isComponentsV2(message.data) ? (
        <ComponentMessageEditor {...childProps} />
      ) : (
        <StandardMessageEditor {...childProps} />
      )}
    </div>
  );
};

const getUsernameErrors = (
  t: TFunction,
  username: string | undefined,
): React.ReactNode[] => {
  if (!username) return [];

  const errors: React.ReactNode[] = [];
  const lower = username.toLowerCase();
  for (const forbidden of ["discord", "clyde", "```", "system message"]) {
    if (lower.includes(forbidden)) {
      errors.push(
        t("usernameForbiddenSubstring", { replace: { substring: forbidden } }),
      );
    }
  }
  for (const forbidden of ["everyone", "here"]) {
    if (lower === forbidden) {
      errors.push(
        t("usernameForbiddenString", { replace: { substring: forbidden } }),
      );
    }
  }

  return errors;
};

type MessageEditorChildProps = MessageEditorProps & {
  t: TFunction;
  setEditingFile: React.Dispatch<React.SetStateAction<DraftFile | undefined>>;
  setEditingName: React.Dispatch<React.SetStateAction<boolean>>;
};

const MessageEditorCollapsibleTrigger = ({
  t,
  index: i,
  message,
  data,
  setData,
  setEditingName,
}: {
  t: TFunction;
  message: MessageEditorChildProps["data"]["messages"][number];
} & Pick<
  MessageEditorChildProps,
  "data" | "setData" | "setEditingName" | "index"
>) => {
  const flags = message.data.flags ?? 0;
  return (
    <div className="font-semibold text-base cursor-default select-none mx-4 flex items-center">
      <Collapsible.Trigger
        className={twMerge(
          collapsibleStyles.trigger,
          "gap-inherit cursor-default truncate",
        )}
      >
        <CoolIcon
          icon="Chevron_Right"
          className="group-data-[panel-open]/trigger:rotate-90 me-2 my-auto transition-transform"
        />
        <span className="truncate">
          {((flags & MessageFlags.SuppressNotifications) !== 0) && (
            <CoolIcon
              icon="Bell_Off"
              title={t("messageFlag.4096")}
              className="me-1"
            />
          )}
          {((flags & MessageFlags.SuppressEmbeds) !== 0) && (
            <CoolIcon
              icon="Window_Close"
              title={t("messageFlag.4")}
              className="me-1"
            />
          )}
          {message.data.allowed_mentions ? (
            <CoolIcon
              icon="Bell_Remove"
              title={t("allowedMentionsEnabled")}
              className="me-1"
            />
          ) : null}
          {getMessageDisplayName(t, i, message)}
        </span>
      </Collapsible.Trigger>
      <div className="ms-auto space-x-2 rtl:space-x-reverse my-auto shrink-0">
        <button
          type="button"
          className={i === 0 ? "hidden" : ""}
          onClick={() => {
            data.messages.splice(i, 1);
            data.messages.splice(i - 1, 0, message);
            setData({ ...data });
          }}
        >
          <CoolIcon icon="Chevron_Up" />
        </button>
        <button
          type="button"
          className={i === data.messages.length - 1 ? "hidden" : ""}
          onClick={() => {
            data.messages.splice(i, 1);
            data.messages.splice(i + 1, 0, message);
            setData({ ...data });
          }}
        >
          <CoolIcon icon="Chevron_Down" />
        </button>
        <button type="button" onClick={() => setEditingName(true)}>
          <CoolIcon icon="Edit_Pencil_01" />
        </button>
        <button
          type="button"
          className={data.messages.length >= 10 ? "hidden" : ""}
          onClick={() => {
            const cloned = structuredClone(message);
            cloned._id = randomString(10);
            data.messages.splice(i + 1, 0, cloned);
            setData({ ...data });
          }}
        >
          <CoolIcon icon="Copy" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (data.messages.length <= 1) {
              data.messages.splice(i, 1, { data: {} });
            } else {
              data.messages.splice(i, 1);
            }
            setData({ ...data });
          }}
        >
          <CoolIcon icon="Trash_Full" />
        </button>
      </div>
    </div>
  );
};

const StandardMessageEditor: React.FC<MessageEditorChildProps> = ({
  index: i,
  data,
  files,
  discordApplicationId,
  setData,
  setFiles,
  setEditingMessageFlags,
  setEditingAllowedMentions,
  setEditingComponent,
  setJsonEditor,
  cache,
  cdn,
  onSend,
  sendLabel,
  // Parent
  t,
  setEditingFile,
  setEditingName,
}) => {
  const message = data.messages[i];
  const id = getQdMessageId(message);
  const embedsLength =
    message.data.embeds && message.data.embeds.length > 0
      ? message.data.embeds.map(getEmbedLength).reduce((a, b) => a + b)
      : 0;
  const flags = message.data.flags ?? 0;

  const webhooks: any[] = [];
  const authorTypes: any[] = [];
  const possiblyActionable = false;
  const possiblyApplication = false;
  const channels: ResolvableAPIChannel[] = [];

  const isAllForum = false;
  const isNoneForum = false;

  const imageFiles = useMemo(
    () => files.filter((f) => f.file.type.startsWith("image/")),
    [files],
  );
  const thumbnailFileId = imageFiles.find((f) => f.is_thumbnail)?.id ?? null;

  return (
    <Collapsible.Root
      className="group/message my-2 pt-2 pb-2 bg-[#EFEFF0] dark:bg-[#292b2f] border-y border-gray-400 dark:border-[#1E1F22]"
      defaultOpen
    >
      <MessageEditorCollapsibleTrigger
        t={t}
        index={i}
        message={message}
        data={data}
        setData={setData}
        setEditingName={setEditingName}
      />
      <Collapsible.Panel
        className={twMerge(collapsibleStyles.editorPanel, "px-4 space-y-2")}
      >
        <TextArea
          label={t("content")}
          className="w-full h-40"
          value={message.data.content ?? ""}
          maxLength={2000}
          freeLength
          markdown="full"
          cache={cache}
          onInput={(e) => {
            message.data.content = e.currentTarget.value || undefined;
            setData({ ...data });
          }}
        />
        <div className="-space-y-2 -mx-2">

          <EmbedEditorSection
            name={t("filesCount", {
              replace: { count: files.length },
            })}
          >
            {files.map((draftFile) => {
              const { id, file, embed, is_thumbnail, url } = draftFile;
              return (
                <div
                  key={`file-${id}`}
                  className="rounded-lg border py-1.5 px-[14px] bg-background-secondary border-border-normal dark:border-border-normal-dark dark:bg-background-secondary-dark flex"
                >
                  <Button
                    onClick={() => setEditingMessageFlags(i)}
                    className={
                      ((message.data.flags ?? 0) & MessageFlags.IsVoiceMessage) !== 0
                        ? "ring-2 ring-primary bg-primary/20 hover:bg-primary/30"
                        : undefined
                    }
                  >
                    <CoolIcon
                      icon={
                        embed
                          ? "Window"
                          : is_thumbnail
                            ? "Chat"
                            : ((message.data.flags ?? 0) & MessageFlags.IsVoiceMessage) !== 0 &&
                                isAudioType(file.type)
                              ? "Phone"
                              : "File_Blank"
                      }
                      className="text-xl my-auto me-2"
                    />
                  </Button>
                  <div className="my-auto truncate me-2">
                    <p className="font-medium truncate">
                      {transformFileName(file.name)}
                    </p>
                    {/* <p className="text-sm">{file.size} bytes</p> */}
                  </div>
                  <button
                    type="button"
                    className="ms-auto my-auto hover:text-blurple text-xl"
                    onClick={() => setEditingFile(draftFile)}
                  >
                    <CoolIcon icon="Edit_Pencil_01" />
                  </button>
                  <button
                    type="button"
                    className="ms-1 my-auto hover:text-red-400 text-xl"
                    onClick={() => {
                      const newFiles = files.filter((f) => f.id !== id);
                      setFiles(newFiles);
                      setData({ ...data });
                      if (url) URL.revokeObjectURL(url);
                    }}
                  >
                    <CoolIcon icon="Trash_Full" />
                  </button>
                </div>
              );
            })}
            <input
              id={`files-${id}`}
              type="file"
              hidden
              multiple
              onChange={fileInputChangeHandler(files, setFiles)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>(
                    `input#files-${id}`,
                  );
                  // Shouldn't happen
                  if (!input) return;
                  input.click();
                }}
                disabled={files.length >= MAX_FILES_PER_MESSAGE}
              >
                {t("addFile")}
              </Button>
              <PasteFileButton
                t={t}
                disabled={files.length >= MAX_FILES_PER_MESSAGE}
                onChange={async (list) => {
                  const newFiles = [...files];
                  for (const file of Array.from(list).slice(
                    0,
                    MAX_FILES_PER_MESSAGE - newFiles.length,
                  )) {
                    newFiles.push({
                      id: randomString(10),
                      file,
                      url: URL.createObjectURL(file),
                    });
                  }
                  setFiles(newFiles);
                }}
              />
            </div>
          </EmbedEditorSection>
        </div>
        {message.data.embeds && message.data.embeds.length > 0 && (
          <div className="mt-1 space-y-1">
            {embedsLength > 6000 && (
              <div className="-mb-2">
                <InfoBox severity="red" icon="Circle_Warning">
                  <Trans i18nKey="embedsTooLarge" count={embedsLength - 6000} />
                </InfoBox>
              </div>
            )}
            {((flags & MessageFlags.SuppressEmbeds) !== 0) && (
              <div className="-mb-2">
                <InfoBox severity="yellow" icon="Circle_Warning">
                  {t("embedsHidden")}
                </InfoBox>
              </div>
            )}
            {message.data.embeds.map((embed, ei) => (
              <EmbedEditor
                key={`edit-message-${id}-embed-${ei}`}
                message={message}
                messageIndex={i}
                embed={embed}
                embedIndex={ei}
                data={data}
                setData={setData}
                files={files}
                setFiles={setFiles}
                cache={cache}
                cdn={cdn}
              />
            ))}
          </div>
        )}
        {message.data.components && message.data.components.length > 0 && (
          <>

            <div className="space-y-1">
              {onlyActionRows(message.data.components).map((row, ri) => (
                <div key={`edit-message-${id}-row-${ri}`}>
                  <ActionRowEditor
                    message={message}
                    component={row}
                    parent={undefined}
                    index={ri}
                    data={data}
                    setData={setData}
                    cache={cache}
                    setEditingComponent={setEditingComponent}
                    open
                  />
                </div>
              ))}
            </div>
          </>
        )}
        <div className="flex space-x-2 rtl:space-x-reverse">
          <div>
            <ButtonSelect
              options={[
                {
                  label: t("addEmbed"),
                  icon: "Add_Plus_Square",
                  value: "embed",
                  disabled:
                    !!message.data.embeds && message.data.embeds.length >= 10,
                },
                {
                  label: t(
                    message.data.components &&
                      message.data.components.length >= 1
                      ? "addRow"
                      : "addComponents",
                  ),
                  icon: "Add_Row",
                  value: "row",
                  disabled:
                    !!message.data.components &&
                    message.data.components.length >= MAX_V1_ROWS,
                },
                // {
                //   label: t("addPoll"),
                //   value: "poll",
                //   disabled: !!message.data.poll,
                // },
              ]}
              onValueChange={(value) => {
                switch (value) {
                  case "embed": {
                    message.data.embeds = message.data.embeds
                      ? [...message.data.embeds, {}]
                      : [{}];
                    setData({ ...data });
                    break;
                  }
                  case "row": {
                    const emptyRow = { type: 1, components: [] };
                    message.data.components = message.data.components
                      ? [...message.data.components, emptyRow]
                      : [emptyRow];
                    setData({ ...data });
                    break;
                  }
                  default:
                    break;
                }
              }}
            >
              {t("add")}
            </ButtonSelect>
          </div>

          <div>
            <ButtonSelect<
              | "flags"
              | "jsonEditor"
              | "allowedMentions"
            >
              discordstyle={ButtonStyle.Secondary}
              options={[
                {
                  label: t("flags"),
                  icon: "Flag",
                  value: "flags",
                },
                {
                  label: t("jsonEditor"),
                  icon: "Terminal",
                  value: "jsonEditor",
                },
                {
                  label: t("allowedMentions"),
                  icon: "Bell_Ring",
                  value: "allowedMentions",
                },
              ]}
              onValueChange={(value) => {
                switch (value) {
                  case "flags": {
                    setEditingMessageFlags(i);
                    break;
                  }
                  case "jsonEditor":
                    setJsonEditor({
                      data: message.data,
                      update: (newData) => {
                        message.data = newData;
                      },
                      schema: ZodQueryDataMessage.shape.data,
                    });
                    break;
                  case "allowedMentions":
                    setEditingAllowedMentions(i);
                    break;
                  default:
                    break;
                }
              }}
            >
              {t("options")}
            </ButtonSelect>
          </div>
          {onSend && (
            <div className="flex-1 flex justify-end ms-auto">
              <Button
                discordstyle={ButtonStyle.Success}
                onClick={onSend}
              >
                {sendLabel ?? t("send")}
              </Button>
            </div>
          )}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
};

// Blank message with cv2 flag: http://localhost:8788/?data=eyJ2ZXJzaW9uIjoiZDIiLCJtZXNzYWdlcyI6W3siX2lkIjoiOWZNd0QxYzVLZCIsImRhdGEiOnsiY29tcG9uZW50cyI6W10sImZsYWdzIjozMjc2OH19XX0
/** Components V2-based editor */
const ComponentMessageEditor: React.FC<MessageEditorChildProps> = ({
  index: i,
  data,
  files,
  // discordApplicationId,
  setData,
  setFiles,
  setEditingMessageFlags,
  setEditingAllowedMentions,
  setEditingComponent,
  setJsonEditor,
  cache,
  cdn,
  drag,
  onSend,
  sendLabel,
  // Parent
  t,
  setEditingFile,
  setEditingName,
}) => {
  const message = data.messages[i];
  const mid = getQdMessageId(message);
  const components = message.data.components ?? [];

  const allComponentsCount =
    components.length > 0
      ? components
          // Add one because top-level also included in count
          //              Section, Container, ActionRow
          .map((c) => 1 + ("components" in c ? c.components.length : 0))
          .reduce((a, b) => a + b, 0)
      : 0;

  const webhooks: any[] = [];
  const channels: ResolvableAPIChannel[] = [];

  const isAllForum = false;
  const isNoneForum = false;

  const imageFiles = useMemo(
    () => files.filter((f) => f.file.type.startsWith("image/")),
    [files],
  );
  const thumbnailFileId = imageFiles.find((f) => f.is_thumbnail)?.id ?? null;

  return (
    <Collapsible.Root
      className="group/message my-2 pt-2 pb-2 bg-[#EFEFF0] dark:bg-[#292b2f] border-y border-gray-400 dark:border-[#1E1F22]"
      defaultOpen
    >
      <MessageEditorCollapsibleTrigger
        t={t}
        index={i}
        message={message}
        data={data}
        setData={setData}
        setEditingName={setEditingName}
      />
      <Collapsible.Panel
        className={twMerge(collapsibleStyles.editorPanel, "px-4 space-y-2")}
      >
        <div className="-space-y-2 -mx-2">

          <EmbedEditorSection
            name={t("filesCount", {
              replace: { count: files.length },
            })}
          >
            {files.length === 0 ? (
              <p className="text-muted dark:text-muted-dark text-sm italic">
                {t("filesComponentsOnly")}
              </p>
            ) : (
              files.map((draftFile) => {
                const { id, file, embed, is_thumbnail, url } = draftFile;
                return (
                  <div
                    key={`file-${id}`}
                    className="rounded-lg border py-1.5 px-[14px] bg-background-secondary border-border-normal dark:border-border-normal-dark dark:bg-background-secondary-dark flex"
                  >
                    <Button
                      onClick={() => setEditingMessageFlags(i)}
                      className={
                        ((message.data.flags ?? 0) & MessageFlags.IsVoiceMessage) !== 0
                          ? "ring-2 ring-primary bg-primary/20 hover:bg-primary/30"
                          : undefined
                      }
                    >
                      <CoolIcon
                        icon={
                          embed
                            ? "Window"
                            : is_thumbnail
                              ? "Chat"
                              : ((message.data.flags ?? 0) & MessageFlags.IsVoiceMessage) !== 0 &&
                                  isAudioType(file.type)
                                ? "Phone"
                                : "File_Blank"
                        }
                        className="text-xl my-auto ltr:mr-2 rtl:ml-2"
                      />
                    </Button>
                    <div className="my-auto truncate ltr:mr-2 rtl:ml-2">
                      <p className="font-medium truncate">
                        {transformFileName(file.name)}
                      </p>
                      {/* <p className="text-sm">{file.size} bytes</p> */}
                    </div>
                    <button
                      type="button"
                      className="ltr:ml-auto rtl:mr-auto my-auto hover:text-blurple text-xl"
                      onClick={() => setEditingFile(draftFile)}
                    >
                      <CoolIcon icon="Edit_Pencil_01" />
                    </button>
                    <button
                      type="button"
                      className="ms-1 my-auto hover:text-red-400 text-xl"
                      onClick={() => {
                        const newFiles = files.filter((f) => f.id !== id);
                        setFiles(newFiles);
                        setData({ ...data });
                        if (url) URL.revokeObjectURL(url);
                      }}
                    >
                      <CoolIcon icon="Trash_Full" />
                    </button>
                  </div>
                );
              })
            )}
          </EmbedEditorSection>
        </div>
        <div className="space-y-1">
          {components.map((component, i) => {
            const key = `${mid}-top-${i}`;
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: we can't nest all this in a button
              <div
                key={`top-level-component-${i}`}
                className="relative"
                onDragOver={() => drag?.setFocusKey(key)}
                onDragExit={() => drag?.setFocusKey(undefined)}
              >
                <AutoTopLevelComponentEditor
                  message={message}
                  index={i}
                  data={data}
                  setData={setData}
                  cache={cache}
                  cdn={cdn}
                  component={component}
                  parent={undefined}
                  files={files}
                  setFiles={setFiles}
                  setEditingComponent={setEditingComponent}
                  drag={drag}
                  open
                />
                <DragArea
                  visible={drag?.isFocused(key) ?? false}
                  position={
                    !drag?.data || drag.data.parentType
                      ? "bottom"
                      : i < drag.data.index
                        ? "top"
                        : "bottom"
                  }
                  onDrop={() => {
                    drag?.end();
                    drag?.onDrop?.(mid, { path: [i] });
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <div>
            <ButtonSelect
              disabled={allComponentsCount >= MAX_TOTAL_COMPONENTS}
              options={[
                {
                  label: t("content"),
                  icon: "Text",
                  value: ComponentType.TextDisplay,
                },
                {
                  label: t("component.17"),
                  icon: "Add_Plus_Square",
                  value: ComponentType.Container,
                },
                {
                  label: t("component.12"),
                  icon: "Image_01",
                  value: ComponentType.MediaGallery,
                },
                {
                  // Any single file
                  label: t("file"),
                  icon: "File_Blank",
                  value: ComponentType.File,
                },
                {
                  label: t("component.14"),
                  icon: "Line_L",
                  value: ComponentType.Separator,
                },
                {
                  label: t("component.1"),
                  icon: "Rows",
                  value: ComponentType.ActionRow,
                },
              ]}
              onValueChange={(value) => {
                switch (value) {
                  case ComponentType.TextDisplay: {
                    message.data.components = [
                      ...components,
                      { type: ComponentType.TextDisplay, content: "" },
                    ];
                    setData({ ...data });
                    break;
                  }
                  case ComponentType.Container: {
                    message.data.components = [
                      ...components,
                      { type: ComponentType.Container, components: [] },
                    ];
                    setData({ ...data });
                    break;
                  }
                  case ComponentType.File: {
                    message.data.components = [
                      ...components,
                      { type: ComponentType.File, file: { url: "" } },
                    ];
                    setData({ ...data });
                    break;
                  }
                  case ComponentType.MediaGallery: {
                    message.data.components = [
                      ...components,
                      { type: ComponentType.MediaGallery, items: [] },
                    ];
                    setData({ ...data });
                    break;
                  }
                  case ComponentType.Separator: {
                    message.data.components = [
                      ...components,
                      { type: ComponentType.Separator },
                    ];
                    setData({ ...data });
                    break;
                  }
                  case ComponentType.ActionRow: {
                    message.data.components = [
                      ...components,
                      { type: ComponentType.ActionRow, components: [] },
                    ];
                    setData({ ...data });
                    break;
                  }
                  default:
                    break;
                }
              }}
            >
              {t("add")}
            </ButtonSelect>
          </div>

          <div>
            <ButtonSelect<
              | "flags"
              | "jsonEditor"
              | "allowedMentions"
            >
              discordstyle={ButtonStyle.Secondary}
              options={[
                {
                  label: t("flags"),
                  icon: "Flag",
                  value: "flags",
                },
                {
                  label: t("jsonEditor"),
                  icon: "Terminal",
                  value: "jsonEditor",
                },
                {
                  label: t("allowedMentions"),
                  icon: "Bell_Ring",
                  value: "allowedMentions",
                },
              ]}
              onValueChange={(value) => {
                switch (value) {
                  case "flags": {
                    setEditingMessageFlags(i);
                    break;
                  }
                  case "jsonEditor":
                    setJsonEditor({
                      data: message.data,
                      update: (newData) => {
                        message.data = newData;
                      },
                      schema: ZodQueryDataMessage.shape.data,
                    });
                    break;
                  case "allowedMentions":
                    setEditingAllowedMentions(i);
                    break;
                  default:
                    break;
                }
              }}
            >
              {t("options")}
            </ButtonSelect>
          </div>
          {onSend && (
            <div className="flex-1 flex justify-end ms-auto">
              <Button
                discordstyle={ButtonStyle.Success}
                onClick={onSend}
              >
                {sendLabel ?? t("send")}
              </Button>
            </div>
          )}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
};
