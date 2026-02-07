"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Globe,
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
import { LANGUAGES, APP_NAME } from "@/lib/constants";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  const [currentLang, setCurrentLang] = useState("en");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Left: Hamburger menu (mobile) + Logo */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold">
            A
          </div>
          <span className="text-lg font-semibold hidden sm:inline-block">
            {APP_NAME}
          </span>
        </Link>
      </div>

      {/* Spacer to push right items */}
      <div className="flex-1" />

      {/* Right: Language switcher, Notifications, User profile */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Languages className="h-4 w-4" />
              <span className="hidden md:inline">
                {LANGUAGES[currentLang as keyof typeof LANGUAGES]?.code.toUpperCase()}
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Select Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={currentLang} onValueChange={setCurrentLang}>
              {Object.values(LANGUAGES).map((lang) => (
                <DropdownMenuRadioItem key={lang.code} value={lang.code}>
                  <span className="mr-2">{lang.flag}</span>
                  {lang.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2 text-sm text-muted-foreground text-center">
              3 new notifications
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="cursor-pointer">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
