"use client";

import { useState, useCallback } from "react";
import {
  ScoreDrilldown,
  type ScoredNodeSnapshot,
} from "@/components/rbia/score-drilldown";

// ---- Props -------------------------------------------------------------------

interface ScoreDrilldownWrapperProps {
  scoringTree: unknown; // JSONB from DB -- will be cast to ScoredNodeSnapshot
  moduleScores: Record<string, number>;
}

// ---- Component ---------------------------------------------------------------

/**
 * Client wrapper that manages which module's drill-down is expanded.
 *
 * The scoringTree from the DB is a root node with module-level children.
 * When a module code is selected (e.g., from ScoreGauge onModuleClick),
 * this component finds the matching module node in the tree and passes
 * it to ScoreDrilldown.
 *
 * This is a client component so it CAN handle click callbacks from ScoreGauge
 * (both are client components).
 */
export function ScoreDrilldownWrapper({
  scoringTree,
  moduleScores,
}: ScoreDrilldownWrapperProps) {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const tree = scoringTree as ScoredNodeSnapshot;

  // Find module node from the tree's children
  const findModuleNode = useCallback(
    (moduleCode: string): ScoredNodeSnapshot | null => {
      if (!tree?.children) return null;
      return tree.children.find((child) => child.code === moduleCode) ?? null;
    },
    [tree],
  );

  const selectedNode = selectedModule ? findModuleNode(selectedModule) : null;

  // If no module is selected, show a prompt to select one
  if (!selectedModule || !selectedNode) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Module Drill-down</h3>
        <p className="text-muted-foreground text-sm">
          Click a module in the score panel above to view its detailed scoring
          breakdown.
        </p>
        {/* Module buttons for direct selection */}
        {tree?.children && tree.children.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tree.children.map((child) => (
              <button
                key={child.code}
                onClick={() => setSelectedModule(child.code)}
                className="bg-muted hover:bg-muted/80 rounded-md border px-3 py-1.5 text-sm transition-colors"
              >
                {child.name ?? child.code}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <ScoreDrilldown
      moduleTree={selectedNode}
      moduleName={selectedNode.name ?? selectedModule}
      moduleScore={moduleScores[selectedModule] ?? null}
      onClose={() => setSelectedModule(null)}
    />
  );
}
