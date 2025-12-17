import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface AnimatedContainerProps extends HTMLAttributes<HTMLDivElement> {
  delay?: number;
  duration?: number;
  animation?: "fade-up" | "fade-in" | "scale-in" | "slide-left" | "slide-right";
}

const AnimatedContainer = forwardRef<HTMLDivElement, AnimatedContainerProps>(
  ({ className, delay = 0, duration = 0.4, animation = "fade-up", style, children, ...props }, ref) => {
    const animationStyles = {
      "fade-up": {
        "--animation-name": "fadeUp",
      },
      "fade-in": {
        "--animation-name": "fadeIn",
      },
      "scale-in": {
        "--animation-name": "scaleIn",
      },
      "slide-left": {
        "--animation-name": "slideLeft",
      },
      "slide-right": {
        "--animation-name": "slideRight",
      },
    };

    return (
      <div
        ref={ref}
        className={cn("animate-in", className)}
        style={{
          animationName: animationStyles[animation]["--animation-name"],
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          animationFillMode: "both",
          animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

AnimatedContainer.displayName = "AnimatedContainer";

export { AnimatedContainer };
