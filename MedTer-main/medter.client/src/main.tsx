import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./auth";
import { PrefsProvider } from "./i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <PrefsProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PrefsProvider>
    </BrowserRouter>
  </StrictMode>
);
