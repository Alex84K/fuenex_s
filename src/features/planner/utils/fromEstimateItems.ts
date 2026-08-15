import { uuidv7 } from "../../../utils/uuid"
import type { EstimateItem } from "../../estimates/types"
import type { TaskRequest } from "../types"

// Estimate items → task requests ("Создать планировщик из сметы"). One item
// becomes one stage: the flat estimate has nothing to group by, so 1:1 is the
// only automatic mapping (ADR-013 decision 6 — no category on items, no
// automatic разбивка на этапы; this is a scaffold the foreman then edits, not
// the product's breakdown). Blank rows (no title) are skipped — an empty draft
// row must not become a stage. State fields are deliberately fresh:
// todo / 0 % / nobody / no deadline, exactly like applying a template
// (fromTaskCatalog.ts, D10).
export const tasksFromEstimateItems = (
  items: Pick<EstimateItem, "title" | "description">[],
): TaskRequest[] =>
  items
    .filter(it => it.title.trim() !== "")
    .map((it, i) => ({
      id: uuidv7(),
      title: it.title,
      description: it.description,
      status: "todo",
      progressPct: 0,
      assignee: "",
      position: i,
      deadline: "",
    }))
