import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#1e293b",
          border: "1px solid rgba(56, 189, 248, 0.4)",
          color: "#f8fafc",
        },
      }}
    />
    <App />
  </StrictMode>
);
