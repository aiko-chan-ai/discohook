import { ButtonStyle } from "discord-api-types/v10";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { twJoin } from "tailwind-merge";
import { SettingsModal } from "~/modals/SettingsModal";
import { Button } from "./Button";
import { CoolIcon } from "./icons/CoolIcon";
import { Logo } from "./icons/Logo";

interface HeaderProps {
  isComponentsV2: boolean;
  onModeSwitch: (toCV2: boolean) => void;
  standardDisabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isComponentsV2: isCV2,
  onModeSwitch,
  standardDisabled,
}) => {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="sticky top-0 left-0 z-20 bg-slate-50 dark:bg-[#1E1F22] border-2 border-slate-50 dark:border-[#1E1F22] shadow-md w-full px-4 h-12 flex">
      <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} />
      <div className="h-8 w-8 my-auto mr-4">
        <Logo />
      </div>
      <div className="grow flex overflow-x-auto ltr:ml-6 rtl:mr-6 items-center gap-2">
        <Button
          className="my-auto"
          discordstyle={ButtonStyle.Secondary}
          onClick={() => setSettingsOpen(true)}
        >
          {t("settings")}
        </Button>
        {/* Standard / Components V2 toggle */}
        <div className="flex ms-auto bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5 gap-0.5">
          <button
            type="button"
            className={twJoin(
              "px-3 py-1 rounded-md text-sm font-medium transition-colors",
              !isCV2
                ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-gray-100"
                : standardDisabled
                  ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600/50",
            )}
            disabled={standardDisabled}
            onClick={() => onModeSwitch(false)}
          >
            <CoolIcon icon="Text" className="mr-1" />
            Standard
          </button>
          <button
            type="button"
            className={twJoin(
              "px-3 py-1 rounded-md text-sm font-medium transition-colors",
              isCV2
                ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-gray-100"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600/50",
            )}
            onClick={() => onModeSwitch(true)}
          >
            <CoolIcon icon="Rows" className="mr-1" />
            Components V2
          </button>
        </div>
      </div>
    </div>
  );
};
