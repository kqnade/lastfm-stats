export interface ThemeColors {
  background: string;
  border: string;
  title: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  badgeBg: string;
  shadow: string;
  headerLine: string;
}

export const themes: Record<string, ThemeColors> = {
  dark: {
    background: "#0d1117",
    border: "#30363d",
    title: "#ffffff",
    textPrimary: "#c9d1d9",
    textSecondary: "#8b949e",
    accent: "#ff4444",
    badgeBg: "#161b22",
    shadow: "rgba(0,0,0,0.4)",
    headerLine: "#21262d",
  },
  light: {
    background: "#ffffff",
    border: "#d0d7de",
    title: "#1f2328",
    textPrimary: "#24292f",
    textSecondary: "#57606a",
    accent: "#cf222e",
    badgeBg: "#f6f8fa",
    shadow: "rgba(0,0,0,0.1)",
    headerLine: "#eaeef2",
  },
  transparent: {
    background: "transparent",
    border: "#30363d",
    title: "#ffffff",
    textPrimary: "#c9d1d9",
    textSecondary: "#8b949e",
    accent: "#ff4444",
    badgeBg: "rgba(22,27,34,0.6)",
    shadow: "rgba(0,0,0,0.0)",
    headerLine: "#21262d",
  },
};

export function getTheme(name: string): ThemeColors {
  return themes[name] ?? themes.dark;
}
