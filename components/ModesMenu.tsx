"use client";

import { RefObject, useEffect, useRef } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import {
  useSelectedOptions,
  OPTIONS,
  type OptionId,
} from "@/hooks/useSelectedOptions";
import { useFeedback } from "@/components/feedback-provider";

interface ModesMenuProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string | null;
  className?: string;
  triggerRef?: RefObject<HTMLElement | null>;
}

export function ModesMenu({
  isOpen,
  onClose,
  chatId,
  className,
  triggerRef,
}: ModesMenuProps) {
  const { showFeedback } = useFeedback();
  const menuRef = useRef<HTMLDivElement>(null);
  const effectiveChatId = chatId || "search-global";
  const { toggleOption, isSelected, isLoaded } =
    useSelectedOptions(effectiveChatId);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideMenu = menuRef.current?.contains(target);
      const clickedOnTrigger = triggerRef?.current?.contains(target);

      if (!clickedInsideMenu && !clickedOnTrigger) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !isLoaded) return null;

  const handleToggleOption = (optionId: OptionId) => {
    const currentState = isSelected(optionId);
    toggleOption(optionId);
    const optionLabel = OPTIONS[optionId]?.label ?? optionId;
    showFeedback({
      type: "success",
      title: currentState
        ? `${optionLabel} disabled`
        : `${optionLabel} enabled`,
    });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className={
        className ??
        "absolute top-12 left-4 right-4 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
      }
    >
      <div className="p-3 space-y-2">
        <div className="px-3 py-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Options
          </p>
        </div>

        {Object.values(OPTIONS).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleToggleOption(option.id)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <span className="text-base">{option.icon}</span>
              <p className="text-[13px] font-medium text-foreground">
                {option.label}
              </p>
            </div>
            {isSelected(option.id) ? (
              <CheckCircle2 size={18} className="text-primary" />
            ) : (
              <Circle size={18} className="text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
