import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SimApp } from "@/components/sim-app";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SimApp />
  </StrictMode>,
);
