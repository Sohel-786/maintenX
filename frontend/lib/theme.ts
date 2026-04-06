/**
 * Generate primary color shades from a single hex and apply to document.
 * All primary-* shades across the app derive from this one color.
 * Text that should be black remains black (unchanged).
 */

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [13, 110, 253]; // fallback blue
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const h = Math.round(Math.max(0, Math.min(255, c))).toString(16);
    return h.length === 1 ? "0" + h : h;
  };
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

function blendWithWhite(rgb: [number, number, number], factor: number): string {
  const [r, g, b] = rgb;
  const wr = Math.round(r + (255 - r) * factor);
  const wg = Math.round(g + (255 - g) * factor);
  const wb = Math.round(b + (255 - b) * factor);
  return rgbToHex(wr, wg, wb);
}

function blendWithBlack(rgb: [number, number, number], factor: number): string {
  const [r, g, b] = rgb;
  const br = Math.round(r * (1 - factor));
  const bg = Math.round(g * (1 - factor));
  const bb = Math.round(b * (1 - factor));
  return rgbToHex(br, bg, bb);
}

/** Map of shade number to blend factor (50 = lightest, 500 = base, 900 = darkest) */
const SHADE_FACTORS: Record<number, { type: "light" | "dark"; factor: number }> = {
  50: { type: "light", factor: 0.95 },
  100: { type: "light", factor: 0.9 },
  200: { type: "light", factor: 0.75 },
  300: { type: "light", factor: 0.5 },
  400: { type: "light", factor: 0.25 },
  500: { type: "light", factor: 0 }, // base — no blend
  600: { type: "dark", factor: 0.15 },
  700: { type: "dark", factor: 0.35 },
  800: { type: "dark", factor: 0.5 },
  900: { type: "dark", factor: 0.65 },
};

export function getPrimaryShades(hex: string): Record<string, string> {
  const rgb = hexToRgb(hex);
  const shades: Record<string, string> = {};
  shades["DEFAULT"] = hex;
  shades["500"] = hex;
  for (const [num, { type, factor }] of Object.entries(SHADE_FACTORS)) {
    if (Number(num) === 500) continue;
    shades[num] =
      type === "light"
        ? blendWithWhite(rgb, factor)
        : blendWithBlack(rgb, factor);
  }
  return shades;
}

/** Apply primary color to document root. Call when settings load or primary color changes. */
export function applyPrimaryColor(hex: string | null | undefined): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex.trim())) {
    // Reset to default blue
    hex = "#0d6efd";
  }
  const [r, g, b] = hexToRgb(hex);
  const shades = getPrimaryShades(hex);
  root.style.setProperty("--primary", shades["DEFAULT"]);
  // RGB triplet for dark-mode alpha overlays (e.g. rgb(var(--primary-rgb) / 0.18))
  root.style.setProperty("--primary-rgb", `${r} ${g} ${b}`);
  root.style.setProperty("--primary-50", shades["50"]);
  root.style.setProperty("--primary-100", shades["100"]);
  root.style.setProperty("--primary-200", shades["200"]);
  root.style.setProperty("--primary-300", shades["300"]);
  root.style.setProperty("--primary-400", shades["400"]);
  root.style.setProperty("--primary-500", shades["500"]);
  root.style.setProperty("--primary-600", shades["600"]);
  root.style.setProperty("--primary-700", shades["700"]);
  root.style.setProperty("--primary-800", shades["800"]);
  root.style.setProperty("--primary-900", shades["900"]);
}
