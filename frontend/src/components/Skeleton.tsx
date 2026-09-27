interface SkeletonProps {
  className?: string;
  variant?: "line" | "block" | "circle";
  width?: string;
  height?: string;
}

/**
 * Shimmer skeleton loader — drop in to replace content while it is loading.
 * Uses the .skeleton CSS class defined in index.css for the animation.
 */
export default function Skeleton({ className = "", variant = "block", width, height }: SkeletonProps) {
  const shapes = {
    line: "h-3.5 rounded-full",
    block: "h-20 rounded-2xl",
    circle: "rounded-full aspect-square",
  };
  return (
    <div
      className={`skeleton ${shapes[variant]} ${width ?? "w-full"} ${height ?? ""} ${className}`}
    />
  );
}

/** A group of skeleton lines that look like a paragraph of text */
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="line"
          width={i === lines - 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  );
}

/** Grid of KPI card skeletons */
export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton rounded-2xl h-24" />
      ))}
    </div>
  );
}
