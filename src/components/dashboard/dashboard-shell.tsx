"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CreditCard, Home, Menu, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Overview", icon: Home },
  { href: "/app/chatbots", label: "Chatbots", icon: Bot },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

type DashboardShellProps = {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  workspaceName: string;
};

function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {navItems.map((item) => {
        const active =
          item.href === "/app"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
              active && "bg-primary/10 text-primary"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  children,
  userName,
  userEmail,
  workspaceName,
}: DashboardShellProps) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card px-4 py-5 lg:block">
        <Link href="/app" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            A
          </span>
          AskFlow
        </Link>
        <Separator className="my-5" />
        <DashboardNav />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" />}>
                <Menu className="size-4" />
                <span className="sr-only">Open navigation</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <SheetHeader>
                  <SheetTitle>AskFlow</SheetTitle>
                </SheetHeader>
                <div className="mt-5">
                  <DashboardNav />
                </div>
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-sm font-medium">{workspaceName}</p>
              <p className="text-xs text-muted-foreground">Free plan</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <Avatar className="size-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <LogoutButton />
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
