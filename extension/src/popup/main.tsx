import { createRoot } from "react-dom/client";
import "@/index.css";
import "./popup.css";
import Popup from "./Popup.tsx";
import { initSettings } from "../stores/useSettings.ts";

const root = createRoot(document.getElementById("root")!);
const boot = async () => {
    await initSettings();
    root.render(<Popup />);
};
boot();
