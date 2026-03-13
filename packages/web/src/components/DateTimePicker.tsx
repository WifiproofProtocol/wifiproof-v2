"use client";

import { useEffect, useRef, useState } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

type Props = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
};

export default function DateTimePicker({ label, value, onChange, minDate }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function formatDisplay(date: Date | null) {
    if (!date) return "Select date & time";
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
        {label}
      </span>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-[1.25rem] border border-[#d2c5b0] bg-[#fbf7ee] px-4 py-3.5 text-left text-sm text-[#1f1b17] shadow-sm transition-colors hover:border-[#aa9272] focus:border-[#8c765b] focus:outline-none"
      >
        <span className={value ? "text-[#1f1b17]" : "text-[#948674]"}>
          {formatDisplay(value)}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[#7b684f]">
          <CalendarDays className="h-4 w-4" />
          <Clock3 className="h-3.5 w-3.5" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(100vw-2rem,340px)] rounded-[1.5rem] border border-[#d2c5b0] bg-[#f8f2e8] p-4 shadow-[0_24px_60px_rgba(57,43,30,0.12)]">
          <ReactDatePicker
            selected={value}
            onChange={(date: Date | null) => {
              onChange(date);
            }}
            onSelect={(date: Date | null) => {
              if (value && date) {
                const updated = new Date(date);
                updated.setHours(value.getHours(), value.getMinutes(), 0, 0);
                onChange(updated);
              }
            }}
            showTimeSelect
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="MMM d, yyyy h:mm aa"
            minDate={minDate}
            inline
            calendarClassName="!bg-transparent !border-0 !font-sans"
            renderCustomHeader={({
              date,
              decreaseMonth,
              increaseMonth,
              prevMonthButtonDisabled,
              nextMonthButtonDisabled,
            }) => (
              <div className="mb-3 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={decreaseMonth}
                  disabled={prevMonthButtonDisabled}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#75695d] transition-colors hover:bg-[#efe2d0] hover:text-[#7b4d2e] disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-[#1f1b17]">
                  {date.toLocaleString(undefined, { month: "long", year: "numeric" })}
                </span>
                <button
                  type="button"
                  onClick={increaseMonth}
                  disabled={nextMonthButtonDisabled}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#75695d] transition-colors hover:bg-[#efe2d0] hover:text-[#7b4d2e] disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-[#201b18] px-4 py-1.5 text-sm font-semibold text-[#f7f1e7] transition-colors hover:bg-[#362e27]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
