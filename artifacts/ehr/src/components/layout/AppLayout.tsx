import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { logout, getUser } from "@/lib/auth";
import { getNavForRole, getRoleLabel } from "@/lib/permissions";
import { 
  LayoutDashboard, Users, Calendar, FileText, Pill, 
  FlaskConical, Activity, HeartPulse, Receipt, UserRound, 
  ShieldAlert, Settings, LogOut, Bell, Menu, Moon, Sun, Languages, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const ALL_NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { href: "/patients", icon: Users, labelKey: "nav.patients" },
  { href: "/appointments", icon: Calendar, labelKey: "nav.appointments" },
  { href: "/clinical-notes", icon: FileText, labelKey: "nav.notes" },
  { href: "/prescriptions", icon: Pill, labelKey: "nav.prescriptions" },
  { href: "/lab", icon: FlaskConical, labelKey: "nav.lab" },
  { href: "/radiology", icon: Activity, labelKey: "nav.radiology" },
  { href: "/pharmacy", icon: HeartPulse, labelKey: "nav.pharmacy" },
  { href: "/billing", icon: Receipt, labelKey: "nav.billing" },
  { href: "/staff", icon: UserRound, labelKey: "nav.staff" },
  { href: "/vaccinations", icon: ShieldAlert, labelKey: "nav.vaccinations" },
  { href: "/growth", icon: TrendingUp, labelKey: "nav.growth" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t, language, setLanguage, isRtl } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const user = getUser();

  // Filter nav items by role
  const allowedNav = getNavForRole(user?.role ?? "admin");
  const navItems = allowedNav === "all"
    ? ALL_NAV_ITEMS
    : ALL_NAV_ITEMS.filter(item => (allowedNav as string[]).includes(item.href));

  useEffect(() => {
    const savedTheme = localStorage.getItem("ehr_theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("ehr_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  const roleLabel = getRoleLabel(user?.role ?? "", language as "en" | "ar");

  const NavLinks = () => (
    <div className="flex flex-col gap-1 w-full py-4">
      {navItems.map((item) => {
        const isActive = location.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-5 py-3 mx-2 rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
            <Icon className="h-5 w-5" />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-e bg-card flex-shrink-0 z-10 sticky top-0 h-screen">
        <div className="h-16 flex items-center px-4 border-b">
          <div className="font-bold text-lg text-primary flex items-center gap-2">
            <HeartPulse className="h-6 w-6" />
            <span className="truncate">{t("app.title")}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="p-4 border-t">
          <Link href="/settings" className="flex items-center gap-3 px-5 py-3 text-muted-foreground hover:bg-muted/50 rounded-md transition-colors">
            <Settings className="h-5 w-5" />
            <span>{t("nav.settings")}</span>
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isRtl ? "right" : "left"} className="p-0 w-64">
                <div className="h-16 flex items-center px-4 border-b">
                  <div className="font-bold text-lg text-primary flex items-center gap-2">
                    <HeartPulse className="h-6 w-6" />
                    <span className="truncate">{t("app.title")}</span>
                  </div>
                </div>
                <div className="overflow-y-auto h-[calc(100vh-4rem)]">
                  <NavLinks />
                  <div className="p-4 border-t mt-auto">
                    <Link href="/settings" className="flex items-center gap-3 px-5 py-3 text-muted-foreground hover:bg-muted/50 rounded-md transition-colors">
                      <Settings className="h-5 w-5" />
                      <span>{t("nav.settings")}</span>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <h1 className="md:hidden font-bold text-primary truncate">
              {t("app.title")}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleLanguage} title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}>
              <Languages className="h-5 w-5" />
              <span className="sr-only">Toggle language</span>
            </Button>
            
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatarUrl} alt={user?.nameEn || "User"} />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{isRtl && user?.nameAr ? user.nameAr : (user?.nameEn || "User")}</p>
                    <p className="text-xs leading-none text-muted-foreground">{roleLabel}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("nav.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
