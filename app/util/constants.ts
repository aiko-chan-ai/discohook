import type { QueryData } from "~/types/QueryData";

export const WEBHOOK_TOKEN_RE = /^[\w-]+$/;

export const WEBHOOK_URL_RE =
  /^https?:\/\/(?:www\.|ptb\.|canary\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/(\d+)\/([\w-]+)(?:\?thread_id=(\d+))?$/;

export const MESSAGE_REF_RE =
  /^(?:https:\/\/(?:www\.|ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/)?(d+)$/;

export const INDEX_MESSAGE: QueryData["messages"][number] = {
  data: {
    content: [
      "Hey, welcome to <:discohook:736648398081622016> **Discohook**! The easiest way to personalize your Discord server.",
      "",
      "There's more info below if you want to read it. When you're ready, press **Clear All** at the top of the editor to delete what's written here.",
      "",
      "_ _",
    ].join("\n"),
    embeds: [
      {
        title: "What is this?",
        description: [
          "At its core, Discohook is a simple message designer. You can use it to create fully customizable messages for your Discord server.",
        ].join("\n"),
        color: 0x58b9ff,
      },
    ],
  },
};

export const INDEX_FAILURE_MESSAGE: QueryData["messages"][number] = {
  data: {
    content:
      "The data you loaded this page with was invalid.",
  },
};

// Components
export const MAX_V1_ROWS = 5;
export const MAX_ACTION_ROW_WIDTH = 5;
export const MAX_GALLERY_ITEMS = 10;
export const MAX_TOTAL_COMPONENTS = 40;
export const MAX_TOTAL_COMPONENTS_CHARACTERS = 4000;
