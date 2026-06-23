import type { SelectOption } from "./model.js";

export type AppTheme = "classic" | "bright" | "jade" | "rose" | "dark";

export type ThemeState = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

export const THEME_STORAGE_KEY = "xingxing-theme";

export const themeOptions: Array<SelectOption<AppTheme>> = [
  { value: "classic", label: "经典暖色" },
  { value: "bright", label: "月白清透" },
  { value: "jade", label: "青玉静谧" },
  { value: "rose", label: "晨光玫瑰" },
  { value: "dark", label: "星夜深色" }
];
