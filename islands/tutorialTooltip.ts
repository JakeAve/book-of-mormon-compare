const DISMISSED_KEY = "tutorial_tooltip_dismissed";

export function isTooltipDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return true;
  }
}

export function dismissTooltip() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch { /* storage blocked (e.g. Safari private mode) */ }
}
