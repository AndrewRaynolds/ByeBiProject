import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PremiumFeatures from "@/components/PremiumFeatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Star, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SecretBlogPage() {
  const { isAuthenticated, user } = useAuth();
  const isPremium = user?.isPremium || false;
  const [newPostContent, setNewPostContent] = useState("");
  const { toast } = useToast();

  const { data: blogPosts, isLoading, error } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog-posts", { premium: isPremium }],
  });

  const handleSubmitPost = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please login to share your story.",
        variant: "destructive",
      });
      return;
    }

    if (!isPremium) {
      toast({
        title: "Premium feature",
        description: "Upgrade to premium to share your own secret stories.",
        variant: "destructive",
      });
      return;
    }

    if (!newPostContent.trim()) {
      toast({
        title: "Empty post",
        description: "Please write something before submitting.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Story submitted",
      description: "Your story has been submitted for review. It will be published soon!",
    });
    
    setNewPostContent("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Header />
      
      <main className="flex-grow">
        <div className="bg-primary text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold font-poppins mb-4">Secret Blog</h1>
            <p className="max-w-2xl mx-auto">Real, anonymous stories from bachelor parties around Europe. Learn from others' experiences and share your own.</p>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-10">
          <Tabs defaultValue="popular" className="w-full">
            <div className="flex justify-between items-center mb-6">
              <TabsList>
                <TabsTrigger value="popular"><Star className="mr-2 h-4 w-4" /> Popular Stories</TabsTrigger>
                <TabsTrigger value="newest"><MessageSquare className="mr-2 h-4 w-4" /> Newest Stories</TabsTrigger>
              </TabsList>
              
              {!isPremium && (
                <div className="hidden md:block">
                  <Button 
                    variant="outline" 
                    className="border-primary text-primary hover:bg-primary hover:text-white"
                    onClick={() => document.getElementById('premium-features')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Unlock Premium Access
                  </Button>
                </div>
              )}
            </div>
            
            <TabsContent value="popular">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="h-40 w-full" />
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4 mb-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-10">
                  <p className="text-red-500">Error loading blog posts. Please try again later.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                  {blogPosts?.map((post) => (
                    <Card key={post.id} className="overflow-hidden">
                      <div className="relative">
                        <img 
                          src={post.image} 
                          alt={post.title} 
                          className="w-full h-40 object-cover" 
                        />
                        <div className="absolute top-2 left-2">
                          {post.isPremium ? (
                            <span className="bg-primary text-white text-xs px-2 py-1 rounded-full font-medium">Premium</span>
                          ) : (
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">Free</span>
                          )}
                        </div>
                        
                        {post.isPremium && !isPremium && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Lock className="text-white h-10 w-10" />
                          </div>
                        )}
                      </div>
                      
                      <CardHeader>
                        <CardTitle>{post.title}</CardTitle>
                      </CardHeader>
                      
                      <CardContent>
                        <p className="text-gray-600 line-clamp-3">{post.content}</p>
                      </CardContent>
                      
                      <CardFooter className="flex justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                            <i className="fas fa-user text-gray-500"></i>
                          </div>
                          <span className="text-sm text-gray-600">Anonymous</span>
                        </div>
                        
                        <Button variant="ghost" className="text-primary hover:text-accent">
                          Read More
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="newest">
              {/* This would normally contain different content, but for simplicity, we'll show the same content */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="h-40 w-full" />
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4 mb-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                  {/* We would typically sort by date here */}
                  {blogPosts?.map((post) => (
                    <Card key={post.id} className="overflow-hidden">
                      <div className="relative">
                        <img 
                          src={post.image} 
                          alt={post.title} 
                          className="w-full h-40 object-cover" 
                        />
                        <div className="absolute top-2 left-2">
                          {post.isPremium ? (
                            <span className="bg-primary text-white text-xs px-2 py-1 rounded-full font-medium">Premium</span>
                          ) : (
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">Free</span>
                          )}
                        </div>
                        
                        {post.isPremium && !isPremium && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Lock className="text-white h-10 w-10" />
                          </div>
                        )}
                      </div>
                      
                      <CardHeader>
                        <CardTitle>{post.title}</CardTitle>
                      </CardHeader>
                      
                      <CardContent>
                        <p className="text-gray-600 line-clamp-3">{post.content}</p>
                      </CardContent>
                      
                      <CardFooter className="flex justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                            <i className="fas fa-user text-gray-500"></i>
                          </div>
                          <span className="text-sm text-gray-600">Anonymous</span>
                        </div>
                        
                        <Button variant="ghost" className="text-primary hover:text-accent">
                          Read More
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          {/* Share Your Story Section */}
          <div className="mt-10 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold font-poppins mb-4">Share Your Story</h2>
            <p className="text-gray-600 mb-4">
              {isPremium 
                ? "Share your anonymous bachelor party experiences with the community." 
                : "Upgrade to premium to share your own story and read unlimited secret blogs."}
            </p>
            
            <div className="relative">
              {!isPremium && (
                <div className="absolute inset-0 bg-gray-200/70 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10">
                  <Lock className="text-primary h-10 w-10 mb-3" />
                  <p className="text-gray-800 font-medium mb-3">Premium Members Only</p>
                  <Button 
                    className="bg-primary hover:bg-accent"
                    onClick={() => document.getElementById('premium-features')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Upgrade to Share
                  </Button>
                </div>
              )}
              
              <Textarea 
                placeholder="Share your wildest (anonymous) bachelor party story..."
                className="min-h-[150px] mb-4"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
              
              <div className="flex justify-end">
                <Button 
                  className="bg-primary hover:bg-accent"
                  onClick={handleSubmitPost}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit Anonymously
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Premium Features Section */}
        {!isPremium && (
          <div id="premium-features">
            <PremiumFeatures />
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
