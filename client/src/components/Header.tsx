import { memo, useEffect, useRef, useState } from "react";
import { ChevronDown, Globe, Loader2, LogOut, Menu, MessageSquareText, User, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useOptimizedScroll } from "@/hooks/use-optimized-scroll";
import { useTranslation, type Locale } from "@/contexts/LanguageContext";
import { useBrand } from "@/contexts/BrandContext";
import { cn } from "@/lib/utils";
import { sellerConfig } from "@/lib/sellerConfig";
import { buildFeedbackMailto } from "@/lib/feedbackMailto";

const FLAG_LABELS: Record<Locale, { flag: string; label: string }> = {
  it: { flag: "🇮🇹", label: "Italiano" },
  en: { flag: "🇬🇧", label: "English" },
  es: { flag: "🇪🇸", label: "Español" },
};

const Header = memo(function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { brand, clearBrand } = useBrand();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const { t, locale, setLocale } = useTranslation();
  const { isScrolled } = useOptimizedScroll({ throttleMs: 50 });
  const isBride = brand === "byebride";
  const splitPath = isBride ? "/splitta-bride" : "/splitta-bro";
  const destinationsActive = location === "/destinations" || location.startsWith("/destinations/");
  const experiencesActive = location.startsWith("/experiences");
  const feedbackHref = sellerConfig.contactEmail
    ? buildFeedbackMailto({
        email: sellerConfig.contactEmail,
        subject: t("feedback.subject"),
        message: t("feedback.message"),
        brand: isBride ? "byebride" : "byebro",
        locale,
        pathname: window.location.pathname,
      })
    : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        mobileMenuOpen
        && menuRef.current
        && !menuRef.current.contains(target)
        && !menuTriggerRef.current?.contains(target)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, { passive: true });
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  const handleChangeBrand = () => {
    clearBrand();
    window.location.href = "/";
  };

  const primaryLinkClass = (active: boolean) => cn(
    "rounded-sm px-1 py-2 text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    active && "text-primary",
  );

  return (
    <header className={cn(
      "sticky top-0 z-[60] border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90",
      isScrolled && "shadow-soft",
    )}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2 focus:text-foreground focus:shadow-raised focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t("header.skipToContent")}
      </a>

      <div className="page-container flex h-16 items-center gap-4">
        <Link href="/" className="shrink-0 font-display text-2xl font-bold tracking-tight text-foreground" aria-label={isBride ? "ByeBride" : "ByeBro"}>
          Bye<span className="text-primary">{isBride ? "Bride" : "Bro"}</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-5 lg:flex" aria-label={t("header.primaryNavigation")}>
          <Link href="/destinations" className={primaryLinkClass(destinationsActive)} aria-current={destinationsActive ? "page" : undefined}>
            {t("header.destinations")}
          </Link>
          <Link href="/experiences" className={primaryLinkClass(experiencesActive)} aria-current={experiencesActive ? "page" : undefined}>
            {t("header.experiences")}
          </Link>
          {user && (
            <Link href="/dashboard" className={primaryLinkClass(location === "/dashboard" || location.startsWith("/trips/"))}>
              {t("header.myTrips")}
            </Link>
          )}

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="quiet" size="sm" className="gap-1">
                {t("header.more")} <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-52">
              <DropdownMenuItem asChild><Link href={splitPath}>{isBride ? "SplittaBride" : "SplittaBro"}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/secret-blog">{t("header.secretBlog")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/merchandise">{t("header.merch")}</Link></DropdownMenuItem>
              {feedbackHref && (
                <DropdownMenuItem asChild>
                  <a href={feedbackHref}>
                    <MessageSquareText />
                    {t("feedback.send")}
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleChangeBrand}>{t("brand.changeBrand")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="quiet" size="icon" className="hidden sm:inline-flex" aria-label={`${t("header.language")}: ${FLAG_LABELS[locale].label}`}>
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              {Object.entries(FLAG_LABELS).map(([key, value]) => (
                <DropdownMenuItem key={key} onSelect={() => setLocale(key as Locale)} className={cn(locale === key && "bg-surface-muted font-semibold")}>
                  <span>{value.flag}</span>{value.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="quiet" size="icon" aria-label={t("header.account")}>
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-52">
                <DropdownMenuLabel className="truncate">{user.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/dashboard")}>{t("header.myTrips")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                  {logoutMutation.isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
                  {logoutMutation.isPending ? t("header.loggingOut") : t("header.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="quiet" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/auth?tab=login")}>
              {t("header.login")}
            </Button>
          )}

          <Button asChild size="sm">
            <Link href="/">{t("header.planTrip")}</Link>
          </Button>

          <Button
            ref={menuTriggerRef}
            variant="quiet"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? t("header.closeMenu") : t("header.openMenu")}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div id="mobile-navigation" ref={menuRef} className="border-t border-border bg-surface lg:hidden">
          <nav className="page-container flex flex-col gap-1 py-4" aria-label={t("header.mobileNavigation")}>
            <Button asChild className="mb-3 w-full"><Link href="/" onClick={() => setMobileMenuOpen(false)}>{t("header.planTrip")}</Link></Button>
            <Link href="/destinations" onClick={() => setMobileMenuOpen(false)} className={primaryLinkClass(destinationsActive)} aria-current={destinationsActive ? "page" : undefined}>{t("header.destinations")}</Link>
            <Link href="/experiences" onClick={() => setMobileMenuOpen(false)} className={primaryLinkClass(experiencesActive)} aria-current={experiencesActive ? "page" : undefined}>{t("header.experiences")}</Link>
            {user && <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className={primaryLinkClass(location === "/dashboard")}>{t("header.myTrips")}</Link>}
            <div className="my-2 h-px bg-border" />
            <Link href={splitPath} onClick={() => setMobileMenuOpen(false)} className="rounded-sm px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">{isBride ? "SplittaBride" : "SplittaBro"}</Link>
            <Link href="/secret-blog" onClick={() => setMobileMenuOpen(false)} className="rounded-sm px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">{t("header.secretBlog")}</Link>
            <Link href="/merchandise" onClick={() => setMobileMenuOpen(false)} className="rounded-sm px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">{t("header.merch")}</Link>
            {feedbackHref && (
              <a
                href={feedbackHref}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-sm px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t("feedback.send")}
              </a>
            )}
            <button type="button" onClick={handleChangeBrand} className="rounded-sm px-1 py-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground">{t("brand.changeBrand")}</button>
            <div className="mt-2 flex items-center gap-2 border-t border-border pt-3 sm:hidden" aria-label={t("header.language")}>
              {(Object.entries(FLAG_LABELS) as [Locale, { flag: string; label: string }][]).map(([key, value]) => (
                <Button key={key} variant={locale === key ? "secondary" : "quiet"} size="sm" onClick={() => setLocale(key)} aria-label={value.label}>
                  {value.flag}
                </Button>
              ))}
            </div>
            {!user && <Button variant="outline" className="mt-2 w-full" onClick={() => navigate("/auth?tab=login")}>{t("header.login")}</Button>}
          </nav>
        </div>
      )}
    </header>
  );
});

export default Header;
