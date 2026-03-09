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
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-cyan-900/30 bg-[#02040A] px-4 py-3 text-left text-sm transition-colors hover:border-cyan-700/50 focus:outline-none focus:border-cyan-500/50"
      >
        <span className={value ? "text-white" : "text-slate-500"}>
          {formatDisplay(value)}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-cyan-400">
          <CalendarDays className="h-4 w-4" />
          <Clock3 className="h-3.5 w-3.5" />
        </span>
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-2xl border border-cyan-900/40 bg-[#0a0f1a] p-4 shadow-2xl">
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
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-cyan-900/30 hover:text-cyan-300 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-white">
                  {date.toLocaleString(undefined, { month: "long", year: "numeric" })}
                </span>
                <button
                  type="button"
                  onClick={increaseMonth}
                  disabled={nextMonthButtonDisabled}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-cyan-900/30 hover:text-cyan-300 disabled:opacity-30"
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
              className="rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-cyan-400"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
