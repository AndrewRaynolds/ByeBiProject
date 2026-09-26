import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RouteScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    if (location === "/destinations" || location.startsWith("/destinations/") || location.startsWith("/experiences")) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [location]);

  return null;
}
