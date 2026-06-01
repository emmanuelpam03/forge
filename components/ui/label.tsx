import * as React from "react";

import { cn } from "@/lib/utils";

type LabelProps = React.ComponentProps<"label">;

function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export { Label };