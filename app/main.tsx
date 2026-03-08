import structuredClone from "@ungap/structured-clone";
import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { App } from "./App";
import i18nConfig from "./i18n";
import "./styles/app.css";

if (!("structuredClone" in globalThis)) {
  // @ts-expect-error
  globalThis.structuredClone = structuredClone;
}

async function init() {
  await i18next
    .use(initReactI18next)
    .use(LanguageDetector)
    .use(Backend)
    .init({
      ...i18nConfig,
      ns: ["common"],
      defaultNS: "common",
      backend: { loadPath: "/i18n/{{lng}}.json" },
      detection: { order: ["htmlTag"], caches: [] },
    });

  const root = createRoot(document.getElementById("root")!);
  root.render(
    <I18nextProvider i18n={i18next}>
      <StrictMode>
        <App />
      </StrictMode>
    </I18nextProvider>,
  );
}

init();
