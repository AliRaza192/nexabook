import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type Locale = "en" | "ur";
type Messages = Record<string, string>;

const COOKIE_KEY = "NXL_LOCALE";

function getCookie(): Locale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(new RegExp(`(^| )${COOKIE_KEY}=([^;]+)`));
  return (match?.[2] as Locale) || "en";
}

function setCookie(locale: Locale) {
  document.cookie = `${COOKIE_KEY}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

const messagesCache: Record<Locale, Messages> = {} as any;

async function loadMessages(locale: Locale): Promise<Messages> {
  if (messagesCache[locale]) return messagesCache[locale];
  const data = await import(`../../messages/${locale}.json`);
  messagesCache[locale] = data.default || data;
  return messagesCache[locale];
}

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  t: (key: string, fallback?: string) => string;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  messages: {},
  t: (k, f) => f || k,
  setLocale: () => {},
  dir: "ltr",
});

export function useT() {
  return useContext(I18nContext);
}

export function t(key: string, fallback?: string): string {
  // Inline usage won't work without context; use useT() in components
  return fallback || key;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [messages, setMessages] = useState<Messages>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = getCookie();
    setLocaleState(saved);
    loadMessages(saved).then((m) => {
      setMessages(m);
      setReady(true);
    });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setCookie(newLocale);
    loadMessages(newLocale).then(setMessages);
  }, []);

  const translate = useCallback(
    (key: string, fallback?: string) => messages[key] || fallback || key,
    [messages]
  );

  if (!ready) return <>{children}</>;

  return (
    <I18nContext.Provider
      value={{
        locale,
        messages,
        t: translate,
        setLocale,
        dir: locale === "ur" ? "rtl" : "ltr",
      }}
    >
      <div dir={locale === "ur" ? "rtl" : "ltr"}>{children}</div>
    </I18nContext.Provider>
  );
}
