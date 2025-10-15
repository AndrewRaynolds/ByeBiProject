import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Merchandise } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Upload, Minus, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CustomMerchandise() {
  const [customText, setCustomText] = useState("");
  const [textColor, setTextColor] = useState("white");
  const [quantity, setQuantity] = useState(6);
  const [selectedType, setSelectedType] = useState("tshirt");
  const { toast } = useToast();

  const { data: merchandise, isLoading, error } = useQuery<Merchandise[]>({
    queryKey: ["/api/merchandise"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const handleAddToCart = () => {
    toast({
      title: "Added to cart",
      description: `${quantity} custom ${selectedType}s have been added to your cart.`,
    });
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-5 w-96 mx-auto mt-3" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            <div className="col-span-1 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-light rounded-xl overflow-hidden shadow-md">
                    <Skeleton className="h-64 w-full" />
                    <div className="p-5">
                      <Skeleton className="h-6 w-36 mb-2" />
                      <Skeleton className="h-4 w-full mb-4" />
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-1">
              <Skeleton className="h-[600px] w-full rounded-xl" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3">Custom Merchandise</h2>
            <p className="text-red-500">Error loading merchandise. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  // Filter merchandise by type
  const tShirts = merchandise?.filter(item => item.type === "tshirt") || [];
  const caps = merchandise?.filter(item => item.type === "cap") || [];
  const smallItems = merchandise?.filter(item => !["tshirt", "cap"].includes(item.type)) || [];

  // Funzione helper per aggiungere il cache buster alle URL delle immagini
  const getCacheBustedImageUrl = (url: string) => {
    return `${url}?t=${Date.now()}`;
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3">Custom Merchandise</h2>
          <p className="text-gray-600 max-w-3xl mx-auto">Create personalized t-shirts, hats, and more for your bachelor party. Make the event unforgettable with custom gear for the whole crew.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="col-span-1 lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product 1 and 2 (T-shirts and Caps) */}
              {[...tShirts, ...caps].slice(0, 2).map((item) => (
                <div key={item.id} className="bg-light rounded-xl overflow-hidden shadow-md group hover:shadow-lg transition duration-300">
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={getCacheBustedImageUrl(item.image)} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md">
                      <Heart className="text-gray-400 hover:text-primary cursor-pointer transition" />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-bold mb-2 font-poppins">{item.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-bold">€{(item.price / 100).toFixed(2)} <span className="text-sm font-normal text-gray-500">/ {item.type}</span></span>
                      <Button 
                        variant="ghost" 
                        className="text-primary hover:text-accent font-medium"
                        onClick={() => setSelectedType(item.type)}
                      >
                        Customize
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Products 3, 4, 5 (Small items) */}
              {smallItems.slice(0, 3).map((item) => (
                <div key={item.id} className="bg-light rounded-xl overflow-hidden shadow-md group hover:shadow-lg transition duration-300">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={getCacheBustedImageUrl(item.image)} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition duration-500 group-hover:scale-105" 
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold mb-1 font-poppins">{item.name}</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600 font-bold">€{(item.price / 100).toFixed(2)}</span>
                      <Button 
                        variant="ghost" 
                        className="text-red-600 hover:text-red-700 text-sm font-medium p-0"
                        onClick={() => setSelectedType(item.type)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Customization Panel */}
          <div className="col-span-1">
            <div className="bg-light rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-4 font-poppins">Design Your Merch</h3>
              <p className="text-gray-600 text-sm mb-6">Customize your gear with our easy-to-use design tool. Add text, images, and more.</p>
              
              <form onSubmit={(e) => { e.preventDefault(); handleAddToCart(); }}>
                <div className="mb-4">
                  <label htmlFor="product-type" className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                  <Select 
                    value={selectedType} 
                    onValueChange={setSelectedType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tshirt">T-Shirt</SelectItem>
                      <SelectItem value="cap">Cap</SelectItem>
                      <SelectItem value="mug">Mug</SelectItem>
                      <SelectItem value="socks">Socks</SelectItem>
                      <SelectItem value="badges">Badges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="design-text" className="block text-sm font-medium text-gray-700 mb-1">Custom Text</label>
                  <Input 
                    id="design-text" 
                    value={customText} 
                    onChange={(e) => setCustomText(e.target.value)} 
                    placeholder="e.g., Mike's Last Night of Freedom" 
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                  <div className="grid grid-cols-6 gap-2">
                    {["white", "black", "#FF5A5F", "#3B82F6", "#22C55E", "#F59E0B"].map((color) => (
                      <Button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full p-0 ${textColor === color ? 'ring-2 ring-offset-2 ring-red-600' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setTextColor(color)}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image or Logo</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-red-600 transition">
                    <Upload className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG (max 5MB)</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <div className="flex">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="px-3 rounded-l-lg"
                      onClick={decrementQuantity}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      id="quantity"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-20 text-center rounded-none border-x-0"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      className="px-3 rounded-r-lg"
                      onClick={incrementQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700">
                  Add to Cart
                </Button>
                
                <p className="text-xs text-gray-500 mt-4 text-center">Each member of your party gets a free t-shirt when you book a package through ByeBro!</p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
