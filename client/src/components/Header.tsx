import { useState, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Menu, X, User, LogOut, Loader2, ArrowLeft, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOptimizedScroll } from "@/hooks/use-optimized-scroll";
import { throttle } from "@/lib/performance";
import { useTranslation, type Locale } from "@/contexts/LanguageContext";

const FLAG_LABELS: Record<Locale, { flag: string; label: string }> = {
  it: { flag: '🇮🇹', label: 'Italiano' },
  en: { flag: '🇬🇧', label: 'English' },
  es: { flag: '🇪🇸', label: 'Español' },
};

// Utilizziamo React.memo per evitare re-render inutili
const Header = memo(function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<'byebro' | 'byebride' | null>(null);
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const { t, locale, setLocale } = useTranslation();

  // Check which brand is selected
  useEffect(() => {
    const brand = localStorage.getItem('selectedBrand') as 'byebro' | 'byebride' | null;
    setSelectedBrand(brand);
  }, []);
  
  // Utilizziamo il nostro hook ottimizzato per lo scroll
  const { isScrolled } = useOptimizedScroll({
    throttleMs: 50 // Reattivo ma ottimizzato
  });

  // Utilizziamo throttle per limitare la frequenza delle chiamate
  const toggleMobileMenu = throttle(() => {
    setMobileMenuOpen(prev => !prev);
  }, 200);

  const navigateToAuth = throttle((defaultTab: string = "login") => {
    navigate(`/auth?tab=${defaultTab}`);
  }, 300);

  const handleLogout = throttle(() => {
    logoutMutation.mutate();
  }, 300);

  const handleChangeBrand = throttle(() => {
    localStorage.removeItem('selectedBrand');
    window.location.href = '/';
  }, 300);

  // Chiude il menu mobile quando si clicca all'esterno
  useEffect(() => {
    // Ottimizzazione: utilizziamo un unico event listener con throttle
    const handleClickOutside = throttle((event: MouseEvent) => {
      if (mobileMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }, 100);

    // Utilizziamo passive: true per migliorare le performance
    document.addEventListener("mousedown", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]); // Dipendenza da mobileMenuOpen per evitare calcoli inutili

  return (
    <header className={`bg-white sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-md py-1' : 'py-2'}`}>
      <div className="container mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-poppins font-bold text-2xl transform transition-transform hover:scale-105">
            {selectedBrand === 'byebride' ? (
              <>
                <span className="text-black">Bye</span><span className="text-pink-600">Bride</span>
              </>
            ) : (
              <>
                <span className="text-black">Bye</span><span className="text-red-600">Bro</span>
              </>
            )}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleChangeBrand}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            data-testid="button-change-brand"
          >
            <ArrowLeft className="w-3 h-3" />
            {t('brand.changeBrand')}
          </Button>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/" className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride' 
              ? `hover:text-pink-600 ${location === "/" ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${location === "/" ? "text-red-600" : ""}`
          }`}>
            {t('header.howItWorks')}
          </Link>
          <Link href="/destinations" className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride'
              ? `hover:text-pink-600 ${location === "/destinations" ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${location === "/destinations" ? "text-red-600" : ""}`
          }`}>
            {t('header.destinations')}
          </Link>
          <Link href="/experiences" className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride'
              ? `hover:text-pink-600 ${location === "/experiences" ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${location === "/experiences" ? "text-red-600" : ""}`
          }`}>
            {t('header.experiences')}
          </Link>
          <Link href="/secret-blog" className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride'
              ? `hover:text-pink-600 ${location === "/secret-blog" ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${location === "/secret-blog" ? "text-red-600" : ""}`
          }`}>
            {t('header.secretBlog')}
          </Link>
          <Link href="/merchandise" className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride'
              ? `hover:text-pink-600 ${location === "/merchandise" ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${location === "/merchandise" ? "text-red-600" : ""}`
          }`}>
            {t('header.merch')}
          </Link>
          <Link href={selectedBrand === 'byebride' ? "/splitta-bride" : "/splitta-bro"} className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride'
              ? `hover:text-pink-600 ${(location.startsWith("/splitta-bro") || location.startsWith("/splitta-bride")) ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${(location.startsWith("/splitta-bro") || location.startsWith("/splitta-bride")) ? "text-red-600" : ""}`
          }`}>
            {selectedBrand === 'byebride' ? 'SplittaBride' : 'SplittaBro'}
          </Link>
        </div>
        
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-sm gap-1 px-2">
                <span>{FLAG_LABELS[locale].flag}</span>
                <Globe className="w-3.5 h-3.5 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(FLAG_LABELS) as Locale[]).map((loc) => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => setLocale(loc)}
                  className={locale === loc ? 'bg-gray-100 font-semibold' : ''}
                >
                  <span className="mr-2">{FLAG_LABELS[loc].flag}</span>
                  {FLAG_LABELS[loc].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="font-medium">
                    <User className="mr-2 h-4 w-4" />
                    {user.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">{t('header.dashboard')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
                    {logoutMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('header.loggingOut')}
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('header.logout')}
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                className={`hidden md:block font-medium ${
                  selectedBrand === 'byebride'
                    ? 'text-pink-600 hover:text-pink-700'
                    : 'text-red-600 hover:text-red-700'
                }`}
                onClick={() => navigateToAuth("login")}
              >
                {t('header.login')}
              </Button>
              <Button
                className={`hidden md:block text-white px-4 py-2 rounded-lg font-medium transition ${
                  selectedBrand === 'byebride'
                    ? 'bg-pink-600 hover:bg-pink-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={() => navigateToAuth("register")}
              >
                {t('header.signup')}
              </Button>
            </>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobileMenu}
            className="md:hidden"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div ref={menuRef} className="md:hidden bg-white border-t border-gray-200 p-4">
          <div className="flex flex-col space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleChangeBrand}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 justify-start"
            >
              <ArrowLeft className="w-3 h-3" />
              {t('brand.changeBrand')}
            </Button>
            <Link href="/" className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>{t('header.howItWorks')}</Link>
            <Link href="/destinations" className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>{t('header.destinations')}</Link>
            <Link href="/experiences" className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>{t('header.experiences')}</Link>
            <Link href="/secret-blog" className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>{t('header.secretBlog')}</Link>
            <Link href="/merchandise" className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>{t('header.merch')}</Link>
            <Link href={selectedBrand === 'byebride' ? "/splitta-bride" : "/splitta-bro"} className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>{selectedBrand === 'byebride' ? 'SplittaBride' : 'SplittaBro'}</Link>
            
            <div className="flex flex-col space-y-2 pt-2 border-t border-gray-200 mt-2">
              {user ? (
                <>
                  <Link href="/dashboard" className="text-dark hover:text-red-600 transition font-medium">{t('header.dashboard')}</Link>
                  <Button 
                    variant="ghost" 
                    className="text-left" 
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 inline animate-spin" />
                        {t('header.loggingOut')}
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4 inline" />
                        {t('header.logout')}
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    className={`font-medium transition text-left ${
                      selectedBrand === 'byebride'
                        ? 'text-pink-600 hover:text-pink-700'
                        : 'text-red-600 hover:text-red-700'
                    }`}
                    onClick={() => navigateToAuth("login")}
                  >
                    {t('header.login')}
                  </Button>
                  <Button 
                    className={`text-white px-4 py-2 rounded-lg font-medium transition ${
                      selectedBrand === 'byebride'
                        ? 'bg-pink-600 hover:bg-pink-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                    onClick={() => navigateToAuth("register")}
                  >
                    {t('header.signup')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

export default Header;