import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = "http://localhost:8080";

// Every REST path the Spring Boot backend exposes. In dev, Vite proxies these
// straight through to :8080 so the app can always use same-origin relative
// fetch("/create_bot") calls — no separate API-base-URL config needed, and
// the exact same fetch code works once the production build is served by
// Spring Boot itself (see scripts/deploy.mjs).
const API_PATHS = [
  "/api",
  "/create_bot",
  "/fetch_transcript",
  "/stop_bot",
  "/start_local_recording",
  "/stop_and_analyze_local",
  "/get_live_transcript",
  "/send_task_notification_manual",
  "/set_slack_token",
  "/set_contacts_csv_path",
  "/setup_vexa_admin",
  "/authorize_google",
  "/oauth2callback",
];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      API_PATHS.map((path) => [path, { target: BACKEND, changeOrigin: true }])
    ),
  },
});
