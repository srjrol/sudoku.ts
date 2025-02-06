/* 
    Sudoku.ts
    ---------

    A Sudoku puzzle generator and solver TypeScript library.
*/

/** A mapping from a square identifier (e.g. "A1") to a string of candidate digits */
type CandidatesMap = { [square: string]: string };

/** Allowed digits for a Sudoku puzzle */
export const DIGITS: string = "123456789";

/** Row labels */
const ROWS: string = "ABCDEFGHI";

/** Column labels (same as DIGITS) */
const COLS: string = DIGITS;

/** Square IDs (e.g., "A1", "A2", …) – will be initialized later */
let SQUARES: string[];

/** All units (rows, columns, boxes) as arrays of square IDs */
let UNITS: string[][];

/** Map of square IDs to their list of units (each unit is an array of square IDs) */
let SQUARE_UNITS_MAP: { [square: string]: string[][] };

/** Map of square IDs to their peers (an array of square IDs) */
let SQUARE_PEERS_MAP: { [square: string]: string[] };

/** Minimum number of givens required in a puzzle */
const MIN_GIVENS: number = 17;

/** Total number of squares in the puzzle */
const NR_SQUARES: number = 81;

/** Predefined difficulties mapping names to the number of given squares */
const DIFFICULTY: { [key: string]: number } = {
  easy: 62,
  medium: 53,
  hard: 44,
  "very-hard": 35,
  insane: 26,
  inhuman: 17,
};

/** Blank character used in board representations */
export const BLANK_CHAR: string = ".";

/** A blank board represented as an 81-character string */
export const BLANK_BOARD: string =
  "...................................................." +
  ".............................";

/**
 * Initialize the Sudoku library.
 */
function initialize(): void {
  SQUARES = _cross(ROWS, COLS);
  UNITS = _get_all_units(ROWS, COLS);
  SQUARE_UNITS_MAP = _get_square_units_map(SQUARES, UNITS);
  SQUARE_PEERS_MAP = _get_square_peers_map(SQUARES, SQUARE_UNITS_MAP);
}

//────────────────────────────────────────────────────────────────────────────
// Core API Functions
//────────────────────────────────────────────────────────────────────────────

/**
 * Generate a new Sudoku puzzle of a particular difficulty.
 *
 * @param difficulty - Difficulty level (a string key or number of givens). Defaults to "easy".
 * @param unique - Whether the puzzle should have a unique solution (not enforced yet). Defaults to true.
 * @returns The generated puzzle board as an 81-character string.
 * @throws If candidate mapping fails.
 */
export function generate(
  difficulty: string | number = "easy",
  unique: boolean = true
): string {
  // If difficulty is a string or undefined, convert it to a number using the DIFFICULTY mapping.
  if (typeof difficulty === "string" || typeof difficulty === "undefined") {
    difficulty = DIFFICULTY[difficulty] || DIFFICULTY.easy;
  }

  // Force difficulty between MIN_GIVENS and NR_SQUARES inclusive.
  difficulty = _force_range(difficulty, NR_SQUARES + 1, MIN_GIVENS);

  // Create a blank board.
  const blank_board: string = BLANK_CHAR.repeat(NR_SQUARES);
  const candidates: CandidatesMap | false = _get_candidates_map(blank_board);
  if (!candidates) {
    throw new Error("Failed to generate candidate map for blank board.");
  }

  // Iterate over a shuffled list of squares.
  for (const square of _shuffle(SQUARES)) {
    const rand_candidate_idx: number = _rand_range(candidates[square].length);
    const rand_candidate: string = candidates[square][rand_candidate_idx];
    if (!_assign(candidates, square, rand_candidate)) {
      break;
    }

    // Build a list of squares with a single candidate.
    const single_candidates: string[] = [];
    for (const sq of SQUARES) {
      if (candidates[sq].length === 1) {
        single_candidates.push(candidates[sq]);
      }
    }

    // If we have at least 'difficulty' givens and enough unique digits, construct the board.
    if (
      single_candidates.length >= Number(difficulty) &&
      _strip_dups(single_candidates).length >= 8
    ) {
      let board: string = "";
      const givens_idxs: number[] = [];
      for (let i = 0; i < SQUARES.length; i++) {
        const sq = SQUARES[i];
        if (candidates[sq].length === 1) {
          board += candidates[sq];
          givens_idxs.push(i);
        } else {
          board += BLANK_CHAR;
        }
      }

      // If we have more givens than desired, remove random givens until exactly 'difficulty' remain.
      const nr_givens: number = givens_idxs.length;
      if (nr_givens > Number(difficulty)) {
        const shuffledGivens: number[] = _shuffle(givens_idxs);
        for (let i = 0; i < nr_givens - Number(difficulty); i++) {
          const target: number = shuffledGivens[i];
          board =
            board.substring(0, target) +
            BLANK_CHAR +
            board.substring(target + 1);
        }
      }

      // If the board is solvable, return it.
      if (solve(board)) {
        return board;
      }
    }
  }

  // If no valid board is produced, try again recursively.
  return generate(difficulty, unique);
}

/**
 * Solve a Sudoku puzzle.
 *
 * @param board - An 81-character string representing the puzzle.
 * @param reverse - Whether to search the solution space in reverse order. Defaults to false.
 * @returns The solved board as an 81-character string, or false if no solution exists.
 * @throws If the board is invalid or has too few givens.
 */
export function solve(board: string, reverse: boolean = false): string | false {
  const report = validate_board(board);
  if (report !== true) {
    throw new Error(report);
  }

  // Count the number of givens.
  let nr_givens: number = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== BLANK_CHAR && _in(board[i], DIGITS)) {
      nr_givens++;
    }
  }
  if (nr_givens < MIN_GIVENS) {
    throw new Error(`Too few givens. Minimum givens is ${MIN_GIVENS}`);
  }

  const candidates: CandidatesMap | false = _get_candidates_map(board);
  const result = _search(candidates, reverse);

  if (result) {
    let solution: string = "";
    for (const square in result) {
      solution += result[square];
    }
    return solution;
  }
  return false;
}

/**
 * Return all possible candidates for each square as a grid.
 *
 * @param board - An 81-character board string.
 * @returns A two-dimensional array of candidate strings per square, or false if a contradiction is encountered.
 * @throws If the board is invalid.
 */
export function get_candidates(board: string): string[][] | false {
  const report = validate_board(board);
  if (report !== true) {
    throw new Error(report);
  }

  const candidates_map: CandidatesMap | false = _get_candidates_map(board);
  if (!candidates_map) {
    return false;
  }

  const rows: string[][] = [];
  let cur_row: string[] = [];
  let i = 0;
  for (const square in candidates_map) {
    cur_row.push(candidates_map[square]);
    if (i % 9 === 8) {
      rows.push(cur_row);
      cur_row = [];
    }
    i++;
  }
  return rows;
}

//────────────────────────────────────────────────────────────────────────────
// Internal (helper) Functions
//────────────────────────────────────────────────────────────────────────────

/**
 * Get all possible candidates for each square as a map in the form {square: DIGITS}
 * using recursive constraint propagation.
 * Returns false if a contradiction is encountered.
 *
 * @param board - An 81-character board string.
 * @returns The candidates map or false.
 */
function _get_candidates_map(board: string): CandidatesMap | false {
  const report = validate_board(board);
  if (report !== true) {
    throw new Error(report);
  }

  const candidate_map: CandidatesMap = {};
  const squares_values_map = _get_square_vals_map(board);

  // Start by assigning every digit as a candidate to every square.
  for (const square of SQUARES) {
    candidate_map[square] = DIGITS;
  }

  // For each non-blank square, assign its value and propagate constraints.
  for (const square in squares_values_map) {
    const val = squares_values_map[square];
    if (_in(val, DIGITS)) {
      const new_candidates = _assign(candidate_map, square, val);
      if (!new_candidates) {
        return false;
      }
    }
  }
  return candidate_map;
}

/**
 * Recursively search through the candidates map using depth-first search.
 *
 * @param candidates - The current candidate mapping.
 * @param reverse - Whether to search in reverse order. Defaults to false.
 * @returns A solved candidates map or false if no solution exists.
 */
function _search(
  candidates: CandidatesMap | false,
  reverse: boolean = false
): CandidatesMap | false {
  if (!candidates) {
    return false;
  }

  // If every square is solved, return the candidates map.
  let max_nr_candidates = 0;
  for (const square of SQUARES) {
    const nr_candidates = candidates[square].length;
    if (nr_candidates > max_nr_candidates) {
      max_nr_candidates = nr_candidates;
    }
  }
  if (max_nr_candidates === 1) {
    return candidates;
  }

  // Choose the blank square with the fewest candidates (greater than 1).
  let min_nr_candidates = 10;
  let min_candidates_square: string | null = null;
  for (const square of SQUARES) {
    const nr_candidates = candidates[square].length;
    if (nr_candidates < min_nr_candidates && nr_candidates > 1) {
      min_nr_candidates = nr_candidates;
      min_candidates_square = square;
    }
  }
  if (min_candidates_square === null) {
    return false;
  }
  const min_candidates = candidates[min_candidates_square];

  if (!reverse) {
    for (const val of min_candidates) {
      // Deep copy candidates using JSON (acceptable for our purposes)
      const candidates_copy: CandidatesMap = JSON.parse(
        JSON.stringify(candidates)
      );
      const candidates_next = _search(
        _assign(candidates_copy, min_candidates_square, val),
        reverse
      );
      if (candidates_next) {
        return candidates_next;
      }
    }
  } else {
    for (let vi = min_candidates.length - 1; vi >= 0; vi--) {
      const val = min_candidates[vi];
      const candidates_copy: CandidatesMap = JSON.parse(
        JSON.stringify(candidates)
      );
      const candidates_next = _search(
        _assign(candidates_copy, min_candidates_square, val),
        reverse
      );
      if (candidates_next) {
        return candidates_next;
      }
    }
  }
  return false;
}

/**
 * Eliminate all values except for `val` from candidates at `square`, and propagate.
 *
 * @param candidates - The current candidates map.
 * @param square - The square identifier.
 * @param val - The value to assign.
 * @returns The updated candidates map or false if a contradiction occurs.
 */
function _assign(
  candidates: CandidatesMap,
  square: string,
  val: string
): CandidatesMap | false {
  const other_vals = candidates[square].replace(val, "");
  for (const other_val of other_vals) {
    const candidates_next = _eliminate(candidates, square, other_val);
    if (!candidates_next) {
      return false;
    }
  }
  return candidates;
}

/**
 * Eliminate `val` from candidates at `square` and propagate constraints.
 *
 * @param candidates - The current candidates map.
 * @param square - The square identifier.
 * @param val - The value to eliminate.
 * @returns The updated candidates map or false if a contradiction occurs.
 */
function _eliminate(
  candidates: CandidatesMap,
  square: string,
  val: string
): CandidatesMap | false {
  if (!_in(val, candidates[square])) {
    return candidates;
  }

  candidates[square] = candidates[square].replace(val, "");
  const nr_candidates = candidates[square].length;
  if (nr_candidates === 1) {
    const target_val = candidates[square];
    for (const peer of SQUARE_PEERS_MAP[square]) {
      const candidates_new = _eliminate(candidates, peer, target_val);
      if (!candidates_new) {
        return false;
      }
    }
  } else if (nr_candidates === 0) {
    return false;
  }

  // If a unit is reduced to only one place for a value, then assign it there.
  for (const unit of SQUARE_UNITS_MAP[square]) {
    const val_places: string[] = [];
    for (const unit_square of unit) {
      if (_in(val, candidates[unit_square])) {
        val_places.push(unit_square);
      }
    }
    if (val_places.length === 0) {
      return false;
    } else if (val_places.length === 1) {
      const candidates_new = _assign(candidates, val_places[0], val);
      if (!candidates_new) {
        return false;
      }
    }
  }
  return candidates;
}

/**
 * Return a map of squares to their values from a board string.
 *
 * @param board - An 81-character board string.
 * @returns A mapping from square identifiers to their assigned value.
 * @throws If the board length does not match the expected number of squares.
 */
function _get_square_vals_map(board: string): { [square: string]: string } {
  const squares_vals_map: { [square: string]: string } = {};
  if (board.length !== SQUARES.length) {
    throw new Error("Board/squares length mismatch.");
  }
  for (let i = 0; i < SQUARES.length; i++) {
    squares_vals_map[SQUARES[i]] = board[i];
  }
  return squares_vals_map;
}

/**
 * Return a map of squares to their associated units.
 *
 * @param squares - An array of square identifiers.
 * @param units - An array of units (each a list of square identifiers).
 * @returns The map of square units.
 */
function _get_square_units_map(
  squares: string[],
  units: string[][]
): { [square: string]: string[][] } {
  const square_unit_map: { [square: string]: string[][] } = {};
  for (const cur_square of squares) {
    const cur_square_units: string[][] = [];
    for (const cur_unit of units) {
      if (cur_unit.indexOf(cur_square) !== -1) {
        cur_square_units.push(cur_unit);
      }
    }
    square_unit_map[cur_square] = cur_square_units;
  }
  return square_unit_map;
}

/**
 * Return a map of squares to their peers.
 *
 * @param squares - An array of square identifiers.
 * @param units_map - A mapping from squares to their units.
 * @returns The map of square peers.
 */
function _get_square_peers_map(
  squares: string[],
  units_map: { [square: string]: string[][] }
): { [square: string]: string[] } {
  const square_peers_map: { [square: string]: string[] } = {};
  for (const cur_square of squares) {
    const cur_square_units = units_map[cur_square];
    const cur_square_peers: string[] = [];
    for (const unit of cur_square_units) {
      for (const cur_unit_square of unit) {
        if (
          cur_square_peers.indexOf(cur_unit_square) === -1 &&
          cur_unit_square !== cur_square
        ) {
          cur_square_peers.push(cur_unit_square);
        }
      }
    }
    square_peers_map[cur_square] = cur_square_peers;
  }
  return square_peers_map;
}

/**
 * Return a list of all units (rows, columns, boxes).
 *
 * @param rows - The string of row labels.
 * @param cols - The string of column labels.
 * @returns An array of units (each a list of square identifiers).
 */
function _get_all_units(rows: string, cols: string): string[][] {
  const units: string[][] = [];
  // Rows
  for (const r of rows) {
    units.push(_cross(r, cols));
  }
  // Columns
  for (const c of cols) {
    units.push(_cross(rows, c));
  }
  // Boxes
  const row_squares = ["ABC", "DEF", "GHI"];
  const col_squares = ["123", "456", "789"];
  for (const rs of row_squares) {
    for (const cs of col_squares) {
      units.push(_cross(rs, cs));
    }
  }
  return units;
}

/**
 * Convert a board string to a two-dimensional array.
 *
 * @param board_string - An 81-character board string.
 * @returns A two-dimensional array representing the board.
 */
export function board_string_to_grid(board_string: string): string[][] {
  const rows: string[][] = [];
  let cur_row: string[] = [];
  for (let i = 0; i < board_string.length; i++) {
    cur_row.push(board_string[i]);
    if (i % 9 === 8) {
      rows.push(cur_row);
      cur_row = [];
    }
  }
  return rows;
}

/**
 * Convert a board grid to a board string.
 *
 * @param board_grid - A two-dimensional board array.
 * @returns The board as an 81-character string.
 */
export function board_grid_to_string(board_grid: string[][]): string {
  let board_string = "";
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      board_string += board_grid[r][c];
    }
  }
  return board_string;
}

/**
 * Print a Sudoku board to the console.
 *
 * @param board - An 81-character board string.
 * @throws If the board is invalid.
 */
export function print_board(board: string): void {
  const report = validate_board(board);
  if (report !== true) {
    throw new Error(report);
  }
  const V_PADDING = " ";
  const H_PADDING = "\n";
  const V_BOX_PADDING = "  ";
  const H_BOX_PADDING = "\n";

  let display_string = "";
  for (let i = 0; i < board.length; i++) {
    const square = board[i];
    display_string += square + V_PADDING;
    if (i % 3 === 2) {
      display_string += V_BOX_PADDING;
    }
    if (i % 9 === 8) {
      display_string += H_PADDING;
    }
    if (i % 27 === 26) {
      display_string += H_BOX_PADDING;
    }
  }
  console.log(display_string);
}

/**
 * Validate the given board.
 *
 * @param board - An 81-character board string.
 * @returns True if valid; otherwise, an error message.
 */
export function validate_board(board: string): true | string {
  if (!board) {
    return "Empty board";
  }
  if (board.length !== NR_SQUARES) {
    return `Invalid board size. Board must be exactly ${NR_SQUARES} squares.`;
  }
  for (let i = 0; i < board.length; i++) {
    if (!_in(board[i], DIGITS) && board[i] !== BLANK_CHAR) {
      return `Invalid board character encountered at index ${i}: ${board[i]}`;
    }
  }
  return true;
}

/**
 * Cross product of all elements in `a` and `b`.
 * For example, _cross("abc", "123") returns:
 * ["a1", "a2", "a3", "b1", "b2", "b3", "c1", "c2", "c3"]
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns The cross product as an array of strings.
 */
function _cross(a: string, b: string): string[] {
  const result: string[] = [];
  for (const ai of a) {
    for (const bi of b) {
      result.push(ai + bi);
    }
  }
  return result;
}

/**
 * Check whether a value is in a given string.
 *
 * @param v - The value to check.
 * @param seq - The string to search.
 * @returns True if found; otherwise, false.
 */
function _in(v: string, seq: string): boolean {
  return seq.indexOf(v) !== -1;
}

/**
 * Return the first truthy element in the sequence, or false if none found.
 *
 * @param seq - An array of values.
 * @returns The first truthy value or false.
 */
function _first_true<T>(seq: T[]): T | false {
  for (const item of seq) {
    if (item) {
      return item;
    }
  }
  return false;
}

/**
 * Return a shuffled copy of the input array.
 *
 * @param seq - The array to shuffle.
 * @returns The shuffled array.
 */
function _shuffle<T>(seq: T[]): T[] {
  const shuffled: (T | false)[] = new Array(seq.length).fill(false);
  for (const item of seq) {
    let ti = _rand_range(seq.length);
    while (shuffled[ti] !== false) {
      ti = (ti + 1) > (seq.length - 1) ? 0 : ti + 1;
    }
    shuffled[ti] = item;
  }
  return shuffled as T[];
}

/**
 * Get a random integer in the range [min, max) (max non-inclusive).
 *
 * @param max - The exclusive upper bound.
 * @param min - The inclusive lower bound (default 0).
 * @returns A random integer.
 * @throws If max is not defined.
 */
function _rand_range(max: number, min: number = 0): number {
  if (max) {
    return Math.floor(Math.random() * (max - min)) + min;
  } else {
    throw new Error("Range undefined");
  }
}

/**
 * Strip duplicate values from an array.
 *
 * @param seq - The input array.
 * @returns A new array with duplicates removed.
 */
function _strip_dups<T>(seq: T[]): T[] {
  const seq_set: T[] = [];
  const dup_map: { [key: string]: boolean } = {};
  for (const e of seq) {
    if (!dup_map[String(e)]) {
      seq_set.push(e);
      dup_map[String(e)] = true;
    }
  }
  return seq_set;
}

/**
 * Force a number to be within a specified range.
 *
 * @param nr - The number to adjust.
 * @param max - The exclusive upper bound.
 * @param min - The inclusive lower bound (default 0).
 * @returns The number forced within the range.
 */
function _force_range(nr: number, max: number, min: number = 0): number {
  nr = nr || 0;
  if (nr < min) {
    return min;
  }
  if (nr > max) {
    return max;
  }
  return nr;
}

initialize();
