import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Merchandise } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CustomMerchandise from "@/components/CustomMerchandise";
import Newsletter from "@/components/Newsletter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Heart, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function MerchandisePage() {
  const [cart, setCart] = useState<Array<{ id: number; quantity: number }>>([]);
  const { toast } = useToast();

  // Funzione helper per aggiungere il cache buster alle URL delle immagini
  const getCacheBustedImageUrl = (url: string) => {
    return `${url}?t=${Date.now()}`;
  };
  
  // Aggiungiamo un useEffect per invalidare la cache all'avvio del componente
  useEffect(() => {
    // Invalida la cache della query
    queryClient.invalidateQueries({ queryKey: ["/api/merchandise"] });
  }, []);

  const { data: merchandise, isLoading, error } = useQuery<Merchandise[]>({
    queryKey: ["/api/merchandise"],
    staleTime: 0, // Non usare la cache
    refetchOnMount: true, // Forza il refresh quando il componente viene montato
  });

  const handleAddToCart = (id: number) => {
    const existingItemIndex = cart.findIndex(item => item.id === id);
    
    if (existingItemIndex >= 0) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { id, quantity: 1 }]);
    }
    
    toast({
      title: "Added to cart",
      description: "Item has been added to your cart.",
    });
  };

  // Group merchandise by type
  const groupedMerchandise = merchandise?.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, Merchandise[]>) || {};

  // Get unique types for tabs
  const types = Object.keys(groupedMerchandise);

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Header />
      
      <main className="flex-grow">
        <div className="bg-primary text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold font-poppins mb-4">Custom Bachelor Party Merchandise</h1>
            <p className="max-w-2xl mx-auto">Create personalized gear for the whole crew. Make your bachelor party unforgettable with custom t-shirts, caps, and more.</p>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-10">
          {/* Shopping Cart Badge */}
          <div className="flex justify-end mb-6">
            <Button variant="outline" className="relative">
              <ShoppingCart className="h-5 w-5 mr-2" />
              <span>Cart</span>
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </Button>
          </div>
          
          {/* Product Categories */}
          {isLoading ? (
            <div className="mb-12">
              <Skeleton className="h-10 w-64 mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-64 w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-4" />
                      <Skeleton className="h-5 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500">Error loading merchandise. Please try again later.</p>
            </div>
          ) : types.length > 0 ? (
            <Tabs defaultValue={types[0]} className="mb-12">
              <TabsList className="mb-6">
                {types.map((type) => (
                  <TabsTrigger key={type} value={type} className="capitalize">
                    {type}s
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {types.map((type) => (
                <TabsContent key={type} value={type}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {groupedMerchandise[type].map((item) => (
                      <Card key={item.id} className="overflow-hidden group">
                        <div className="relative h-64 overflow-hidden">
                          <img 
                            src={getCacheBustedImageUrl(item.image)} 
                            alt={item.name} 
                            className="w-full h-full object-cover transition duration-500 group-hover:scale-105" 
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 bg-white/80 text-gray-600 hover:text-primary hover:bg-white"
                          >
                            <Heart className="h-5 w-5" />
                          </Button>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                          <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                          <p className="text-primary font-bold">€{(item.price / 100).toFixed(2)}</p>
                        </CardContent>
                        <CardFooter className="pt-0 pb-4 px-4">
                          <Button 
                            className="w-full bg-primary hover:bg-accent"
                            onClick={() => handleAddToCart(item.id)}
                          >
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            Add to Cart
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-10">
              <p>No merchandise found. Please check back later.</p>
            </div>
          )}
        </div>
        
        {/* Custom Merchandise Section */}
        <CustomMerchandise />
        
        {/* Newsletter */}
        <Newsletter />
      </main>
      
      <Footer />
    </div>
  );
}
