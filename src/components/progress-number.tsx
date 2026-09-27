const numberPaths = [
  "M4 28C15 27 23 18 27 6L24 41",
  "M10 13C10 4 25 2 28 11C31 20 18 26 9 35C16 31 25 32 28 38",
  "M9 13C9 4 25 3 28 12C30 19 23 24 16 23L10 23C21 23 29 23 29 31C29 39 22 40 11 39C8 39 7 36 8 34L22 35",
  "M28 5C27 17 18 26 8 31L29 27L28 42",
];

export function ProgressNumber({ number }: { number: number }) {
  return (
    <svg className="progress-number" viewBox="0 0 40 48" fill="none" aria-hidden="true" focusable="false">
      <path d={numberPaths[number - 1]} stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
