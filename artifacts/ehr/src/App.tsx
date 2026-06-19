import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { AppLayout } from "@/components/layout/AppLayout";
import { getToken, getUser } from "@/lib/auth";
import { getNavForRole } from "@/lib/permissions";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import NewPatient from "@/pages/new-patient";
import PatientDetails from "@/pages/patient-details";
import PatientPrint from "@/pages/patient-print";
import Appointments from "@/pages/appointments";
import ClinicalNotes from "@/pages/clinical-notes";
import Prescriptions from "@/pages/prescriptions";
import Lab from "@/pages/lab";
import Radiology from "@/pages/radiology";
import Pharmacy from "@/pages/pharmacy";
import Billing from "@/pages/billing";
import Staff from "@/pages/staff";
import Vaccinations from "@/pages/vaccinations";
import Growth from "@/pages/growth";
import Settings from "@/pages/settings";
import Units from "@/pages/units";
import MyPatients from "@/pages/my-patients";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({
  component: Component,
  requiredPath,
  params,
}: {
  component: React.ComponentType<any>;
  requiredPath?: string;
  params?: Record<string, string | undefined>;
}) {
  const [location, setLocation] = useLocation();
  const token = getToken();
  const user = getUser();

  useEffect(() => {
    if (!token) {
      setLocation("/login");
      return;
    }
    if (user && requiredPath) {
      const nav = getNavForRole(user.role);
      if (nav !== "all") {
        const allowed = (nav as string[]).some(p => requiredPath.startsWith(p))
            || (requiredPath === "/patients" && (nav as string[]).includes("/my-patients"));
        if (!allowed) {
          setLocation((nav as string[])[0] ?? "/dashboard");
        }
      }
    }
  }, [token, location, setLocation, user, requiredPath]);

  if (!token) return null;

  return (
    <AppLayout>
      <Component params={params} />
    </AppLayout>
  );
}

function RootRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/dashboard");
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />

      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>

      <Route path="/patients/new">
        {() => <ProtectedRoute component={NewPatient} requiredPath="/patients" />}
      </Route>

      <Route path="/patients/:id/print">
        {params => <PatientPrint params={params} />}
      </Route>

      <Route path="/patients/:id">
        {params => <ProtectedRoute component={PatientDetails} requiredPath="/patients" params={params} />}
      </Route>

      <Route path="/patients">
        {() => <ProtectedRoute component={Patients} requiredPath="/patients" />}
      </Route>

      <Route path="/appointments">
        {() => <ProtectedRoute component={Appointments} requiredPath="/appointments" />}
      </Route>

      <Route path="/clinical-notes">
        {() => <ProtectedRoute component={ClinicalNotes} requiredPath="/clinical-notes" />}
      </Route>

      <Route path="/prescriptions">
        {() => <ProtectedRoute component={Prescriptions} requiredPath="/prescriptions" />}
      </Route>

      <Route path="/lab">
        {() => <ProtectedRoute component={Lab} requiredPath="/lab" />}
      </Route>

      <Route path="/radiology">
        {() => <ProtectedRoute component={Radiology} requiredPath="/radiology" />}
      </Route>

      <Route path="/pharmacy">
        {() => <ProtectedRoute component={Pharmacy} requiredPath="/pharmacy" />}
      </Route>

      <Route path="/billing">
        {() => <ProtectedRoute component={Billing} requiredPath="/billing" />}
      </Route>

      <Route path="/staff">
        {() => <ProtectedRoute component={Staff} requiredPath="/staff" />}
      </Route>

      <Route path="/vaccinations">
        {() => <ProtectedRoute component={Vaccinations} requiredPath="/vaccinations" />}
      </Route>

      <Route path="/growth">
        {() => <ProtectedRoute component={Growth} requiredPath="/growth" />}
      </Route>

      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>

      <Route path="/units">
        {() => <ProtectedRoute component={Units} requiredPath="/units" />}
      </Route>

      <Route path="/my-patients">
        {() => <ProtectedRoute component={MyPatients} requiredPath="/my-patients" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
