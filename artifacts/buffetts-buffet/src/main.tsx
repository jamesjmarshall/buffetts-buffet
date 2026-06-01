import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// In production the API lives on a separate subdomain (api.buffettsbuffet.com).
// VITE_API_URL is set as an env variable on Vercel. In dev it's empty so the
// Vite proxy handles /api requests to localhost:3001.
setBaseUrl(import.meta.env.VITE_API_URL ?? "");

createRoot(document.getElementById("root")!).render(<App />);
