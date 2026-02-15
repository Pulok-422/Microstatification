import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "leaflet/dist/leaflet.css";  // ✅ Add this line

createRoot(document.getElementById("root")!).render(
  <App />
);
