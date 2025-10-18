import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";

if (Capacitor.isNativePlatform()) {
  KeepAwake.keepAwake().catch(() => {});
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
