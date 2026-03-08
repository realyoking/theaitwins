import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Request notification permission for PWA push notifications
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

createRoot(document.getElementById("root")!).render(<App />);
