import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Crown, BookOpen, Flame } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";

export type Brand = 'bro' | 'bride';

interface SecretBlogProps {
  brand?: Brand;
}

export const BRO_ALIASES = [
  "Il Best Man di Barcellona",
  "Lo Sposo di Roma",
  "Il Padrino di Ibiza",
  "Il Testimone di Praga",
  "Il Best Man di Amsterdam",
  "Lo Sposo di Cracovia",
  "Il Padrino di Berlino",
  "Il Testimone di Budapest",
];

export const BRIDE_ALIASES = [
  "La Sposa di Parigi",
  "La Testimone di Barcellona",
  "La Damigella di Santorini",
  "La Sposa di Roma",
  "La Testimone di Amsterdam",
  "La Damigella di Ibiza",
  "La Sposa di Praga",
  "La Testimone di Berlino",
];

export const BRO_EMOJIS = ["🤘", "🍺", "🔥", "💀", "🎯", "⚡", "🏆", "🎲"];
export const BRIDE_EMOJIS = ["👑", "🌸", "💎", "🥂", "✨", "🌷", "💍", "🦋"];

export function getAnonymousAlias(postId: number, brand: Brand): string {
  const aliases = brand === 'bride' ? BRIDE_ALIASES : BRO_ALIASES;
  return aliases[postId % aliases.length];
}

export function getAvatarEmoji(postId: number, brand: Brand): string {
  const emojis = brand === 'bride' ? BRIDE_EMOJIS : BRO_EMOJIS;
  return emojis[postId % emojis.length];
}

export const DESTINATIONS_MAP: Record<string, string> = {
  Roma: "🇮🇹 Roma",
  Ibiza: "🇪🇸 Ibiza",
  Cracovia: "🇵🇱 Cracovia",
  Barcellona: "🇪🇸 Barcellona",
  Amsterdam: "🇳🇱 Amsterdam",
  Praga: "🇨🇿 Praga",
  Berlino: "🇩🇪 Berlino",
  Budapest: "🇭🇺 Budapest",
  Parigi: "🇫🇷 Parigi",
  Mykonos: "🇬🇷 Mykonos",
  Santorini: "🇬🇷 Santorini",
  Lisbona: "🇵🇹 Lisbona",
};

export function extractLocation(title: string): string | null {
  const locations: Record<string, string> = {
    roma: "🇮🇹 Roma",
    rome: "🇮🇹 Roma",
    ibiza: "🇪🇸 Ibiza",
    cracovia: "🇵🇱 Cracovia",
    krakow: "🇵🇱 Cracovia",
    barcellona: "🇪🇸 Barcellona",
    barcelona: "🇪🇸 Barcellona",
    amsterdam: "🇳🇱 Amsterdam",
    praga: "🇨🇿 Praga",
    prague: "🇨🇿 Praga",
    berlino: "🇩🇪 Berlino",
    berlin: "🇩🇪 Berlino",
    budapest: "🇭🇺 Budapest",
    parigi: "🇫🇷 Parigi",
    paris: "🇫🇷 Parigi",
    mykonos: "🇬🇷 Mykonos",
    santorini: "🇬🇷 Santorini",
  };
  const lower = title.toLowerCase();
  for (const [key, label] of Object.entries(locations)) {
    if (lower.includes(key)) return label;
  }
  return null;
}

export function BroCard({ post, isPremium, t }: { post: BlogPost; isPremium: boolean; t: (k: string) => string }) {
  const alias = getAnonymousAlias(post.id, 'bro');
  const emoji = getAvatarEmoji(post.id, 'bro');
  const locationLabel = post.location
    ? (DESTINATIONS_MAP[post.location] ?? `📍 ${post.location}`)
    : extractLocation(post.title);
  const isLocked = post.isPremium && !isPremium;

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-lg transition-all duration-300 group
        ${post.isPremium
          ? 'border border-red-600/60 shadow-red-900/30 hover:shadow-red-700/40 hover:border-red-500'
          : 'border border-gray-800 hover:border-gray-600'
        }
        bg-gradient-to-b from-gray-900 to-black hover:shadow-xl`}
    >
      {post.isPremium && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-700 via-red-500 to-red-700 z-20" />
      )}

      <div className="relative overflow-hidden">
        <img
          src={post.image}
          alt={post.title}
          className={`w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105 ${isLocked ? 'blur-sm scale-105' : ''}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {post.isPremium ? (
            <span className="flex items-center gap-1 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold shadow">
              <Crown className="w-3 h-3" /> Premium
            </span>
          ) : (
            <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-semibold shadow">
              {t('common.free')}
            </span>
          )}
          {locationLabel && (
            <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium border border-white/10">
              {locationLabel}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold mb-2 font-poppins text-white leading-snug">{post.title}</h3>

        <div className="relative mb-4">
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
            {post.content}
          </p>
          {isLocked && (
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black to-transparent pointer-events-none" />
          )}
        </div>

        <div className="pt-2 border-t border-gray-800 space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-base">
                {emoji}
              </div>
              <div>
                <p className="text-gray-300 text-xs font-medium leading-tight">{alias}</p>
                <p className="text-gray-600 text-[10px]">{t('common.anonymous')}</p>
              </div>
            </div>
            {isLocked ? (
              <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
                <Lock className="w-3 h-3" />
                <span>Premium</span>
              </div>
            ) : (
              <Link href="/secret-blog" className="flex items-center gap-1 text-red-500 hover:text-red-400 font-semibold text-xs transition-colors">
                <BookOpen className="w-3.5 h-3.5" />
                {t('common.readMore')}
              </Link>
            )}
          </div>
          {isLocked && (
            <Link href="#premium-features">
              <Button size="sm" className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg">
                {t('blog.upgradeToAccess')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function BrideCard({ post, isPremium, t }: { post: BlogPost; isPremium: boolean; t: (k: string) => string }) {
  const alias = getAnonymousAlias(post.id, 'bride');
  const emoji = getAvatarEmoji(post.id, 'bride');
  const locationLabel = post.location
    ? (DESTINATIONS_MAP[post.location] ?? `📍 ${post.location}`)
    : extractLocation(post.title);
  const isLocked = post.isPremium && !isPremium;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-lg transition-all duration-300 group
        ${post.isPremium
          ? 'border border-purple-400/40 shadow-purple-900/20 hover:shadow-purple-500/30 hover:border-purple-400/60'
          : 'border border-pink-200/20 hover:border-pink-300/30'
        }
        bg-gradient-to-b from-[#1a0f2e] to-[#0f0a1e] hover:shadow-xl`}
    >
      {post.isPremium && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 z-20" />
      )}

      <div className="relative overflow-hidden">
        <img
          src={post.image}
          alt={post.title}
          className={`w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105 ${isLocked ? 'blur-sm scale-105' : ''}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f2e]/80 to-transparent" />

        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {post.isPremium ? (
            <span className="flex items-center gap-1 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold shadow">
              <Crown className="w-3 h-3" /> Premium
            </span>
          ) : (
            <span className="bg-pink-500 text-white text-xs px-2 py-1 rounded-full font-semibold shadow">
              {t('common.free')}
            </span>
          )}
          {locationLabel && (
            <span className="bg-black/50 backdrop-blur-sm text-pink-100 text-xs px-2 py-1 rounded-full font-medium border border-purple-400/20">
              {locationLabel}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold mb-2 font-poppins text-white leading-snug">{post.title}</h3>

        <div className="relative mb-4">
          <p className="text-purple-100/70 text-sm leading-relaxed line-clamp-3">
            {post.content}
          </p>
          {isLocked && (
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0f0a1e] to-transparent pointer-events-none" />
          )}
        </div>

        <div className="pt-2 border-t border-purple-800/30 space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-900/50 border border-purple-500/30 rounded-full flex items-center justify-center text-base">
                {emoji}
              </div>
              <div>
                <p className="text-purple-100 text-xs font-medium leading-tight">{alias}</p>
                <p className="text-purple-400/50 text-[10px]">{t('common.anonymous')}</p>
              </div>
            </div>
            {isLocked ? (
              <div className="flex items-center gap-1 text-yellow-400/80 text-xs font-medium">
                <Lock className="w-3 h-3" />
                <span>Premium</span>
              </div>
            ) : (
              <Link href="/secret-blog" className="flex items-center gap-1 text-pink-400 hover:text-pink-300 font-semibold text-xs transition-colors">
                <BookOpen className="w-3.5 h-3.5" />
                {t('common.readMore')}
              </Link>
            )}
          </div>
          {isLocked && (
            <Link href="#premium-features">
              <Button size="sm" className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 text-white text-xs font-bold rounded-lg">
                {t('blog.upgradeToAccess')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function CardSkeleton({ brand }: { brand: Brand }) {
  const bg = brand === 'bride' ? 'bg-[#1a0f2e]' : 'bg-gray-900';
  return (
    <div className={`${bg} rounded-xl overflow-hidden shadow-md border border-white/5`}>
      <Skeleton className="h-48 w-full" />
      <div className="p-5">
        <Skeleton className="h-5 w-3/4 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-4" />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function SecretBlog({ brand = 'bro' }: SecretBlogProps) {
  const { user } = useAuth();
  const isPremium = user?.isPremium || false;
  const { t } = useTranslation();
  const isBride = brand === 'bride';
  const subtitle = isBride ? t('blog.bride.subtitle') : t('blog.bro.subtitle');

  const { data: blogPosts, isLoading, error } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog-posts"],
  });

  const sectionBg = isBride
    ? 'bg-gradient-to-b from-[#0a0515] via-[#0f0a1e] to-[#0a0515]'
    : 'bg-black';

  const titleAccent = isBride ? 'text-pink-400' : 'text-red-500';
  const titleEmoji = isBride ? '👑' : '🔥';
  const ctaClass = isBride
    ? 'bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 text-white'
    : 'bg-gradient-to-r from-red-700 to-red-600 hover:opacity-90 text-white';
  const viewAllClass = isBride
    ? 'border border-purple-500/60 text-purple-300 hover:bg-purple-600 hover:text-white hover:border-purple-600'
    : 'border border-red-600 text-red-500 hover:bg-red-600 hover:text-white';

  if (isLoading) {
    return (
      <section className={`py-20 ${sectionBg}`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div>
              <Skeleton className="h-10 w-56 mb-3" />
              <Skeleton className="h-5 w-80" />
            </div>
            <Skeleton className="h-11 w-44" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[1, 2, 3].map((i) => <CardSkeleton key={i} brand={brand} />)}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`py-20 ${sectionBg}`}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold font-poppins mb-3 text-white">{t('blog.title')}</h2>
          <p className="text-red-500">{t('blog.errorLoading')}</p>
        </div>
      </section>
    );
  }

  const freePosts = blogPosts?.filter(post => !post.isPremium) || [];
  const premiumPosts = blogPosts?.filter(post => post.isPremium) || [];
  const totalStories = (blogPosts?.length || 0) + 197;

  const CardComponent = isBride ? BrideCard : BroCard;

  return (
    <section className={`py-20 ${sectionBg} relative overflow-hidden`}>
      {isBride && (
        <>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-pink-900/10 rounded-full blur-3xl pointer-events-none" />
        </>
      )}
      {!isBride && (
        <div className="absolute top-10 right-10 w-72 h-72 bg-red-900/5 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-semibold uppercase tracking-widest ${titleAccent}`}>
                {titleEmoji} Secret Blog
              </span>
            </div>
            <h2 className={`text-3xl md:text-4xl font-bold font-poppins mb-3 text-white`}>
              {t('blog.title')}
            </h2>
            <p className={`max-w-xl text-sm leading-relaxed ${isBride ? 'text-purple-200/60' : 'text-gray-400'}`}>
              {subtitle}
            </p>
            <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${isBride ? 'text-pink-400/80' : 'text-red-500/80'}`}>
              <Flame className="w-3.5 h-3.5" />
              <span>Oltre {totalStories} storie anonime condivise</span>
            </div>
          </div>

          <div className="shrink-0">
            {!isPremium && (
              <Link href="#premium-features">
                <Button className={`${ctaClass} font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all`}>
                  {t('blog.unlockPremium')}
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {freePosts.slice(0, 2).map((post) => (
            <CardComponent key={post.id} post={post} isPremium={isPremium} t={t} />
          ))}
          {premiumPosts.slice(0, 1).map((post) => (
            <CardComponent key={post.id} post={post} isPremium={isPremium} t={t} />
          ))}
        </div>

        <div className="text-center">
          <Link href="/secret-blog">
            <Button
              variant="outline"
              className={`${viewAllClass} font-bold py-2.5 px-8 rounded-xl transition-all duration-300`}
            >
              {t('blog.viewAllStories')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
