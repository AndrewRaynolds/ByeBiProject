import { useState, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Menu, X, User, LogOut, Loader2, ArrowLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOptimizedScroll } from "@/hooks/use-optimized-scroll";
import { throttle } from "@/lib/performance";

// Utilizziamo React.memo per evitare re-render inutili
const Header = memo(function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<'byebro' | 'byebride' | null>(null);
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

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
            Cambia brand
          </Button>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/" className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride' 
              ? `hover:text-pink-600 ${location === "/" ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${location === "/" ? "text-red-600" : ""}`
          }`}>
            How It Works
          </Link>
          <Link href="/destinations" className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride'
              ? `hover:text-pink-600 ${location === "/destinations" ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${location === "/destinations" ? "text-red-600" : ""}`
          }`}>
            Destinations
          </Link>
          <Link href="/experiences" className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride'
              ? `hover:text-pink-600 ${location === "/experiences" ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${location === "/experiences" ? "text-red-600" : ""}`
          }`}>
            Experiences
          </Link>
          <Link href="/secret-blog" className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride'
              ? `hover:text-pink-600 ${location === "/secret-blog" ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${location === "/secret-blog" ? "text-red-600" : ""}`
          }`}>
            Secret Blog
          </Link>
          <Link href="/merchandise" className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride'
              ? `hover:text-pink-600 ${location === "/merchandise" ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${location === "/merchandise" ? "text-red-600" : ""}`
          }`}>
            Merch
          </Link>
          <Link href={selectedBrand === 'byebride' ? "/splitta-bride" : "/splitta-bro"} className={`text-dark transition font-medium text-sm ${
            selectedBrand === 'byebride'
              ? `hover:text-pink-600 ${(location.startsWith("/splitta-bro") || location.startsWith("/splitta-bride")) ? "text-pink-600" : ""}`
              : `hover:text-red-600 ${(location.startsWith("/splitta-bro") || location.startsWith("/splitta-bride")) ? "text-red-600" : ""}`
          }`}>
            {selectedBrand === 'byebride' ? 'SplittaBride' : 'SplittaBro'}
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
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
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
                    {logoutMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging out...
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
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
                Log In
              </Button>
              <Button
                className={`hidden md:block text-white px-4 py-2 rounded-lg font-medium transition ${
                  selectedBrand === 'byebride'
                    ? 'bg-pink-600 hover:bg-pink-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={() => navigateToAuth("register")}
              >
                Sign Up
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
              Cambia brand
            </Button>
            <Link href="/" className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>How It Works</Link>
            <Link href="/destinations" className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>Destinations</Link>
            <Link href="/experiences" className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>Experiences</Link>
            <Link href="/secret-blog" className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>Secret Blog</Link>
            <Link href="/merchandise" className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>Merch</Link>
            <Link href={selectedBrand === 'byebride' ? "/splitta-bride" : "/splitta-bro"} className={`text-dark transition font-medium ${
              selectedBrand === 'byebride' ? 'hover:text-pink-600' : 'hover:text-red-600'
            }`}>{selectedBrand === 'byebride' ? 'SplittaBride' : 'SplittaBro'}</Link>
            
            <div className="flex flex-col space-y-2 pt-2 border-t border-gray-200 mt-2">
              {user ? (
                <>
                  <Link href="/dashboard" className="text-dark hover:text-red-600 transition font-medium">Dashboard</Link>
                  <Button 
                    variant="ghost" 
                    className="text-left" 
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 inline animate-spin" />
                        Logging out...
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4 inline" />
                        Logout
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
                    Log In
                  </Button>
                  <Button 
                    className={`text-white px-4 py-2 rounded-lg font-medium transition ${
                      selectedBrand === 'byebride'
                        ? 'bg-pink-600 hover:bg-pink-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                    onClick={() => navigateToAuth("register")}
                  >
                    Sign Up
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