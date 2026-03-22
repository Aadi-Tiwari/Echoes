"use client";

import React, { useEffect } from "react";
import Script from "next/script";

// Pages dispatch window.dispatchEvent(new CustomEvent("echoes:context", { detail: { title, context } }))
// This widget picks that up and injects dynamic-variables so the agent knows what document is active.
export default function ElevenLabsWidget() {
  useEffect(() => {
    function onContext(e: Event) {
      const { title, context } = (e as CustomEvent<{ title: string; context: string }>).detail;
      const el = document.querySelector("elevenlabs-convai");
      if (el) {
        el.setAttribute(
          "dynamic-variables",
          JSON.stringify({
            document_title: title.slice(0, 120),
            document_context: context.slice(0, 600),
          })
        );
      }
    }
    window.addEventListener("echoes:context", onContext);
    return () => window.removeEventListener("echoes:context", onContext);
  }, []);

  // Use React.createElement to mount the ElevenLabs web component without JSX type conflicts.
  // The web component is registered by the unpkg script below at runtime.
  return (
    <>
      {React.createElement("elevenlabs-convai", { "agent-id": "agent_7101km93pg8fem8tkx8s98390m5p" })}
      <Script src="https://unpkg.com/@elevenlabs/convai-widget-embed" strategy="afterInteractive" />
    </>
  );
}
