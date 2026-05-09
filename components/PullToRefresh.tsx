import React, { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 70,
  maxPull = 110,
  disabled = false,
}) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node || disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      if (e.touches.length !== 1) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        pulling.current = false;
        setPull(0);
        return;
      }
      if (window.scrollY > 0) {
        pulling.current = false;
        setPull(0);
        return;
      }
      // Rubber-band damping
      const damped = Math.min(maxPull, dy * 0.5);
      setPull(damped);
      // Prevent native browser pull-to-refresh once we're tracking
      if (dy > 8 && e.cancelable) {
        e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pull >= threshold && !refreshing) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await Promise.resolve(onRefresh());
        } finally {
          // Small delay so the spinner is visible at least briefly
          setTimeout(() => {
            setRefreshing(false);
            setPull(0);
          }, 350);
        }
      } else {
        setPull(0);
      }
    };

    const onTouchCancel = () => {
      pulling.current = false;
      setPull(0);
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [disabled, refreshing, pull, threshold, maxPull, onRefresh]);

  const visualPull = refreshing ? threshold : pull;
  const progress = Math.min(1, pull / threshold);
  const isReady = pull >= threshold;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Pull indicator */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 -top-2 flex items-start justify-center overflow-hidden"
        style={{
          height: visualPull,
          transition:
            refreshing || pull === 0
              ? "height 240ms cubic-bezier(0.22, 1, 0.36, 1)"
              : "none",
        }}
      >
        <div
          className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200"
          style={{
            opacity: Math.min(1, progress + 0.1),
            transform: `scale(${0.6 + progress * 0.4}) rotate(${progress * 270}deg)`,
            transition:
              refreshing || pull === 0
                ? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease"
                : "none",
          }}
        >
          <RefreshCw
            size={18}
            className={`${
              isReady || refreshing ? "text-blue-600" : "text-slate-400"
            } ${refreshing ? "animate-spin" : ""}`}
            strokeWidth={2.4}
          />
        </div>
      </div>

      {/* Content shifts down with the pull */}
      <div
        style={{
          transform: `translateY(${visualPull}px)`,
          transition:
            refreshing || pull === 0
              ? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)"
              : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
};
