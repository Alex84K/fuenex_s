import type { Opening, OpeningKind, ScanSource } from "./types"

// SURFACE_TYPES — the web's OWN list of known constants (DESIGN_MEASUREMENT
// §15, question 2: the server has no dictionary, decision 6; the mobile
// client will keep its own independent array). The <input list> offers these
// plus free typing — a user-typed value is never normalized, validated
// against the list, or written back into it.
export const SURFACE_TYPES: { value: string; label: string }[] = [
  { value: "FLOOR", label: "Пол" },
  { value: "WALL", label: "Стена" },
  { value: "CEILING", label: "Потолок" },
  { value: "FENCE_SIDE_A", label: "Забор, сторона А" },
  { value: "FENCE_SIDE_B", label: "Забор, сторона Б" },
]

export const SCAN_SOURCE_LABELS: Record<ScanSource, string> = {
  LIDAR: "LiDAR",
  AR_RULER: "AR-линейка",
  MANUAL: "Вручную",
}

export const OPENING_KIND_LABELS: Record<OpeningKind, string> = {
  DOOR: "Дверь",
  WINDOW: "Окно",
  OPENING: "Проём",
}

// The default new opening (DESIGN §10.3): a door 0.9 × 2.05 with deduct —
// so the typical case costs one click. position is assigned by the array
// index at build time, never stored.
export const OPENING_DEFAULTS: Pick<
  Opening,
  "kind" | "widthM" | "heightM" | "deduct"
> = {
  kind: "DOOR",
  widthM: 0.9,
  heightM: 2.05,
  deduct: true,
}

// Contour editor constants (§9.2, §9.5). Grid steps are in centimetres —
// the editor works in cm (D8), the wire speaks metres.
export const GRID_STEPS_CM = [5, 10, 25, 50] as const
export const DEFAULT_GRID_STEP_CM = 10
export const SCALE_PX_PER_CM = 3
