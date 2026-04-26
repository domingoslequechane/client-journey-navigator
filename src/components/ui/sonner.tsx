import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-100 group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-[#ff7a00] p-4",
          description: "group-[.toast]:text-zinc-400 text-xs mt-1",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          title: "text-sm font-bold tracking-tight",
        },
      }}
      icons={{
        success: <div className="text-[#ff7a00] mr-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m13 2-2 2.5h3L12 13l2-2.5h-3L12 2Z"/><path d="M12 13v9"/></svg></div>,
        error: <div className="text-red-500 mr-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg></div>,
        info: <div className="text-blue-400 mr-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
