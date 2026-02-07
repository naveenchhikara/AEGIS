"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { navItems } from "@/lib/nav-items";
import { currentUser } from "@/lib/current-user";
import { ChevronsUpDown, LogOut } from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function SidebarLogo() {
  const { state } = useSidebar();
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1">
      {state === "expanded" ? (
        <Image
          src="/logos/aegis-logo.png"
          alt="AEGIS"
          width={140}
          height={40}
          className="h-8 w-auto brightness-0 invert"
          priority
        />
      ) : (
        <Image
          src="/logos/aegis-mark.png"
          alt="AEGIS"
          width={28}
          height={28}
          className="h-7 w-7 brightness-0 invert"
          priority
        />
      )}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <SidebarLogo />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href + "/"));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-sidebar-primary text-xs text-sidebar-primary-foreground">
                      {currentUser.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {currentUser.name}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {currentUser.role}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {currentUser.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid text-sm leading-tight">
                    <span className="font-semibold">{currentUser.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {currentUser.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
