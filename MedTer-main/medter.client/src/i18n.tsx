import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "ka" | "en";
type Theme = "light" | "dark";

interface Prefs {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Inline translation: pass Georgian + English, get the active language's string. */
  t: (ka: string, en: string) => string;
  theme: Theme;
  toggleTheme: () => void;
}

const Ctx = createContext<Prefs>(null!);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("lang") as Lang) || "ka");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const setLang = (l: Lang) => { localStorage.setItem("lang", l); setLangState(l); };
  const toggleTheme = () => setTheme((x) => (x === "dark" ? "light" : "dark"));
  const t = (ka: string, en: string) => (lang === "en" ? en : ka);

  return <Ctx.Provider value={{ lang, setLang, t, theme, toggleTheme }}>{children}</Ctx.Provider>;
}

export const usePrefs = () => useContext(Ctx);
