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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, allowedPaths, ...rest }: { component: React.ComponentType<any>, allowedPaths?: string[], [key: string]: any }) {
  const [location, setLocation] = useLocation();
  const token = getToken();
  const user = getUser();

  useEffect(() => {
    if (!token) {
      setLocation("/login");
      return;
    }
    if (user && allowedPaths) {
      const nav = getNavForRole(user.role);
      if (nav !== "all") {
        const allowed = (nav as string[]).some(p => location.startsWith(p));
        if (!allowed) {
          setLocation(nav[0] ?? "/dashboard");
        }
      }
    }
  }, [token, location, setLocation, user, allowedPaths]);

  if (!token) return null;

  return (
    <AppLayout>
      <Component {...rest} />
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
        {() => <ProtectedRoute component={NewPatient} allowedPaths={["/patients"]} />}
      </Route>

      <Route path="/patients/:id/print">
        {params => <PatientPrint params={params} />}
      </Route>

      <Route path="/patients/:id">
        {params => <ProtectedRoute component={PatientDetails} params={params} allowedPaths={["/patients"]} />}
      </Route>

      <Route path="/patients">
        {() => <ProtectedRoute component={Patients} allowedPaths={["/patients"]} />}
      </Route>

      <Route path="/appointments">
        {() => <ProtectedRoute component={Appointments} />}
      </Route>

      <Route path="/clinical-notes">
        {() => <ProtectedRoute component={ClinicalNotes} />}
      </Route>

      <Route path="/prescriptions">
        {() => <ProtectedRoute component={Prescriptions} />}
      </Route>

      <Route path="/lab">
        {() => <ProtectedRoute component={Lab} />}
      </Route>

      <Route path="/radiology">
        {() => <ProtectedRoute component={Radiology} />}
      </Route>

      <Route path="/pharmacy">
        {() => <ProtectedRoute component={Pharmacy} />}
      </Route>

      <Route path="/billing">
        {() => <ProtectedRoute component={Billing} />}
      </Route>

      <Route path="/staff">
        {() => <ProtectedRoute component={Staff} />}
      </Route>

      <Route path="/vaccinations">
        {() => <ProtectedRoute component={Vaccinations} />}
      </Route>

      <Route path="/growth">
        {() => <ProtectedRoute component={Growth} />}
      </Route>

      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
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
