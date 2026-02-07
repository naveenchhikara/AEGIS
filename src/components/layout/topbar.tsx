"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Languages,
  LogOut,
  Settings as SettingsIcon,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { LANGUAGES } from "@/lib/constants";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  const [currentLang, setCurrentLang] = useState("en");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4">
      {/* Sidebar toggle - visible on all screen sizes */}
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />

      {/* Bank context */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="font-medium text-foreground">Apex Sahakari Bank Ltd</span>
        <span className="text-muted-foreground hidden sm:inline">— Pune</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5">
              <Languages className="h-4 w-4" />
              <span className="text-xs font-medium">
                {LANGUAGES[currentLang as keyof typeof LANGUAGES]?.label}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Select Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={currentLang} onValueChange={setCurrentLang}>
              {Object.values(LANGUAGES).map((lang) => (
                <DropdownMenuRadioItem key={lang.code} value={lang.code}>
                  {lang.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
              </span>
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">CRAR report due in 3 days</span>
              <span className="text-xs text-muted-foreground">Capital adequacy submission deadline approaching</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">2 audit findings pending review</span>
              <span className="text-xs text-muted-foreground">High priority items need attention</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="cursor-pointer text-center text-sm text-primary">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                RP
              </div>
              <span className="hidden md:inline text-sm">Rajesh Patil</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Rajesh Patil</p>
                <p className="text-xs text-muted-foreground">Chief Audit Executive</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/login" className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default TopBar;
