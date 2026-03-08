import { ButtonStyle } from "discord-api-types/v10";
import { useTranslation } from "react-i18next";
import { twJoin } from "tailwind-merge";
import { Button } from "~/components/Button";
import { Checkbox } from "~/components/Checkbox";
import { CoolIcon } from "~/components/icons/CoolIcon";
import { Radio } from "~/components/Radio";
import { useLocalStorage } from "~/util/localstorage";
import { Modal, type ModalProps, PlainModalHeader } from "./Modal";

export const SettingsModal = (props: ModalProps) => {
  const { t } = useTranslation();
  const [settings, updateSettings] = useLocalStorage();

  return (
    <Modal {...props}>
      <PlainModalHeader onClose={() => props.setOpen(false)}>
        {t("settings")}
      </PlainModalHeader>
      <div>
        <p className="text-sm font-bold uppercase dark:text-gray-400">
          {t("theme")}
        </p>
        <div className="flex gap-3 mt-2 pt-1 overflow-x-auto">
          <ThemeRadio
            bg="bg-white"
            checked={settings.theme === "light"}
            onChange={(e) => {
              if (e.currentTarget.checked) {
                updateSettings({ theme: "light" });
                document.documentElement.classList.remove("dark");
              }
            }}
          />
          <ThemeRadio
            bg="bg-gray-800"
            checked={settings.theme === "dark"}
            onChange={(e) => {
              if (e.currentTarget.checked) {
                updateSettings({ theme: "dark" });
                document.documentElement.classList.add("dark");
              }
            }}
          />
          <ThemeRadio
            bg="bg-gray-800"
            checked={!settings.theme}
            onChange={(e) => {
              if (e.currentTarget.checked) {
                updateSettings({ theme: undefined });
                if (
                  window.matchMedia("(prefers-color-scheme: light)").matches
                ) {
                  document.documentElement.classList.remove("dark");
                } else {
                  document.documentElement.classList.add("dark");
                }
              }
            }}
          >
            <CoolIcon icon="Redo" className="m-auto text-xl text-gray-50" />
          </ThemeRadio>
        </div>
      </div>
      <div className="mt-8">
        <p className="text-sm font-bold uppercase dark:text-gray-400">
          {t("messageDisplay")}
        </p>
        <div className="space-y-2 mt-2">
          <Radio
            name="display"
            label={t("cozy")}
            checked={
              !settings.messageDisplay || settings.messageDisplay === "cozy"
            }
            onChange={(e) => {
              if (e.currentTarget.checked) {
                updateSettings({ messageDisplay: "cozy" });
              }
            }}
          />
          <Radio
            name="display"
            label={t("compact")}
            checked={settings.messageDisplay === "compact"}
            onChange={(e) => {
              if (e.currentTarget.checked) {
                updateSettings({ messageDisplay: "compact" });
              }
            }}
          />
          {settings.messageDisplay === "compact" ? (
            <Checkbox
              label={t("compactAvatars")}
              checked={settings.compactAvatars === true}
              onCheckedChange={(checked) =>
                updateSettings({ compactAvatars: checked })
              }
            />
          ) : null}
        </div>
      </div>
      <div className="mt-8">
        <p className="text-sm font-bold uppercase dark:text-gray-400">
          {t("editorPanes")}
        </p>
        <div className="space-y-2 mt-2">
          <Checkbox
            label={t("forceDualPane")}
            checked={settings.forceDualPane === true}
            onCheckedChange={(checked) =>
              updateSettings({ forceDualPane: checked })
            }
          />
        </div>
      </div>
      <div className="mt-8">
        <p className="text-sm font-bold uppercase dark:text-gray-400">
          {t("defaultMessageCreationChoice")}
        </p>
        <div className="space-y-2 mt-2">
          <Radio
            name="defaultMessageFlag"
            label={t("standardMessage")}
            checked={
              !settings.defaultMessageFlag ||
              settings.defaultMessageFlag === "standard"
            }
            onChange={(e) => {
              if (e.currentTarget.checked) {
                updateSettings({ defaultMessageFlag: "standard" });
              }
            }}
          />
          <Radio
            name="defaultMessageFlag"
            label={t("componentsMessage")}
            checked={settings.defaultMessageFlag === "components"}
            onChange={(e) => {
              if (e.currentTarget.checked) {
                updateSettings({ defaultMessageFlag: "components" });
              }
            }}
          />
        </div>
      </div>
      <div className="mt-8">
        <p className="text-sm font-bold uppercase dark:text-gray-400">
          {t("cache")}
        </p>
        <div className="space-y-2 mt-2">
          <div>
            <p>
              Default emoji cache is automatically refreshed every 14 days. If
              there has been an emoji update, you can refresh instantly by
              clicking this button.
            </p>
            <Button
              discordstyle={ButtonStyle.Secondary}
              onClick={() => {
                localStorage.removeItem("discohook_unicode_emojis");
              }}
            >
              Clear Emoji Cache
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const ThemeRadio: React.FC<
  React.PropsWithChildren<{
    bg: string;
    checked?: boolean;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
  }>
> = ({ bg, checked, onChange, children }) => (
  <label className="relative">
    <input
      name="theme"
      type="radio"
      className="peer"
      checked={checked}
      onChange={onChange}
      hidden
    />
    <div
      className={twJoin(
        "rounded-xl flex size-[60px] cursor-pointer peer-checked:cursor-default",
        "border border-black/50 dark:border-gray-50/50",
        "peer-checked:border-4 peer-checked:border-blurple box-border",
        bg,
      )}
    >
      {children}
    </div>
    <div className="hidden peer-checked:flex absolute -top-1 -end-1 bg-blurple rounded-full size-5">
      <CoolIcon icon="Check" className="m-auto text-sm text-white" />
    </div>
  </label>
);
