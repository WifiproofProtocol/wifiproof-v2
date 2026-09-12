import { Check } from "lucide-react";

export default function StepRail({ labels, current }: { labels: readonly string[]; current: number }) {
  return (
    <ol className="product-step-rail" aria-label="Progress">
      {labels.map((label, index) => {
        const complete = index < current;
        const active = index === current;
        return (
          <li key={label} className={`product-step ${active ? "product-step-active" : ""}`} aria-current={active ? "step" : undefined}>
            <span className={`product-step-dot ${complete ? "product-step-dot-complete" : ""}`}>
              {complete ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
