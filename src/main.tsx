import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { runReactVersionCheck } from "./lib/reactVersionCheck";

runReactVersionCheck();

createRoot(document.getElementById("root")!).render(<App />);
