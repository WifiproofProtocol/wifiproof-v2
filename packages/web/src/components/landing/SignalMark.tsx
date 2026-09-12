type SignalMarkProps = {
  className?: string;
};

export default function SignalMark({ className }: SignalMarkProps) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className} fill="none">
      <path d="M11 15.5C23 15.5 29 20 35 27" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M8 31.5H29" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M11 48.5C23 48.5 29 44 35 37" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M43 21.5 53.5 32 43 42.5 32.5 32 43 21.5Z" fill="currentColor" />
      <circle cx="8" cy="15.5" r="3" fill="currentColor" />
      <circle cx="5" cy="31.5" r="3" fill="currentColor" />
      <circle cx="8" cy="48.5" r="3" fill="currentColor" />
    </svg>
  );
}
