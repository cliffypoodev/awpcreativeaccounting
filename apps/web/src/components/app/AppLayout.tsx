import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  FileCheck2,
  Users,
  Receipt,
  Settings,
  Menu,
  Plus,
  FolderOpen,
  Tag,
  RefreshCw,
  TrendingUp,
  Package,
  Inbox,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMe } from "@/lib/queries";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/invoices", label: "Invoices", icon: FileText, end: false },
  { to: "/app/estimates", label: "Estimates", icon: FileCheck2, end: false },
  { to: "/app/clients", label: "Clients", icon: Users, end: false },
  { to: "/app/projects", label: "Projects", icon: FolderOpen, end: false },
  { to: "/app/deliverables", label: "Deliverables", icon: Package, end: false },
  { to: "/app/receipts", label: "Receipt inbox", icon: Inbox, end: false },
  { to: "/app/profitability", label: "Profitability", icon: TrendingUp, end: false },
  { to: "/app/recurring", label: "Recurring", icon: RefreshCw, end: false },
  { to: "/app/tags", label: "Tags", icon: Tag, end: false },
  { to: "/app/expenses", label: "Expenses", icon: Receipt, end: false },
  { to: "/app/settings", label: "Settings", icon: Settings, end: false },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: me } = useMe();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 pb-6 pt-6">
        <Link to="/app" onClick={onNavigate} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary font-display text-lg font-bold text-sidebar-primary-foreground">
            A
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">AWP Creative</span>
        </Link>
      </div>

      <div className="px-3">
        <Button
          asChild
          className="w-full justify-start gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
        >
          <Link to="/app/invoices/new" onClick={onNavigate}>
            <Plus className="h-4 w-4" /> New invoice
          </Link>
        </Button>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="px-2 py-1">
          <p className="truncate text-sm font-medium">{me?.user.name ?? "—"}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">Private single-user workspace</p>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/app" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary font-display text-base font-bold text-primary-foreground">
            A
          </span>
          <span className="font-display text-base font-semibold">AWP Creative</span>
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-sidebar-border p-0">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
