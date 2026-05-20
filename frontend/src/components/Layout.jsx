import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useTheme } from "../lib/useTheme";
import { Sun, Moon, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { to: "/orders", label: "Órdenes" },
  { to: "/clients", label: "Clientes" },
  { to: "/equipment", label: "Equipos" },
  { to: "/dashboard", label: "Dashboard", roles: ["TECNICO", "JEFE_TALLER"] },
  { to: "/users", label: "Usuarios", roles: ["JEFE_TALLER"] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role),
  );

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-dvh bg-background w-full max-w-7xl mx-auto">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 lg:px-10">
          <div className="flex items-center justify-between h-14">
            {/* Brand */}
            <span className="font-bold text-foreground text-base tracking-tight shrink-0">
              Servicios Técnicos Tesla
            </span>

            {/* Desktop nav */}
            <nav className="hidden md:flex gap-1">
              {visibleItems.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-sm text-muted-foreground">
                {user?.first_name || user?.username}
              </span>
              <button
                onClick={toggle}
                aria-label="Cambiar tema"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleLogout}
                className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Salir
              </button>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
                className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
              >
                {menuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 pt-2 pb-4 space-y-1">
            {visibleItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {user?.first_name || user?.username}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Salir
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="px-6 lg:px-10 py-8">{children}</main>
    </div>
  );
}
