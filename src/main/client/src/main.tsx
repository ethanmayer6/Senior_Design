import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AppRoutes from "./routes/AppRoutes.tsx";
import "../src/assets/theme/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { initializeTheme } from "./utils/theme.ts";

initializeTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRoutes />
  </StrictMode>
);
