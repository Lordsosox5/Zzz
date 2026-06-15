import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { setToken, setUser } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartPulse, Loader2, AlertCircle, ChevronDown, ChevronUp, MousePointerClick } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DEMO_ACCOUNTS = [
  {
    username: "admin",
    password: "admin123",
    role: "System Administrator",
    roleAr: "مدير النظام",
    name: "System Administrator",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    dot: "bg-purple-500",
  },
  {
    username: "dr.sarah",
    password: "password123",
    role: "Consultant Physician",
    roleAr: "طبيب استشاري",
    name: "Dr. Sarah Al-Amer",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
  },
  {
    username: "dr.ali",
    password: "password123",
    role: "Medical Specialist",
    roleAr: "أخصائي طبي",
    name: "Dr. Ali Hassan",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
    dot: "bg-cyan-500",
  },
  {
    username: "nurse.hana",
    password: "password123",
    role: "Nursing Staff",
    roleAr: "الكوادر التمريضية",
    name: "Hana Al-Rashid",
    badge: "bg-green-100 text-green-800 border-green-200",
    dot: "bg-green-500",
  },
  {
    username: "pharm.omar",
    password: "password123",
    role: "Pharmacist",
    roleAr: "صيدلاني",
    name: "Omar Al-Zahrani",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    dot: "bg-orange-500",
  },
  {
    username: "lab.specialist",
    password: "password123",
    role: "Lab Specialist",
    roleAr: "أخصائي مختبر",
    name: "Sara Al-Mutairi",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
    dot: "bg-yellow-500",
  },
  {
    username: "lab.tech",
    password: "password123",
    role: "Lab Technician",
    roleAr: "فني مختبر",
    name: "Khalid Al-Dossari",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
];

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [, setLocation] = useLocation();
  const { t, lang } = useTranslation();

  const loginMutation = useLogin();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username || !password) {
      setErrorMsg("Please enter username and password");
      return;
    }

    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          setToken(data.token);
          setUser(data.user);
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          console.error("Login failed:", err);
          setErrorMsg(t("login.error"));
        },
      }
    );
  };

  const fillCredentials = (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setUsername(account.username);
    setPassword(account.password);
    setErrorMsg("");
    setShowDemo(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary p-3 rounded-full mb-4">
            <HeartPulse className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-center text-primary">{t("app.title")}</h1>
          <p className="text-muted-foreground">{t("app.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("login.title")}</CardTitle>
            <CardDescription>{t("login.subtitle")}</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {errorMsg && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">{t("login.username")}</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("login.button")}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Accounts Panel */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDemo((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-dashed border-muted-foreground/40 bg-background/60 hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              Demo accounts — click any role to sign in
            </span>
            {showDemo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showDemo && (
            <div className="mt-2 rounded-lg border bg-background shadow-sm overflow-hidden">
              {DEMO_ACCOUNTS.map((account, i) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => fillCredentials(account)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors ${
                    i !== 0 ? "border-t" : ""
                  }`}
                >
                  <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${account.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{account.name}</span>
                      <span className={`hidden sm:inline-flex text-[11px] px-1.5 py-0.5 rounded border font-medium ${account.badge}`}>
                        {lang === "ar" ? account.roleAr : account.role}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {account.username} / {account.password}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground/60 hidden sm:block">click to fill</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
