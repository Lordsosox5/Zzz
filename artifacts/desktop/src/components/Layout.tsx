import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, LogOut, Hospital } from "lucide-react";
import { useAuth } from "../App";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/appointments", icon: Calendar, label: "Appointments" },
];

function roleBadge(role: string) {
  const map: Record<string, string> = {
    consultant: "bg-purple-100 text-purple-700",
    specialist: "bg-blue-100 text-blue-700",
    registrar: "bg-indigo-100 text-indigo-700",
    house_officer: "bg-orange-100 text-orange-700",
    medical_officer: "bg-teal-100 text-teal-700",
    nurse: "bg-pink-100 text-pink-700",
    admin: "bg-gray-100 text-gray-700",
    pharmacist: "bg-green-100 text-green-700",
    lab_specialist: "bg-yellow-100 text-yellow-700",
    data_analyser: "bg-cyan-100 text-cyan-700",
  };
  return map[role] ?? "bg-gray-100 text-gray-700";
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 rounded-lg p-1.5">
              <Hospital className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">Almuzini</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Children Hospital</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="px-3 py-4 border-t border-gray-100">
            <div className="px-3 py-2 mb-2">
              <p className="text-xs font-semibold text-gray-900 truncate">{user.nameEn}</p>
              <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${roleBadge(user.role)}`}>
                {user.role.replace(/_/g, " ")}
              </span>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
