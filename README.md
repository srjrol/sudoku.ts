# Sudoku.ts

A Sudoku puzzle generator and solver written in TypeScript. This library uses recursive constraint propagation and depth-first search to generate valid Sudoku puzzles and solve them.

## Features

- **Puzzle Generation:** Create a new Sudoku puzzle with a specified difficulty.
- **Puzzle Solving:** Solve any valid 81-character Sudoku puzzle.
- **Candidate Grid:** Get the candidate grid for a given puzzle.
- **Board Conversions:** Convert between string and grid representations.

## Installation

Clone the repository or install via your preferred package manager (if published as an npm package):

```bash
git clone https://github.com/srjrol/sudoku.ts.git
```

Then, include it in your project:

```ts
import { generate, solve, get_candidates, board_string_to_grid, board_grid_to_string, print_board, validate_board, DIGITS, BLANK_CHAR, BLANK_BOARD } from 'path-to-your-sudoku-ts';
```

## Usage

### Generate a Puzzle

```ts
import { generate } from './sudoku';

const puzzle = generate("easy");
console.log("Generated Puzzle:");
console.log(puzzle);
```

### Solve a Puzzle

```ts
import { solve } from './sudoku';

const puzzle = ".....your81-character-puzzle-string.....";
const solution = solve(puzzle);
console.log("Solution:");
console.log(solution);
```

### Get Candidate Grid

```ts
import { get_candidates } from './sudoku';

const candidatesGrid = get_candidates(".....your81-character-puzzle-string.....");
console.log("Candidates Grid:");
console.log(candidatesGrid);
```
## Credit

This was updated to TypeScript from the JS equivalent https://github.com/robatron/sudoku.js

## Development

To build the project, use your preferred TypeScript build tool (e.g. `tsc`). Make sure your `tsconfig.json` is set up for ES Modules.

## License

This project is licensed under the MIT License.
```

---

### File: `LICENSE`

```text
MIT License

Copyright (c) 2025 Sean Jennings

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
