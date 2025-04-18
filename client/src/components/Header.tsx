import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import AuthModal from "./AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [defaultAuthTab, setDefaultAuthTab] = useState<"login" | "signup">("login");
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const openAuthModal = (tab: "login" | "signup") => {
    setDefaultAuthTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="font-poppins font-bold text-2xl">
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
        </div>
        
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="font-medium">
                    <User className="mr-2 h-4 w-4" />
                    {user?.firstName || user?.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account-settings">Account Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                className="hidden md:block text-red-600 font-medium hover:text-red-700"
                onClick={() => openAuthModal("login")}
              >
                Log In
              </Button>
              <Button
                className="hidden md:block bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition"
                onClick={() => openAuthModal("signup")}
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
            
            <div className="flex flex-col space-y-2 pt-2 border-t border-gray-200 mt-2">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" className="text-dark hover:text-red-600 transition font-medium">Dashboard</Link>
                  <Link href="/account-settings" className="text-dark hover:text-red-600 transition font-medium">Account Settings</Link>
                  <Button variant="ghost" className="text-left" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4 inline" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="text-red-600 font-medium hover:text-red-700 transition text-left" onClick={() => openAuthModal("login")}>
                    Log In
                  </Button>
                  <Button className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition" onClick={() => openAuthModal("signup")}>
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={closeAuthModal} 
        defaultTab={defaultAuthTab}
      />
    </header>
  );
}
