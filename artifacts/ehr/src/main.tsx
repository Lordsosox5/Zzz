import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

async function bootstrap() {
  if (import.meta.env.VITE_TAURI === "true") {
    const { activateSupabaseInterceptor } = await import("./lib/supabase-interceptor");
    activateSupabaseInterceptor();
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

bootstrap();
