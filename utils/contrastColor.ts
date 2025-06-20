export function getContrastTextColor(bgColor: string): '#000' | '#fff' {
  // Remove hash if present
  const color = bgColor.replace('#', '');
  // Parse r, g, b
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}
