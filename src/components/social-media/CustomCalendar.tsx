import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function CustomCalendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 pb-2", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-6",
        caption: "flex items-center justify-between px-2 py-1 relative",
        caption_label: "text-base font-bold text-white tracking-tight",
        nav: "flex items-center gap-2",
        nav_button: cn(
          "h-9 w-9 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center transition-all border border-white/5"
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse",
        head_row: "flex mb-2",
        head_cell: "text-muted-foreground/40 rounded-md w-10 font-bold text-[10px] uppercase tracking-wider",
        row: "flex w-full mt-0 gap-0",
        cell: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          "h-10 w-10 p-0 font-medium transition-all rounded-lg hover:bg-white/5 text-white/70",
          "aria-selected:opacity-100"
        ),
        day_selected:
          "bg-primary text-white hover:bg-primary-hover hover:text-white focus:bg-primary focus:text-white font-black shadow-lg shadow-primary/20 scale-105 rounded-lg",
        day_today: "bg-white/5 text-primary font-bold",
        day_outside: "text-muted-foreground/20 opacity-30",
        day_disabled: "text-muted-foreground/20 opacity-20",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
