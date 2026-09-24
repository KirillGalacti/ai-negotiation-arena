interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="50" cy="50" r="37" fill="#FF614A" />
      <path
        d="M61 13 26 39c-6 4-7 11-3 15 5 5 12 5 18 1l8-6c8-6 17-5 23 1l19 20"
        stroke="#C9DFFF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m66 64 15 14M57 71l14 13M47 78l10 10"
        stroke="#C9DFFF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
