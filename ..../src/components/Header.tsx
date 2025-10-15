import { useState, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Menu, X, User, LogOut, Loader2 } from "lucide-react";
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
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  
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
        <div className="flex items-center">
          <Link href="/" className="font-poppins font-bold text-2xl transform transition-transform hover:scale-105">
            <span className="text-black">Bye</span><span className="text-red-600">Bro</span>
          </Link>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/" className={`text-dark hover:text-red-600 transition font-medium text-sm ${location === "/" ? "text-red-600" : ""}`}>
            How It Works
          </Link>
          <Link href="/destinations" className={`text-dark hover:text-red-600 transition font-medium text-sm ${location === "/destinations" ? "text-red-600" : ""}`}>
            Destinations
          </Link>
          <Link href="/experiences" className={`text-dark hover:text-red-600 transition font-medium text-sm ${location === "/experiences" ? "text-red-600" : ""}`}>
            Experiences
          </Link>
          <Link href="/secret-blog" className={`text-dark hover:text-red-600 transition font-medium text-sm ${location === "/secret-blog" ? "text-red-600" : ""}`}>
            Secret Blog
          </Link>
          <Link href="/merchandise" className={`text-dark hover:text-red-600 transition font-medium text-sm ${location === "/merchandise" ? "text-red-600" : ""}`}>
            Merch
          </Link>
          <Link href="/splitta-bro" className={`text-dark hover:text-red-600 transition font-medium text-sm ${location.startsWith("/splitta-bro") ? "text-red-600" : ""}`}>
            SplittaBro
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
                className="hidden md:block text-red-600 font-medium hover:text-red-700"
                onClick={() => navigateToAuth("login")}
              >
                Log In
              </Button>
              <Button
                className="hidden md:block bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition"
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
            <Link href="/" className="text-dark hover:text-red-600 transition font-medium">How It Works</Link>
            <Link href="/destinations" className="text-dark hover:text-red-600 transition font-medium">Destinations</Link>
            <Link href="/experiences" className="text-dark hover:text-red-600 transition font-medium">Experiences</Link>
            <Link href="/secret-blog" className="text-dark hover:text-red-600 transition font-medium">Secret Blog</Link>
            <Link href="/merchandise" className="text-dark hover:text-red-600 transition font-medium">Merch</Link>
            <Link href="/splitta-bro" className="text-dark hover:text-red-600 transition font-medium">SplittaBro</Link>
            
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
                    className="text-red-600 font-medium hover:text-red-700 transition text-left" 
                    onClick={() => navigateToAuth("login")}
                  >
                    Log In
                  </Button>
                  <Button 
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition" 
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