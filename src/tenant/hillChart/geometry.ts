export interface Coords {
  x: number;
  y: number;
}

/**
 * Mappt eine Hill-Position (0-100) auf {x, y}-Koordinaten einer Parabel-Hügelkurve.
 * 0 = linker Fußpunkt, 50 = Gipfel, 100 = rechter Fußpunkt. y wächst nach oben (0 = Boden).
 */
export function hillPositionToCoords(position: number, width: number, height: number): Coords {
  const clamped = Math.max(0, Math.min(100, position));
  const x = (clamped / 100) * width;
  const normalized = clamped / 50 - 1; // -1 (links) .. 0 (Gipfel) .. 1 (rechts)
  const y = height * (1 - normalized * normalized);
  return { x, y };
}
