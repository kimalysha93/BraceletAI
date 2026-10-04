// All string-length constants live here so they're easy to tune.
// These are placeholders until calibrated against a real bracelet (see Calibrate in the Strings panel).

/** Base strings = pattern width + this offset. Confirm against real alpha patterns (0 or 1). */
export const BASE_STRING_OFFSET = 0;

/** Working thread used per knot, in cm. Calibrate mode overrides this per browser. */
export const KNOT_LENGTH_CM = 2.0;

/** Extra thread for carrying a colour behind the work between knots. */
export const CARRY_FACTOR = 1.15;

/** Roughly how much bracelet each row of knots makes, in cm (used to see if the pattern needs repeating). */
export const ROW_HEIGHT_CM = 0.4;

/** Extra base-string length used by each starting method, in cm. */
export const START_ALLOWANCE_CM = {
  loop: 4,
  braid: 6,
  tape: 0,
} as const;

export type StartMethod = keyof typeof START_ALLOWANCE_CM;

export const DEFAULT_STRING_SETTINGS = {
  tailCm: 10,
  startMethod: "loop" as StartMethod,
  unit: "cm" as "cm" | "in",
};

export const CM_PER_INCH = 2.54;
