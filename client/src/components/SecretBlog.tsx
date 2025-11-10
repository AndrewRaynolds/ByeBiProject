import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

type Brand = 'bro' | 'bride';

interface SecretBlogProps {
  brand?: Brand;
}

const COPY = {
  bro: {
    subtitle: "Real, anonymous stories from bachelor parties around Europe. Learn from others' experiences and share your own."
  },
  bride: {
    subtitle: "Real, anonymous stories from bachelorette parties around Europe. Learn from others' experiences and share your own."
  }
};

export default function SecretBlog({ brand = 'bro' }: SecretBlogProps) {
  const { isAuthenticated, user } = useAuth();
  const isPremium = user?.isPremium || false;
  const copy = COPY[brand];

  const { data: blogPosts, isLoading, error } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog-posts"],
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div>
              <Skeleton className="h-10 w-48 mb-3" />
              <Skeleton className="h-5 w-full max-w-2xl" />
            </div>
            <Skeleton className="h-12 w-48 mt-6 md:mt-0" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 rounded-xl overflow-hidden shadow-md">
                <Skeleton className="h-48 w-full" />
                <div className="p-5">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="h-4 w-20 ml-2" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3 text-white">Secret Blog</h2>
            <p className="text-red-500">Error loading blog posts. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  const freePosts = blogPosts?.filter(post => !post.isPremium) || [];
  const premiumPosts = blogPosts?.filter(post => post.isPremium) || [];

  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3 text-white">Secret Blog</h2>
            <p className="text-gray-300 max-w-2xl">{copy.subtitle}</p>
          </div>
          <div className="mt-6 md:mt-0">
            {!isPremium && (
              <Link href="#premium-features">
                <Button className="bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 px-6 rounded-lg transition hover:opacity-90">
                  Unlock Premium Access
                </Button>
              </Link>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
          {/* Free Blog Posts */}
          {freePosts.slice(0, 2).map((post) => (
            <div key={post.id} className="bg-gray-900 rounded-xl overflow-hidden shadow-md group hover:shadow-lg transition duration-300">
              <div className="relative">
                <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />
                <div className="absolute top-3 left-3">
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">Free</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold mb-2 font-poppins text-white">{post.title}</h3>
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">{post.content}</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-black border border-gray-700 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-gray-400"></i>
                    </div>
                    <span className="text-gray-300 ml-2 text-sm">Anonymous</span>
                  </div>
                  <Link href={`/secret-blog/${post.id}`} className="text-red-600 hover:text-red-700 font-medium">
                    Read More
                  </Link>
                </div>
              </div>
            </div>
          ))}
          
          {/* Premium Blog Post (Locked for non-premium users) */}
          {premiumPosts.slice(0, 1).map((post) => (
            <div key={post.id} className="bg-gray-900 rounded-xl overflow-hidden shadow-md group hover:shadow-lg transition duration-300 relative">
              {!isPremium && (
                <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center">
                  <Lock className="text-red-600 text-3xl mb-3" />
                  <span className="text-white font-bold">Premium Content</span>
                  <Link href="#premium-features">
                    <Button className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition">
                      Upgrade to Access
                    </Button>
                  </Link>
                </div>
              )}
              <div className="relative">
                <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />
                <div className="absolute top-3 left-3">
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-medium">Premium</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold mb-2 font-poppins text-white">{post.title}</h3>
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">{post.content}</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-black border border-gray-700 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-gray-400"></i>
                    </div>
                    <span className="text-gray-300 ml-2 text-sm">Anonymous</span>
                  </div>
                  <Link href={`/secret-blog/${post.id}`} className="text-red-600 hover:text-red-700 font-medium">
                    Read More
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Link href="/secret-blog">
            <Button variant="outline" className="border border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-bold py-2 px-6 rounded-lg transition duration-300">
              View All Stories
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}