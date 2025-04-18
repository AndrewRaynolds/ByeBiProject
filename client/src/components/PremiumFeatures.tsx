import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PremiumFeatures() {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const { user, isAuthenticated, updateUser } = useAuth();
  const { toast } = useToast();
  const isPremium = user?.isPremium || false;

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please login or register to upgrade to premium.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", `/api/users/${user?.id}/premium`, {
        isPremium: true
      });
      
      const updatedUser = await response.json();
      updateUser(updatedUser);
      
      toast({
        title: "Upgrade successful!",
        description: `You now have full access to all premium features. ${selectedPlan === "annual" ? "Your 3 free t-shirts will be available in your dashboard." : ""}`,
      });
      
      // Invalidate queries that depend on premium status
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
      
    } catch (error) {
      toast({
        title: "Upgrade failed",
        description: "There was a problem upgrading your account. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <section id="premium-features" className="py-16 bg-gradient-to-r from-primary to-accent">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3 text-white">Upgrade to Premium</h2>
          <p className="text-white opacity-90 max-w-3xl mx-auto">Get exclusive access to premium features and take your bachelor party planning to the next level.</p>
        </div>
        
        <div className="max-w-4xl mx-auto bg-white rounded-xl overflow-hidden shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="p-8 bg-light">
              <h3 className="text-2xl font-bold mb-6 font-poppins">Premium Benefits</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="text-primary mt-1 mr-3 h-5 w-5" />
                  <div>
                    <span className="font-medium">Unlimited Secret Blog Access</span>
                    <p className="text-sm text-gray-600 mt-1">Read and share real bachelor party stories without limits</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="text-primary mt-1 mr-3 h-5 w-5" />
                  <div>
                    <span className="font-medium">Create Custom Groom Avatar</span>
                    <p className="text-sm text-gray-600 mt-1">Design a fun avatar of the groom for your trip</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="text-primary mt-1 mr-3 h-5 w-5" />
                  <div>
                    <span className="font-medium">Priority Itinerary Generation</span>
                    <p className="text-sm text-gray-600 mt-1">Get faster and more detailed trip recommendations</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="text-primary mt-1 mr-3 h-5 w-5" />
                  <div>
                    <span className="font-medium">Exclusive Discounts</span>
                    <p className="text-sm text-gray-600 mt-1">Special pricing on accommodation and activities</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="text-primary mt-1 mr-3 h-5 w-5" />
                  <div>
                    <span className="font-medium">24/7 Travel Support</span>
                    <p className="text-sm text-gray-600 mt-1">Get help with your trip anytime you need it</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="col-span-2 p-8">
              <h3 className="text-2xl font-bold mb-6 font-poppins">Choose Your Plan</h3>
              
              {isPremium ? (
                <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="text-xl font-bold text-green-600 mb-2">You're a Premium Member!</h4>
                  <p className="text-gray-600">
                    You already have access to all premium features including unlimited blog posts, custom groom avatars, priority itineraries, and exclusive discounts.
                  </p>
                  <Button className="mt-4 bg-primary hover:bg-accent">
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div 
                    className={`border rounded-lg p-6 hover:shadow-md transition duration-300 ${
                      selectedPlan === "monthly" ? "border-primary shadow-md" : "border-gray-200"
                    }`}
                    onClick={() => setSelectedPlan("monthly")}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold">Monthly</h4>
                        <p className="text-gray-600 text-sm">Perfect for one-time planning</p>
                      </div>
                      <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">Popular</div>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">€4.99</span>
                      <span className="text-gray-500">/month</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center">
                        <Check className="text-green-500 mr-2 h-4 w-4" />
                        <span className="text-sm">All premium benefits</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="text-green-500 mr-2 h-4 w-4" />
                        <span className="text-sm">Cancel anytime</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="text-green-500 mr-2 h-4 w-4" />
                        <span className="text-sm">10% off custom merchandise</span>
                      </li>
                    </ul>
                    <Button 
                      className={`w-full ${selectedPlan === "monthly" ? "bg-primary" : "bg-gray-400"} text-white font-bold py-2 px-4 rounded-lg hover:bg-accent transition duration-300`}
                      onClick={handleUpgrade}
                    >
                      Choose Monthly
                    </Button>
                  </div>
                  
                  <div 
                    className={`border rounded-lg p-6 hover:shadow-md transition duration-300 ${
                      selectedPlan === "annual" ? "border-primary shadow-md" : "border-gray-200"
                    }`}
                    onClick={() => setSelectedPlan("annual")}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold">Annual</h4>
                        <p className="text-gray-600 text-sm">Best value for bachelor party pros</p>
                      </div>
                      <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Save 33%</div>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">€39.99</span>
                      <span className="text-gray-500">/year</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center">
                        <Check className="text-green-500 mr-2 h-4 w-4" />
                        <span className="text-sm">All premium benefits</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="text-green-500 mr-2 h-4 w-4" />
                        <span className="text-sm">3 free t-shirts for your group</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="text-green-500 mr-2 h-4 w-4" />
                        <span className="text-sm">20% off custom merchandise</span>
                      </li>
                    </ul>
                    <Button 
                      className={`w-full ${selectedPlan === "annual" ? "bg-primary" : "bg-gray-400"} text-white font-bold py-2 px-4 rounded-lg hover:bg-accent transition duration-300`}
                      onClick={handleUpgrade}
                    >
                      Choose Annual
                    </Button>
                  </div>
                </div>
              )}
              
              {!isPremium && (
                <div className="mt-6 text-center text-sm text-gray-600">
                  <p>Not sure yet? <a href="#" className="text-primary hover:text-accent">Start with a 7-day free trial</a></p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
