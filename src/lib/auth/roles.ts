import type { UserRole } from "@/lib/types/database";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  crc: "CRC",
  commercial: "Commercial",
};

export function isAdminOrAbove(role: UserRole | null | undefined): boolean {
  return role === "super_admin" || role === "admin";
}

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === "super_admin";
}

export type NavItem = {
  href: string;
  label: string;
  icon:
    | "layout-dashboard"
    | "building-2"
    | "users"
    | "map-pin"
    | "home"
    | "badge-dollar-sign"
    | "receipt"
    | "wallet"
    | "user-cog"
    | "bar-chart-3"
    | "settings"
    | "phone"
    | "clipboard-list"
    | "user-round";
};

export function getNavForRole(role: UserRole): NavItem[] {
  if (role === "crc") {
    return [
      { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
      { href: "/leads", label: "Leads", icon: "users" },
      { href: "/visites", label: "Visites", icon: "map-pin" },
      { href: "/projets", label: "Projet", icon: "building-2" },
      { href: "/biens", label: "Biens", icon: "home" },
    ];
  }

  if (role === "commercial") {
    return [
      { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
      { href: "/leads", label: "Leads", icon: "users" },
      { href: "/visites", label: "Visites", icon: "map-pin" },
      { href: "/projets", label: "Projet", icon: "building-2" },
      { href: "/biens", label: "Biens", icon: "home" },
      { href: "/ventes", label: "Mes ventes", icon: "badge-dollar-sign" },
    ];
  }

  // admin + super_admin
  return [
    { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { href: "/biens", label: "Biens", icon: "home" },
    { href: "/projets", label: "Projets", icon: "building-2" },
    { href: "/leads", label: "Leads", icon: "users" },
    { href: "/visites", label: "Visites", icon: "map-pin" },
    { href: "/ventes", label: "Ventes", icon: "badge-dollar-sign" },
    { href: "/depenses", label: "Dépenses", icon: "receipt" },
    { href: "/equipe", label: "Équipe", icon: "user-cog" },
    { href: "/rapports", label: "Rapports", icon: "bar-chart-3" },
    { href: "/parametres", label: "Paramètres", icon: "settings" },
  ];
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const allowed = getNavForRole(role).map((item) => item.href);
  if (pathname.startsWith("/leads/")) {
    return allowed.includes("/leads") || allowed.includes("/prospects");
  }
  if (pathname.startsWith("/projets/")) {
    return allowed.includes("/projets") || isAdminOrAbove(role);
  }
  if (pathname === "/visiteurs") return allowed.includes("/visites") || allowed.includes("/visiteurs");
  if (pathname === "/prospects") return allowed.includes("/leads") || allowed.includes("/prospects");
  if (pathname === "/finance") return false;
  return allowed.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}
