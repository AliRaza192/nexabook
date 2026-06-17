"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale, t } = useT();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLocale("en")}
          className={locale === "en" ? "bg-nexabook-100 font-semibold" : ""}
        >
          {t("language.en", "English")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale("ur")}
          className={locale === "ur" ? "bg-nexabook-100 font-semibold" : ""}
        >
          {t("language.ur", "اردو")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
