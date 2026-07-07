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
 * In Tauri we use hash-based routing (see App.tsx), so the target URL is
 * written to window.location.hash instead of href to avoid a full reload.
 *
 * Tip: print pages should call window.print() on mount so the user can
 * print and then press the browser/app Back button to return.
 */
export function openOrNavigate(url: string): void {
  if (isTauri()) {
    window.location.hash = url;
  } else {
    window.open(url, "_blank");
  }
}
