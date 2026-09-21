import { createRoot } from "react-dom/client";
import "@/index.css";
import "./onboarding.css";
import Onboarding from "./Onboarding.tsx";
import { initSettings } from "../stores/useSettings.ts";

const root = createRoot(document.getElementById("root")!);
const boot = async () => {
    await initSettings();
    root.render(<Onboarding />);
};
boot();
