export interface JustifyRow {
  indices: number[];
  height: number;
}

/**
 * Greedy justified layout. Walks images in order, accumulating into a row
 * until they would overflow the container at targetHeight, then scales the
 * row so its item widths + gaps exactly equal containerWidth.
 *
 * Item width within a returned row = row.height * ratios[index].
 *
 * The final (sparse) row is scaled to fill too, but its scale is capped at
 * lastRowMaxScale so one stray narrow image doesn't balloon.
 */
export function packRows(
  ratios: number[],
  containerWidth: number,
  targetHeight: number,
  gap: number,
  lastRowMaxScale = 1.5,
): JustifyRow[] {
  const rows: JustifyRow[] = [];
  let current: number[] = [];
  let ratioSum = 0;

  const fill = (indices: number[], rSum: number, cap?: number): JustifyRow => {
    const totalGap = gap * (indices.length - 1);
    const rawScale = (containerWidth - totalGap) / (rSum * targetHeight);
    const scale = cap !== undefined ? Math.min(cap, rawScale) : rawScale;
    return { indices, height: targetHeight * scale };
  };

  for (let i = 0; i < ratios.length; i++) {
    current.push(i);
    ratioSum += ratios[i];
    const width = ratioSum * targetHeight + gap * (current.length - 1);
    if (width >= containerWidth) {
      rows.push(fill(current, ratioSum));
      current = [];
      ratioSum = 0;
    }
  }

  if (current.length) {
    const naturalWidth = ratioSum * targetHeight + gap * (current.length - 1);
    // If the leftover row is nearly full, justify it exactly; otherwise cap.
    const cap = naturalWidth >= containerWidth * 0.85 ? undefined : lastRowMaxScale;
    rows.push(fill(current, ratioSum, cap));
  }

  return rows;
}
