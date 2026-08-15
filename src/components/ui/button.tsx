import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-semibold tracking-tight ring-offset-background transition-colors duration-150 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Black card with a gold hairline and gold label — the house style
        default:
          "border-gold/30 bg-onyx text-gold shadow-2xs hover:bg-onyx-hover hover:border-gold/60",
        gold:
          "border-gold bg-gold text-gold-foreground shadow-2xs hover:bg-gold-soft hover:border-gold-soft",
        premium:
          "border-gold/45 bg-onyx text-gold shadow-sm hover:bg-onyx-hover hover:border-gold",
        destructive:
          "border-destructive/60 bg-destructive text-destructive-foreground shadow-2xs hover:bg-destructive/90",
        outline:
          "border-border bg-card text-foreground shadow-2xs hover:border-gold/50 hover:bg-secondary",
        secondary:
          "border-border bg-secondary text-secondary-foreground shadow-2xs hover:bg-secondary/70",
        ghost:
          "border-transparent text-foreground/80 hover:border-border hover:bg-secondary hover:text-foreground",
        link: "border-transparent text-primary underline-offset-4 hover:underline hover:text-gold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
