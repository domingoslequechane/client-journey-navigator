import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle2, AlertTriangle, Info, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden",
    "rounded-xl border shadow-2xl shadow-black/40",
    "px-4 py-3.5 pr-10",
    "backdrop-blur-md",
    "transition-all duration-300 ease-out",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[swipe=end]:animate-out data-[state=closed]:fade-out-80",
    "data-[state=closed]:slide-out-to-right-full",
    "data-[state=open]:slide-in-from-bottom-4",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=move]:transition-none",
    "data-[swipe=cancel]:translate-x-0",
    "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-zinc-900/95 border-zinc-700/60 text-zinc-100 [&_[data-accent]]:bg-orange-500",
        destructive:
          "bg-zinc-900/95 border-red-800/50 text-zinc-100 [&_[data-accent]]:bg-red-500",
        success:
          "bg-zinc-900/95 border-emerald-800/50 text-zinc-100 [&_[data-accent]]:bg-emerald-500",
        warning:
          "bg-zinc-900/95 border-amber-800/50 text-zinc-100 [&_[data-accent]]:bg-amber-500",
        info:
          "bg-zinc-900/95 border-blue-800/50 text-zinc-100 [&_[data-accent]]:bg-blue-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const toastIconMap = {
  default: <Zap className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />,
  destructive: <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
  info: <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
};

type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant = "default", children, ...props }, ref) => {
  const icon = toastIconMap[variant as ToastVariant] ?? toastIconMap.default;

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {/* Left accent bar */}
      <div
        data-accent
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
      />

      {/* Icon */}
      <div className="flex-shrink-0 pl-1">{icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-zinc-700",
      "bg-zinc-800 px-3 text-xs font-medium text-zinc-200",
      "transition-colors hover:bg-zinc-700 hover:text-white",
      "focus:outline-none focus:ring-1 focus:ring-orange-500",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1",
      "text-zinc-500 opacity-0 transition-all",
      "group-hover:opacity-100 hover:text-zinc-200 hover:bg-zinc-700/50",
      "focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-orange-500/50",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold text-zinc-100 leading-tight", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs text-zinc-400 mt-0.5 leading-snug", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
