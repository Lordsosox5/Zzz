import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { logout, getUser } from "@/lib/auth";
import { getNavForRole, getRoleLabel } from "@/lib/permissions";
import { useNotifications, type Notification } from "@/lib/notifications";
import {
  LayoutDashboard, Users, Users2, Calendar, FileText, Pill,
  FlaskConical, Activity, HeartPulse, Receipt, UserRound,
  ShieldAlert, Settings, LogOut, Bell, Moon, Sun, Languages, TrendingUp, Building2,
  X, FlaskRound, UserPlus, CalendarPlus, PackageOpen, CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const ALL_NAV_ITEMS = [
  { href: "/dashboard",      icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { href: "/patients",       icon: Users,           labelKey: "nav.patients" },
  { href: "/my-patients",    icon: Users2,          labelKey: "nav.myPatients" },
  { href: "/appointments",   icon: Calendar,        labelKey: "nav.appointments" },
  { href: "/clinical-notes", icon: FileText,        labelKey: "nav.notes" },
  { href: "/prescriptions",  icon: Pill,            labelKey: "nav.prescriptions" },
  { href: "/lab",            icon: FlaskConical,    labelKey: "nav.lab" },
  { href: "/radiology",      icon: Activity,        labelKey: "nav.radiology" },
  { href: "/pharmacy",       icon: HeartPulse,      labelKey: "nav.pharmacy" },
  { href: "/billing",        icon: Receipt,         labelKey: "nav.billing" },
  { href: "/staff",          icon: UserRound,       labelKey: "nav.staff" },
  { href: "/vaccinations",   icon: ShieldAlert,     labelKey: "nav.vaccinations" },
  { href: "/growth",         icon: TrendingUp,      labelKey: "nav.growth" },
  { href: "/units",          icon: Building2,       labelKey: "nav.units" },
];

const ROLE_BADGE_COLORS: Record<string, string> = {
  super_admin:          "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  pediatric_consultant: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  pediatric_specialist: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  emergency_physician:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  nurse:                "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  pharmacist:           "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  lab_technician:       "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  billing_officer:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  house_officer:        "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  medical_officer:      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  registrar:            "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  data_analyser:        "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

const NOTIF_ICONS: Record<string, React.ElementType> = {
  critical_lab:     FlaskRound,
  new_patient:      UserPlus,
  new_appointment:  CalendarPlus,
  low_stock:        PackageOpen,
  pending_lab:      FlaskRound,
  pending_rx:       Pill,
  pending_invoice:  Receipt,
  overdue_invoice:  Receipt,
  system_alert:     ShieldAlert,
};

const NOTIF_COLORS: Record<string, string> = {
  critical_lab:    "text-red-500 bg-red-100 dark:bg-red-900/40",
  new_patient:     "text-blue-500 bg-blue-100 dark:bg-blue-900/40",
  new_appointment: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/40",
  low_stock:       "text-orange-500 bg-orange-100 dark:bg-orange-900/40",
  pending_lab:     "text-amber-500 bg-amber-100 dark:bg-amber-900/40",
  pending_rx:      "text-violet-500 bg-violet-100 dark:bg-violet-900/40",
  pending_invoice: "text-rose-500 bg-rose-100 dark:bg-rose-900/40",
  overdue_invoice: "text-rose-600 bg-rose-100 dark:bg-rose-900/40",
  system_alert:    "text-slate-500 bg-slate-100 dark:bg-slate-900/40",
};

const NOTIF_SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  warning:  "bg-amber-500",
  info:     "bg-blue-400",
};

function timeAgo(date: Date, language: string): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return language === "ar" ? "الآن" : "Just now";
  if (mins < 60) return language === "ar" ? `${mins} د` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return language === "ar" ? `${hrs} س` : `${hrs}h ago`;
}

function NotifItem({ n, language, onDismiss, onRead }: {
  n: Notification;
  language: string;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}) {
  const Icon = NOTIF_ICONS[n.type] ?? Bell;
  const color = NOTIF_COLORS[n.type] ?? "text-muted-foreground bg-muted";
  const sevDot = NOTIF_SEVERITY_DOT[n.severity ?? "info"] ?? "bg-blue-400";
  const title = n.title[language as "en" | "ar"] ?? n.title.en;
  const body = n.body[language as "en" | "ar"] ?? n.body.en;
  const isUnread = !n.readAt;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors group ${isUnread ? "bg-primary/5 border-s-2 border-primary" : ""}`}
      onClick={() => onRead(n.id)}
    >
      <div className="relative shrink-0 mt-0.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        {isUnread && (
          <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${sevDot}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">{body}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt, language)}</p>
      </div>
      <button
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mt-1"
        onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { t, language, setLanguage, isRtl } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const user = getUser();
  const { notifications, unreadCount, markAllRead, markRead, dismiss } = useNotifications();

  const allowedNav = getNavForRole(user?.role ?? "super_admin");
  const navItems = allowedNav === "all"
    ? ALL_NAV_ITEMS.filter(item => item.href !== "/my-patients")
    : ALL_NAV_ITEMS.filter(item => (allowedNav as string[]).includes(item.href));

  const activeItem = navItems.find(n => location.startsWith(n.href));
  const pageTitle = activeItem ? t(activeItem.labelKey) : t("nav.settings");

  useEffect(() => {
    const saved = localStorage.getItem("ehr_theme") as "light" | "dark";
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("ehr_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const handleNotifClick = (n: Notification) => {
    markRead(n.id);
    if (n.href) navigate(n.href);
  };

  const roleLabel = getRoleLabel(user?.role ?? "", language as "en" | "ar");
  const roleBadge = ROLE_BADGE_COLORS[user?.role ?? ""] ?? "bg-gray-100 text-gray-600";
  const displayName = isRtl && user?.nameAr ? user.nameAr : (user?.nameEn ?? user?.username ?? "User");
  const initials = displayName.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">

      {/* ── Sidebar ── */}
      <aside className="flex flex-col w-60 border-e bg-card flex-shrink-0 select-none">

        {/* Logo */}
        <div className="h-13 flex items-center gap-2.5 px-4 border-b">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
            <HeartPulse className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground leading-tight truncate">{t("app.shortTitle")}</p>
            <p className="text-[10px] text-muted-foreground leading-tight truncate">{t("app.subtitle")}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 mx-2 my-0.5 rounded-md text-sm transition-colors cursor-pointer
                  ${isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
                {isActive && (
                  <span className="ms-auto h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 mx-2 my-1.5 rounded-md text-sm transition-colors cursor-pointer
              ${location.startsWith("/settings")
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>{t("nav.settings")}</span>
          </Link>

          {/* User card */}
          <div className="mx-2 mb-2 p-3 rounded-lg bg-muted/40 border border-border/50">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user?.avatarUrl} alt={displayName} />
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{displayName}</p>
                <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 truncate max-w-full ${roleBadge}`}>
                  {roleLabel}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Logout"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-13 border-b bg-card flex items-center justify-between px-5 flex-shrink-0 select-none">
          {/* Page title */}
          <div className="flex items-center gap-2">
            {activeItem && <activeItem.icon className="h-4 w-4 text-muted-foreground shrink-0" />}
            <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
          </div>

          {/* Top-bar actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              title={language === "en" ? "Switch to Arabic" : "Switch to English"}
              className="h-8 w-8 text-muted-foreground"
            >
              <Languages className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {/* Notifications Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge
                      className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] font-bold bg-destructive text-destructive-foreground border-0 rounded-full flex items-center justify-center"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={6}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <DropdownMenuLabel className="p-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("notif.title")}
                    {unreadCount > 0 && (
                      <span className="ms-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </DropdownMenuLabel>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {t("notif.markAllRead")}
                    </button>
                  )}
                </div>

                {/* List */}
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {t("notif.empty")}
                  </div>
                ) : (
                  <ScrollArea className="max-h-80">
                    {notifications.map(n => (
                      <NotifItem
                        key={n.id}
                        n={n}
                        language={language}
                        onDismiss={dismiss}
                        onRead={() => handleNotifClick(n)}
                      />
                    ))}
                  </ScrollArea>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-5 bg-border mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 flex items-center gap-2 px-2 rounded-md">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.avatarUrl} />
                    <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium max-w-28 truncate">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{user?.username}</p>
                    <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit ${roleBadge}`}>
                      {roleLabel}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    <span>{t("nav.settings")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>{t("nav.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
