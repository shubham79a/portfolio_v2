"use client";

import { useEffect } from "react";

/**
 * Marks the document once React has actually hydrated.
 *
 * Every animated element is server-rendered in its hidden state, because
 * the server cannot know whether to animate. If the client bundle then
 * fails to execute — a broken dev-tool extension, an ad blocker, a proxy
 * that mangles a chunk, a dropped connection — nothing ever clears those
 * inline styles and the entire page reads as blank.
 *
 * This flag is the signal that JavaScript is alive. The failsafe rule in
 * globals.css waits a few seconds for it and, if it never arrives,
 * reveals the content anyway. Setting it costs one attribute write.
 */
export function HydrationFlag() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);

  return null;
}
