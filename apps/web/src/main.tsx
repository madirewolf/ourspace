import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRng } from "@ourspace/core";
import { randomAvatar } from "@ourspace/avatar";
import { App } from "./App";
import { assembleProfile } from "./onboarding/Onboarding";
import { disableStorageWrites, useApp } from "./store";
import "./index.css";

// Demo mode: `?demo=1` seeds a sample profile when none exists (handy for
// development and screenshots); `&room=1` jumps into the first gallery.
// Demo visits never write to storage — a demo must not become the browser's
// permanent profile.
const params = new URLSearchParams(window.location.search);
if (params.has("demo")) {
  disableStorageWrites();
  const state = useApp.getState();
  if (!state.profile) {
    state.createProfile(
      assembleProfile(
        "Sam Ellery",
        "samellery",
        "I paint small things very large, and sometimes I record the sounds the paintings make.",
        {
          ...randomAvatar(createRng("ourspace:avatar:v1:samellery")),
          hairStyle: "spiky",
          accessory: "headphones",
          top: "#8a6fc0",
        },
        ["visual", "music"],
        { title: "Neon Receiver — demo signal" },
      ),
    );
  }
  if (params.has("room")) {
    const firstPhotos = useApp.getState().profile?.modules.find((m) => m.kind === "photos");
    if (firstPhotos) {
      useApp.getState().setScreen({ name: "gallery", moduleId: firstPhotos.id });
    }
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("index.html is missing #root");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
