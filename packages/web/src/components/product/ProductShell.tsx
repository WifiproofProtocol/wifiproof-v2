import type { ReactNode } from "react";

import ProductHeader from "./ProductHeader";

type ProductShellProps = {
  current?: "events" | "organizer" | "school";
  children: ReactNode;
  width?: "wide" | "standard";
};

export default function ProductShell({ current, children, width = "standard" }: ProductShellProps) {
  return (
    <main className="product-shell">
      <ProductHeader current={current} />
      <div className={`mx-auto w-full px-5 pb-20 pt-10 sm:px-8 sm:pt-14 ${width === "wide" ? "max-w-7xl" : "max-w-6xl"}`}>
        {children}
      </div>
    </main>
  );
}
