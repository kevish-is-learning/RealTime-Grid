/** Row index in the grid (0-based). */
export type GridRow = number;

/** Column index in the grid (0-based). */
export type GridCol = number;

/** Unique key for a cell: `${row},${col}` — stable for React keys and maps. */
export type CellKey = `${number},${number}`;

/** CSS color string (hex, rgb, named). */
export type CellColor = string;

/** Socket.IO connection id of the player who claimed the cell, if any. */
export type OwnerId = string;

/** Single cell in the UI mirror of server state. */
export interface GridCell {
  color: CellColor | undefined;
  ownerId: OwnerId | null;
}

/**
 * 2D grid as rows of cells. Dimensions are implicit from length.
 * grid[row][col]
 */
export type GridState = GridCell[][];

export interface GridDimensions {
  rows: number;
  cols: number;
}

/** Serialized cell from the server. */
export interface GridCellSerialized {
  ownerId: OwnerId | null;
  color: CellColor | null;
}

/** Full grid snapshot (`grid:state`). */
export interface GridStatePayload {
  rows: number;
  cols: number;
  cells: GridCellSerialized[][];
}

/** Single-cell patch (`grid:cell`). */
export interface GridCellPatchPayload {
  row: number;
  col: number;
  ownerId: OwnerId | null;
  color: CellColor | null;
}
