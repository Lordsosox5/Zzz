import { Activity, CheckCircle2, UserRound, ArrowRightLeft, HelpCircle } from "lucide-react";

type PatientStatus = "admitted" | "outpatient" | "discharged" | "transferred" | string;

interface Config {
  icon: React.ElementType;
  dot: string;
  bg: string;
  border: string;
  text: string;
  pulse: boolean;
  labelEn: string;
  labelAr: string;
}

const STATUS_CONFIG: Record<string, Config> = {
  admitted: {
    icon: Activity,
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-400",
    pulse: true,
    labelEn: "Admitted",
    labelAr: "مقيم",
  },
  outpatient: {
    icon: UserRound,
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
    pulse: false,
    labelEn: "Outpatient",
    labelAr: "خارجي",
  },
  discharged: {
    icon: CheckCircle2,
    dot: "bg-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-600 dark:text-slate-400",
    pulse: false,
    labelEn: "Discharged",
    labelAr: "خُرِّج",
  },
  transferred: {
    icon: ArrowRightLeft,
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    pulse: false,
    labelEn: "Transferred",
    labelAr: "محوّل",
  },
};

const FALLBACK: Config = {
  icon: HelpCircle,
  dot: "bg-gray-400",
  bg: "bg-gray-100 dark:bg-gray-800/40",
  border: "border-gray-200 dark:border-gray-700",
  text: "text-gray-600 dark:text-gray-400",
  pulse: false,
  labelEn: "Unknown",
  labelAr: "غير معروف",
};

interface Props {
  status: PatientStatus;
  size?: "sm" | "md";
}

export function PatientStatusBadge({ status, size = "md" }: Props) {
  const language =
    typeof window !== "undefined"
      ? (localStorage.getItem("ehr_lang") ?? "en")
      : "en";

  const cfg = STATUS_CONFIG[status] ?? FALLBACK;
  const Icon = cfg.icon;
  const label = language === "ar" ? cfg.labelAr : cfg.labelEn;
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border
        ${cfg.bg} ${cfg.border} ${cfg.text}
        ${isSm ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}
      `}
    >
      <span className="relative flex shrink-0 items-center justify-center">
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.pulse && (
          <span className={`absolute h-1.5 w-1.5 rounded-full ${cfg.dot} animate-ping opacity-75`} />
        )}
      </span>
      <Icon className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );
}
