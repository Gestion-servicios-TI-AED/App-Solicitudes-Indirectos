"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Plus,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  UserCircle,
} from "lucide-react";
import { NotificacionesBell } from "@/components/layout/NotificacionesBell";
import { ROL_LABELS } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Roles that can see this item. Undefined = everyone. */
  roles?: string[];
}

// ─── Nav items definition ─────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",        href: "/dashboard",                  icon: LayoutDashboard },
  { label: "Nueva Solicitud",  href: "/solicitudes/nueva", icon: Plus },
  { label: "Solicitudes",      href: "/solicitudes",       icon: FileText },
  { label: "Terceros",         href: "/terceros",          icon: Users },
  {
    label: "Configuración",
    href: "/configuracion",
    icon: Settings,
    roles: ["ADMIN", "DIRECTOR_CONTROLES"],
  },
  { label: "Mi Perfil",        href: "/perfil",            icon: UserCircle },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ─── Sidebar nav link ─────────────────────────────────────────────────────────

function NavLink({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`
        flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
        transition-colors duration-150 group
        ${active
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }
        ${collapsed ? "justify-center" : ""}
      `}
    >
      <Icon
        size={18}
        className={`shrink-0 ${active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`}
      />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  collapsed,
  userRoles,
  pathname,
  onClose,
}: {
  collapsed: boolean;
  userRoles: string[];
  pathname: string;
  onClose?: () => void;
}) {
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => userRoles.includes(r))
  );

  return (
    <aside
      className={`
        flex flex-col h-full bg-white border-r border-gray-200
        transition-all duration-200 ease-in-out
        ${collapsed ? "w-16" : "w-60"}
      `}
    >
      {/* Logo / Brand */}
      <div
        className={`flex items-center gap-3 px-4 h-16 border-b border-gray-100 shrink-0 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">BK</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
              Baia Kristal
            </p>
            <p className="text-xs text-gray-400 truncate">Indirectos</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          // Mark Dashboard active only at exact "/"
          const active =
            item.href === "/dashboard"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <NavLink
              key={item.href}
              item={item}
              active={active}
              collapsed={collapsed}
              onClick={onClose}
            />
          );
        })}
      </nav>
    </aside>
  );
}

// ─── AppLayout ────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userRoles: string[] = (session?.user?.roles ?? (session?.user?.rol ? [session.user.rol] : [])) as string[];
  const userRole = userRoles[0] ?? "";
  const userName = session?.user?.name;
  const userEmail = session?.user?.email;

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          userRoles={userRoles}
          pathname={pathname}
        />
      </div>

      {/* ── Mobile drawer ────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-40 lg:hidden">
            <Sidebar
              collapsed={false}
              userRoles={userRoles}
              pathname={pathname}
              onClose={() => setMobileSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top header */}
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shrink-0 gap-4">
          {/* Left: toggle buttons */}
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>

            {/* Desktop collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden lg:flex p-2 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label={sidebarCollapsed ? "Expandir barra" : "Colapsar barra"}
            >
              {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
          </div>

          {/* Right: notifications + user */}
          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <NotificacionesBell />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
                aria-label="Menú de usuario"
                aria-expanded={userMenuOpen}
              >
                {/* Avatar */}
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white select-none">
                  {getInitials(userName)}
                </span>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 leading-tight max-w-[120px] truncate">
                    {userName ?? "Usuario"}
                  </p>
                  <p className="text-xs text-gray-400 leading-tight max-w-[140px] truncate">
                    {userRoles.map((r) => ROL_LABELS[r] ?? r).join(" · ")}
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-1 z-20 w-56 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {userName ?? "Usuario"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                    </div>
                    <Link
                      href="/perfil"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserCircle size={15} />
                      Mi Perfil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} />
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
