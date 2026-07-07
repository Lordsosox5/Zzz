/**
 * Tauri environment helpers.
 *
 * Tauri 2.x injects `window.__TAURI_INTERNALS__` into the WebView.
 * Use isTauri() wherever behaviour must differ between browser and desktop.
 */
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window
  );
}

/**
 * Open a URL in a new window/tab in the browser,
 * or navigate the current Tauri window to it (since Tauri blocks pop-ups).
 *
 * Tip: print pages should have a "← Back" button or call window.print()
 * on mount so the user can print and then navigate back.
 */
export function openOrNavigate(url: string): void {
  if (isTauri()) {
    window.location.href = url;
  } else {
    window.open(url, "_blank");
  }
}
