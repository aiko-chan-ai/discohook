import { isLinkButton } from "discord-api-types/utils/v10";
import {
    type APIActionRowComponent,
    type APIContainerComponent,
    ButtonStyle,
    ComponentType,
} from "discord-api-types/v10";
import { useTranslation } from "react-i18next";
import { twJoin } from "tailwind-merge";
import type { z } from "zod/v3";
import type { EditingComponentData } from "~/modals/ComponentEditModal";
import { getQdMessageId } from "~/pages/EditorPage";
import type { ZodAPIMessageActionRowComponent } from "~/types/components";
import type {
    APIComponentInMessageActionRow,
    QueryData
} from "~/types/QueryData";
import type { CacheManager } from "~/util/cache/CacheManager";
import { MAX_ACTION_ROW_WIDTH } from "~/util/constants";
import type { DragManager } from "~/util/drag";
import { randomString } from "~/util/text";
import { ButtonSelect } from "../ButtonSelect";
import { type SetErrorFunction, useError } from "../Error";
import { CoolIcon, type CoolIconsGlyph } from "../icons/CoolIcon";
import {
    getComponentText,
    getRowWidth,
    TopLevelComponentEditorContainer,
} from "./TopLevelComponentEditor";

/**
 * Local-only component stub. In the original, this would sync with a server.
 * Now it just generates a local ID.
 */
export const submitComponent = async (
  data: APIComponentInMessageActionRow,
  _setError?: SetErrorFunction,
) => {
  const localId = randomString(10);
  const component = { ...data } as APIComponentInMessageActionRow;

  if ("custom_id" in component && (!component.custom_id || component.custom_id === "")) {
    (component as any).custom_id = `local_${localId}`;
  }

  return component;
};

export const getSetEditingComponentProps = ({
  component,
  row,
  componentIndex,
  data,
  setData,
  setEditingComponent,
  setComponent: setComponent_,
}: {
  component: APIComponentInMessageActionRow;
  row: APIActionRowComponent<APIComponentInMessageActionRow>;
  componentIndex: number;
  data: QueryData;
  setData: React.Dispatch<QueryData>;
  setEditingComponent: React.Dispatch<
    React.SetStateAction<EditingComponentData | undefined>
  >;
  setComponent?: EditingComponentData["setComponent"];
}): EditingComponentData => {
  // Allow a custom value so this works without a row
  const setComponent =
    setComponent_ ??
    ((updated) => {
      row.components.splice(componentIndex, 1, updated);
      setData({ ...data });
    });

  return {
    component,
    setComponent,
    submit: async (newComponent, setError) => {
      const withId = { ...newComponent };
      if (
        withId.custom_id &&
        withId.type === ComponentType.Button &&
        withId.style === ButtonStyle.Link
      ) {
        try {
          const url = new URL(withId.url);
          if (url.searchParams.get("dhc-id")) {
            url.searchParams.delete("dhc-id");
          }
          withId.url = url.href;
        } catch {}
      }

      const updated = await submitComponent(withId, setError);
      if (updated) {
        setComponent(updated);

        // Reset state with new component so that subsequent saves
        // without closing the modal will PUT instead of POSTing
        setEditingComponent(
          getSetEditingComponentProps({
            component: updated,
            row,
            componentIndex,
            data,
            setData,
            setEditingComponent,
          }),
        );
        return updated;
      }
      throw Error("Component could not be updated");
    },
  };
};

export const ActionRowEditor: React.FC<{
  message: QueryData["messages"][number];
  component: APIActionRowComponent<APIComponentInMessageActionRow>;
  parent: APIContainerComponent | undefined;
  index: number;
  data: QueryData;
  setData: React.Dispatch<QueryData>;
  setEditingComponent: React.Dispatch<
    React.SetStateAction<EditingComponentData | undefined>
  >;
  drag?: DragManager;
  cache?: CacheManager;
  open?: boolean;
}> = ({
  message,
  component: row,
  parent,
  index: i,
  data,
  setData,
  setEditingComponent,
  drag,
  // cache,
  open,
}) => {
  const { t } = useTranslation();
  const mid = getQdMessageId(message);
  const [error, setError] = useError(t);

  return (
    <TopLevelComponentEditorContainer
      t={t}
      message={message}
      component={row}
      parent={parent}
      index={i}
      data={data}
      setData={setData}
      drag={drag}
      open={open}
    >
      {error}
      <div className="space-y-1">
        {row.components.map((component, ci) => {
          const id = `local-${ci}`;
          return (
            <IndividualComponentEditor
              key={`edit-message-${mid}-component-${id}-${ci}`}
              component={component}
              index={ci}
              row={row}
              updateRow={() => setData({ ...data })}
              onClick={() => {

                setEditingComponent(
                  getSetEditingComponentProps({
                    component,
                    row,
                    componentIndex: ci,
                    data,
                    setData,
                    setEditingComponent,
                  }),
                );
              }}
            />
          );
        })}
      </div>
      <ButtonSelect<ComponentType | "linkButton">
        name="component-type"
        options={[
          {
            label: t("component.2"),
            value: ComponentType.Button,
            disabled: getRowWidth(row) >= MAX_ACTION_ROW_WIDTH,
          },
          {
            label: t("linkButton"),
            value: "linkButton",
            disabled: getRowWidth(row) >= MAX_ACTION_ROW_WIDTH,
          },
          {
            label: t("component.3"),
            value: ComponentType.StringSelect,
            disabled: getRowWidth(row) > 0,
          },
          {
            label: t("component.5"),
            value: ComponentType.UserSelect,
            disabled: getRowWidth(row) > 0,
          },
          {
            label: t("component.6"),
            value: ComponentType.RoleSelect,
            disabled: getRowWidth(row) > 0,
          },
          {
            label: t("component.7"),
            value: ComponentType.MentionableSelect,
            disabled: getRowWidth(row) > 0,
          },
          {
            label: t("component.8"),
            value: ComponentType.ChannelSelect,
            disabled: getRowWidth(row) > 0,
          },
        ]}
        disabled={getRowWidth(row) >= MAX_ACTION_ROW_WIDTH}
        onValueChange={async (type) => {
          let submitData:
            | z.infer<typeof ZodAPIMessageActionRowComponent>
            | undefined;
          switch (type) {
            case "linkButton": {
              submitData = {
                type: ComponentType.Button,
                style: ButtonStyle.Link,
                url: "https://discohook.app",
              };
              break;
            }
            case ComponentType.Button: {
              submitData = {
                type,
                style: ButtonStyle.Primary,
                custom_id: "",
              };
              break;
            }
            case ComponentType.StringSelect: {
              submitData = {
                type,
                custom_id: "",
                options: [],
              };
              break;
            }
            case ComponentType.UserSelect:
            case ComponentType.RoleSelect:
            case ComponentType.MentionableSelect:
            case ComponentType.ChannelSelect: {
              submitData = {
                type,
                custom_id: "",
              };
              break;
            }
            default:
              break;
          }
          if (submitData) {
            const i =
              row.components.push({
                ...submitData,
                _state: "submitting",
              } as unknown as typeof submitData) - 1;
            setData({ ...data });

            const component = await submitComponent(submitData, setError);
            if (component) {
              // setError callback should reasonably handle else state
              row.components.splice(i, 1, component);
              // TODO: remove `_state` so user can edit unsaved component?
            }
            setData({ ...data });
          }
        }}
      >
        {t("addComponent")}
      </ButtonSelect>
    </TopLevelComponentEditorContainer>
  );
};

export const IndividualComponentEditor: React.FC<{
  component: APIComponentInMessageActionRow;
  index: number;
  row: APIActionRowComponent<APIComponentInMessageActionRow>;
  updateRow: (
    row?: APIActionRowComponent<APIComponentInMessageActionRow>,
  ) => void;
  onClick: () => void;
  actionsBar?: Partial<
    Record<"up" | "down" | "copy" | "delete", (() => void) | null>
  >;
}> = ({ component, index, row, updateRow, onClick, actionsBar }) => {
  const { t } = useTranslation();
  const previewText = getComponentText(component);

  // Don't allow an index change while the component is submitting
  // to avoid accidentally overwriting something
  const anySubmitting =
    row.components.filter((c) => "_state" in c && c._state === "submitting")
      .length !== 0;

  return (
    <div className="flex text-base text-gray-600 dark:text-gray-400 rounded-lg bg-blurple/10 hover:bg-blurple/15 border border-blurple/30 shadow hover:shadow-lg transition font-semibold select-none">
      <button
        type="button"
        className="flex p-2 h-full w-full my-auto truncate disabled:animate-pulse"
        onClick={onClick}
        disabled={"_state" in component && component._state === "submitting"}
      >
        <div className="ltr:mr-2 rtl:ml-2 my-auto w-6 h-6 shrink-0">
          {component.type === ComponentType.Button ? (
            <div
              className={twJoin(
                "rounded text-gray-50",
                isLinkButton(component)
                  ? "p-[5px_5px_4px_4px]"
                  : "w-full h-full",
                {
                  [ButtonStyle.Primary]: "bg-blurple",
                  [ButtonStyle.Premium]: "bg-blurple",
                  [ButtonStyle.Secondary]: "bg-[#6d6f78] dark:bg-[#4e5058]",
                  [ButtonStyle.Link]: "bg-[#6d6f78] dark:bg-[#4e5058]",
                  [ButtonStyle.Success]: "bg-[#248046] dark:bg-[#248046]",
                  [ButtonStyle.Danger]: "bg-[#da373c]",
                }[component.style],
              )}
            >
              {isLinkButton(component) && (
                <CoolIcon icon="External_Link" className="block" />
              )}
            </div>
          ) : (
            <div className="rounded bg-[#6d6f78] dark:bg-[#4e5058] p-[5px_5px_4px_4px]">
              <CoolIcon
                icon={
                  (
                    {
                      [ComponentType.StringSelect]: "Chevron_Down",
                      [ComponentType.UserSelect]: "Users",
                      [ComponentType.RoleSelect]: "Tag",
                      [ComponentType.MentionableSelect]: "Mention",
                      [ComponentType.ChannelSelect]: "Chat",
                    } as Record<(typeof component)["type"], CoolIconsGlyph>
                  )[component.type]
                }
                className="block"
              />
            </div>
          )}
        </div>
        <p className="truncate my-auto">
          {previewText ||
            `${t(`component.${component.type}`)} ${
              component.type === 2 ? index + 1 : ""
            }`}
        </p>
      </button>
      {actionsBar && Object.keys(actionsBar).length === 0 ? null : (
        <div className="ltr:ml-auto rtl:mr-auto text-lg space-x-2.5 rtl:space-x-reverse my-auto shrink-0 p-2 pl-0">
          <button
            type="button"
            className={index === 0 || actionsBar?.up === null ? "hidden" : ""}
            disabled={anySubmitting}
            onClick={
              actionsBar?.up ??
              (() => {
                row.components.splice(index, 1);
                row.components.splice(index - 1, 0, component);
                updateRow(row);
              })
            }
          >
            <CoolIcon icon="Chevron_Up" />
          </button>
          <button
            type="button"
            className={
              index === row.components.length - 1 || actionsBar?.down === null
                ? "hidden"
                : ""
            }
            disabled={anySubmitting}
            onClick={
              actionsBar?.down ??
              (() => {
                row.components.splice(index, 1);
                row.components.splice(index + 1, 0, component);
                updateRow(row);
              })
            }
          >
            <CoolIcon icon="Chevron_Down" />
          </button>
          <button
            type="button"
            className={
              getRowWidth(row) >= MAX_ACTION_ROW_WIDTH ||
              actionsBar?.copy === null
                ? "hidden"
                : ""
            }
            disabled={anySubmitting}
            onClick={
              actionsBar?.copy ??
              (async () => {
                // Don't accidentally save the current component
                const { custom_id: _, ...withoutId } = component;
                const copied = await submitComponent({
                  custom_id: "",
                  ...withoutId,
                });
                if (copied) {
                  // Should always be non-null
                  row.components.splice(index + 1, 0, copied);
                  updateRow(row);
                }
              })
            }
          >
            <CoolIcon icon="Copy" />
          </button>
          <button
            type="button"
            disabled={anySubmitting}
            className={actionsBar?.delete === null ? "hidden" : ""}
            onClick={
              actionsBar?.delete ??
              (() => {
                row.components.splice(index, 1);
                updateRow(row);

                // Not sure about this as of now. I think we should have a pop up
                // that asks the user if they want to delete the component (and/or
                // check placements to see if it exists elsewhere)
                // const pattern = /^p_(\d+)$/;
                // if (component.custom_id && pattern.test(component.custom_id)) {
                // const id = component.custom_id.match(pattern)![1];
                // fetch(apiUrl(BRoutes.component(id)), {
                //   method: "PATCH",
                //   body: JSON.stringify({ draft: true }),
                //   headers: { "Content-Type": "application/json" },
                // })
                //   .then((r) =>
                //     console.log(
                //       `${r.status} ${r.statusText} drafting component ${id}`,
                //     ),
                //   )
                //   .catch((e) =>
                //     console.error(`Error attempting to draft component ${id}`, e),
                //   );
                // fetch(apiUrl(BRoutes.component(id)), { method: "DELETE" })
                //   .then((r) =>
                //     console.log(
                //       `${r.status} ${r.statusText} deleting component ${id}`,
                //     ),
                //   )
                //   .catch((e) =>
                //     console.error(
                //       `Error attempting to delete component ${id}`,
                //       e,
                //     ),
                //   );
                // }
              })
            }
          >
            <CoolIcon icon="Trash_Full" />
          </button>
        </div>
      )}
    </div>
  );
};
