import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { logout, getUser } from "@/lib/auth";
import { getNavForRole, getRoleLabel } from "@/lib/permissions";
import {
  LayoutDashboard, Users, Users2, Calendar, FileText, Pill,
  FlaskConical, Activity, HeartPulse, Receipt, UserRound,
  ShieldAlert, Settings, LogOut, Bell, Moon, Sun, Languages, TrendingUp, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t, language, setLanguage, isRtl } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const user = getUser();

  const allowedNav = getNavForRole(user?.role ?? "super_admin");
  const navItems = allowedNav === "all"
    ? ALL_NAV_ITEMS
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

  const roleLabel = getRoleLabel(user?.role ?? "", language as "en" | "ar");
  const roleBadge = ROLE_BADGE_COLORS[user?.role ?? ""] ?? "bg-gray-100 text-gray-600";
  const displayName = isRtl && user?.nameAr ? user.nameAr : (user?.nameEn ?? user?.username ?? "User");
  const initials = displayName.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground select-none">

      {/* ── Sidebar ── */}
      <aside className="flex flex-col w-60 border-e bg-card flex-shrink-0">

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
        <header className="h-13 border-b bg-card flex items-center justify-between px-5 flex-shrink-0">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Notifications
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="py-6 text-center text-sm text-muted-foreground">No new notifications</div>
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
                    <span>Settings</span>
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
        <main className="flex-1 overflow-y-auto p-6 select-text">
          {children}
        </main>
      </div>
    </div>
  );
}
