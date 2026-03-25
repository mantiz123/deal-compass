import { cn } from "@/lib/utils";

interface PIWScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function PIWScoreGauge({ score, size = "md" }: PIWScoreGaugeProps) {
  const getColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-primary";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const getBackgroundColor = (score: number) => {
    if (score >= 80) return "bg-success/20";
    if (score >= 60) return "bg-primary/20";
    if (score >= 40) return "bg-warning/20";
    return "bg-destructive/20";
  };

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-base",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-bold",
        sizeClasses[size],
        getColor(score),
        getBackgroundColor(score)
      )}
    >
      {score}
    </div>
  );
}
