// src/hooks/useFlowchartAutosave.ts

import { useEffect, useRef } from "react";
import {
  updateFlowchart,
  createFlowchart,
  //   type Flowchart,
  type FlowchartDTOInput,
} from "../api/flowchartApi";
// import { getCurrentUserId } from "../utils/auth";

/**
 * Helpful: autosave every X ms if the flowchart data changed.
 *
 * flowchartState should be the FULL logical state required
 * for FlowchartDTO — NOT ReactFlow nodes.
 */
export function useFlowchartAutosave(options: {
  flowchartId: number | null; // null if user has no flowchart yet
  setFlowchartId: (id: number) => void; // callback to update local ID after creation
  flowchartState: FlowchartDTOInput; // fully computed DTO
  intervalMs?: number; // default 30s
}) {
  const {
    flowchartId,
    setFlowchartId,
    flowchartState,
    intervalMs = 30000,
  } = options;

  // store last saved snapshot to detect changes
  const lastSavedState = useRef<string>("");

  // debounced autosave loop
  useEffect(() => {
    const timer = setInterval(async () => {
      const json = JSON.stringify(flowchartState);

      // nothing changed?
      if (json === lastSavedState.current) return;

      console.log("🔄 Autosaving flowchart...");

      try {
        if (flowchartId === null) {
          // FIRST-TIME SAVE → create new flowchart
          const created = await createFlowchart(flowchartState);
          setFlowchartId(created.id);
          console.log("✨ Created new flowchart:", created.id);
        } else {
          // NORMAL SAVE → update existing flowchart
          const updated = await updateFlowchart(flowchartId, flowchartState);
          console.log("📌 Updated flowchart:", updated.id);
        }

        lastSavedState.current = json;
      } catch (err) {
        console.error("❌ Autosave failed:", err);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [flowchartId, flowchartState, intervalMs]);
}
