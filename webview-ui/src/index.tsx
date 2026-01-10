/**
 * Entry point for the MAID webview React application.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

// Get the view type from the data attribute set by the extension
const viewType = container.dataset.view as "knowledgeGraph" | "dashboard" | "history" | undefined;

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App viewType={viewType || "knowledgeGraph"} />
  </React.StrictMode>
);
