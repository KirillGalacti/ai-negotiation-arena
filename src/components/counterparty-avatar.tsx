export function CounterpartyAvatar() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="avatar-fill" x1="100" y1="18" x2="100" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9E9FF" />
          <stop offset="0.72" stopColor="#9AA7B8" />
          <stop offset="1" stopColor="#625B5A" />
        </linearGradient>
        <clipPath id="avatar-clip">
          <circle cx="100" cy="100" r="100" />
        </clipPath>
      </defs>
      <g clipPath="url(#avatar-clip)">
        <circle cx="100" cy="64" r="43" fill="url(#avatar-fill)" />
        <circle cx="100" cy="64" r="25" fill="#5A5250" />
        <path d="M10 204c9-59 43-94 90-94s81 35 90 94" fill="url(#avatar-fill)" />
        <path
          d="M27 204c10-44 36-70 73-70s63 26 73 70"
          stroke="#D9E9FF"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
