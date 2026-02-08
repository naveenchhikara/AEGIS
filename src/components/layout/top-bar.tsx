"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Globe, LogOut, Settings } from "@/lib/icons";
import { LANGUAGES } from "@/lib/constants";
import { currentUser } from "@/lib/current-user";
import { bankProfile } from "@/data";
import type { BankProfile } from "@/types";
import Link from "next/link";
import { navItems } from "@/lib/nav-items";

const bank = bankProfile as unknown as BankProfile;

function switchLocale(newLocale: string) {
  document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
  window.location.reload();
}

export function TopBar() {
  const locale = useLocale();
  const t = useTranslations("TopBar");
  const tNav = useTranslations("Navigation");
  const currentLang = LANGUAGES.find((l) => l.code === locale)!;
  const pathname = usePathname();

  // Derive page name from pathname using navItems
  const currentNav = navItems.find((item) => pathname.startsWith(item.href));
  const currentPage = currentNav ? tNav(currentNav.tKey) : undefined;

  return (
    <header className="bg-background flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Bank name + breadcrumb - hidden on mobile to save space */}
      <div className="hidden items-center gap-2 md:flex">
        <h2 className="text-foreground text-base font-bold tracking-tight">
          {bank.name}
        </h2>
        {currentPage && (
          <>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground text-sm">{currentPage}</span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 gap-1.5 px-3 text-xs md:h-8 md:px-2"
              aria-label={t("changeLanguage")}
            >
              <Globe className="h-4 w-4" />
              {currentLang.short}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => switchLocale(lang.code)}
                className={locale === lang.code ? "bg-accent" : ""}
              >
                <span className="mr-2 font-medium">{lang.short}</span>
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 md:h-8 md:w-8"
          aria-label={t("notifications", { count: 3 })}
        >
          <Bell className="h-4 w-4" />
          <span
            className="bg-destructive absolute top-1.5 right-1.5 h-2 w-2 rounded-full md:top-1 md:right-1"
            aria-hidden="true"
          />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 md:h-8 md:w-8"
              aria-label={t("userMenu")}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                  {currentUser.initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{currentUser.name}</p>
              <p className="text-muted-foreground text-xs">
                {currentUser.role}
              </p>
            </div>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                {tNav("settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/login">
                <LogOut className="mr-2 h-4 w-4" />
                {t("signOut")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
