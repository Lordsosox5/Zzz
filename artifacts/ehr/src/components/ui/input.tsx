import * as React from "react"

import { cn } from "@/lib/utils"

const DATE_TIME_TYPES = new Set(["date", "time", "datetime-local", "month", "week"]);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, dir, ...props }, ref) => {
    // Native date/time controls must keep their internal day/month/year
    // segments rendered dir="ltr" at the DOM-attribute level — applying only
    // CSS `direction` (or dir="rtl") causes Chromium/WebKit to mirror the
    // Arabic segment glyphs themselves (e.g. "يوم" renders as "موي").
    const resolvedDir = type && DATE_TIME_TYPES.has(type) ? "ltr" : dir;
    return (
      <input
        type={type}
        dir={resolvedDir}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
