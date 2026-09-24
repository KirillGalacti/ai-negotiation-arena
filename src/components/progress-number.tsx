const numberPaths = [
  "M7 28C17 27 23 18 25 7L24 41",
  "M10 14C10 3 29 3 29 15C29 23 16 31 9 39C18 33 23 35 30 38",
  "M9 15C9 3 28 4 28 15C28 22 21 23 16 24C24 22 30 25 30 32C30 41 20 42 11 40",
  "M28 5C27 17 18 26 8 31L29 27L28 42",
];

export function ProgressNumber({ number }: { number: number }) {
  return (
    <svg className="progress-number" viewBox="0 0 40 48" fill="none" aria-hidden="true" focusable="false">
      <path d={numberPaths[number - 1]} stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
