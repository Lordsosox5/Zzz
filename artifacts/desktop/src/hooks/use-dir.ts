import { useState, useEffect } from "react";

function getHtmlDir(): "ltr" | "rtl" {
  if (typeof document === "undefined") return "ltr";
  return (document.documentElement.getAttribute("dir") as "ltr" | "rtl") ?? "ltr";
}

export function useDir(): "ltr" | "rtl" {
  const [dir, setDir] = useState<"ltr" | "rtl">(getHtmlDir);

  useEffect(() => {
    const observer = new MutationObserver(() => setDir(getHtmlDir()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, []);

  return dir;
}
