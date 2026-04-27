import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Flame, MapPin, Calendar } from "lucide-react";
import {
  Brand,
  getAnonymousAlias,
  getAvatarEmoji,
  DESTINATIONS_MAP,
} from "@/components/SecretBlog";

function getBrand(): Brand {
  try {
    const saved = localStorage.getItem("selectedBrand");
    return saved === "byebride" ? "bride" : "bro";
  } catch {
    return "bro";
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  sex: "🔞 Sex",
  drink: "🍺 Drink",
  weird: "🤪 Weird",
};

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function PostSkeleton({ isBride }: { isBride: boolean }) {
  const bg = isBride ? "bg-[#0a0515]" : "bg-black";
  const cardBg = isBride ? "bg-[#1a0f2e]" : "bg-gray-900";
  return (
    <div className={`min-h-screen flex flex-col ${bg}`}>
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12 max-w-2xl">
        <Skeleton className="h-5 w-28 mb-8" />
        <div className={`rounded-2xl ${cardBg} p-8`}>
          <div className="flex gap-2 mb-6">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-8 w-3/4 mb-6" />
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function SecretBlogPostPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const brand = getBrand();
  const isBride = brand === "bride";

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: [`/api/blog-posts/${id}`],
    enabled: !!id,
  });

  const accentColor = isBride ? "from-purple-600 to-pink-500" : "from-red-700 to-red-600";
  const accentText = isBride ? "text-pink-400" : "text-red-400";
  const bg = isBride ? "bg-[#0a0515]" : "bg-black";
  const cardBg = isBride ? "bg-[#1a0f2e] border border-purple-500/20" : "bg-gray-900 border border-gray-800";
  const textMuted = isBride ? "text-purple-200/70" : "text-gray-400";
  const borderTop = isBride
    ? "border-t border-purple-800/30"
    : "border-t border-gray-800";

  if (isLoading) return <PostSkeleton isBride={isBride} />;

  if (error || !post) {
    return (
      <div className={`min-h-screen flex flex-col ${bg}`}>
        <Header />
        <main className="flex-grow container mx-auto px-4 py-20 max-w-2xl text-center">
          <div className="text-5xl mb-6">🤐</div>
          <h1 className="text-2xl font-bold text-white mb-3">Storia non trovata</h1>
          <p className={`${textMuted} mb-8`}>
            Questa storia potrebbe essere stata rimossa o non esiste.
          </p>
          <Link href="/secret-blog">
            <Button className={`bg-gradient-to-r ${accentColor} text-white font-bold px-6 rounded-xl`}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Torna alle storie
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const alias = getAnonymousAlias(post.id, brand);
  const emoji = getAvatarEmoji(post.id, brand);
  const locationLabel = post.location
    ? (DESTINATIONS_MAP[post.location] ?? `📍 ${post.location}`)
    : null;

  return (
    <div className={`min-h-screen flex flex-col ${bg}`}>
      <Header />

      <main className="flex-grow container mx-auto px-4 py-10 max-w-2xl">
        <Link href="/secret-blog">
          <button className={`flex items-center gap-1 text-sm font-medium ${textMuted} hover:text-white transition-colors mb-8`}>
            <ChevronLeft className="w-4 h-4" />
            Torna alle storie
          </button>
        </Link>

        <article className={`rounded-2xl ${cardBg} overflow-hidden`}>
          {isBride && (
            <div className="h-[3px] bg-gradient-to-r from-purple-600 to-pink-500" />
          )}
          {!isBride && post.isPremium && (
            <div className="h-[3px] bg-gradient-to-r from-red-700 via-red-500 to-red-700" />
          )}

          <div className="p-8">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {post.category && (
                <span className={`text-sm px-3 py-1 rounded-full font-semibold bg-gradient-to-r ${accentColor} text-white`}>
                  {CATEGORY_LABEL[post.category] ?? post.category}
                </span>
              )}
              {locationLabel && (
                <span className="flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white font-medium">
                  <MapPin className="w-3 h-3" />
                  {locationLabel}
                </span>
              )}
              {post.isPremium && (
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold border border-yellow-500/30">
                  Premium
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white font-poppins leading-snug mb-6">
              {post.title}
            </h1>

            <div className={`flex items-center gap-3 pb-6 mb-6 ${borderTop} pt-0`}>
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                  isBride ? "bg-purple-900/50 border border-purple-500/30" : "bg-gray-800 border border-gray-700"
                }`}
              >
                {emoji}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{alias}</p>
                <p className={`${textMuted} text-xs`}>Racconto anonimo</p>
              </div>
              {post.createdAt && (
                <div className={`ml-auto flex items-center gap-1 text-xs ${textMuted}`}>
                  <Calendar className="w-3 h-3" />
                  {formatDate(post.createdAt)}
                </div>
              )}
            </div>

            <div className={`${borderTop} pt-6`}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest ${accentText} mb-4`}>
                <Flame className="w-3 h-3" />
                <span>La storia</span>
              </div>
              <p className={`${textMuted} text-base leading-relaxed whitespace-pre-wrap`}>
                {post.content}
              </p>
            </div>
          </div>
        </article>

        <div className="mt-8 text-center">
          <Link href="/secret-blog">
            <Button
              variant="outline"
              className={`${
                isBride
                  ? "border-purple-500/40 text-purple-300 hover:bg-purple-900/30"
                  : "border-gray-700 text-gray-400 hover:bg-gray-900"
              } font-semibold rounded-xl px-6`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Leggi altre storie
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
