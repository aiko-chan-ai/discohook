import type { InterpolationOptions } from "i18next";
import moment from "moment";

export const supportedLanguages = ["en"] as const;

export type LocaleCode = (typeof supportedLanguages)[number];

export default {
  supportedLngs: supportedLanguages,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
    format: (value, format) => {
      if (format === "lowercase") return value.toLowerCase();
      if (value instanceof Date) return moment(value).format(format);
      return value.toString();
    },
  } satisfies InterpolationOptions,
};
