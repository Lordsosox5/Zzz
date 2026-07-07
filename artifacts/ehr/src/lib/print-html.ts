/**
 * Cross-environment HTML print utility.
 *
 * Uses a hidden <iframe> instead of window.open("","_blank") so printing
 * works in both the browser and Tauri's sandboxed WebView (WebView2 / WKWebView),
 * which blocks window.open pop-ups by default.
 */
export function printHtml(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    try { document.body.removeChild(iframe); } catch { /* already removed */ }
  };

  iframe.contentWindow?.addEventListener?.("afterprint", cleanup, { once: true });

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 350);

  setTimeout(cleanup, 60_000);
}
