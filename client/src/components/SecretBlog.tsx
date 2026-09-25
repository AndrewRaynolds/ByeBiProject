import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Flame } from "lucide-react";
import { Link } from "wouter";
import { Locale, useTranslation } from "@/contexts/LanguageContext";

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

type LocalizedPost = { title: string; content: string };

const BLOG_POST_COPY: Record<string, {
  sourceContent: string;
  it: LocalizedPost;
  es: LocalizedPost;
}> = {
  "Roma: The Night We Can't Remember": {
    sourceContent: "From Trastevere's wine bars to Testaccio's underground clubs, Rome offers an incredible nightlife scene. We started at a rooftop aperitivo with views of the Colosseum, then ended up in a basement club at 5am. The bachelor had no idea what hit him.",
    it: {
      title: "Roma: la notte che non ricordiamo",
      content: "Dalle enoteche di Trastevere ai club underground di Testaccio, Roma offre una vita notturna incredibile. Abbiamo iniziato con un aperitivo in terrazza vista Colosseo e siamo finiti in un locale sotterraneo alle cinque del mattino. Lo sposo non ha capito cosa gli sia successo.",
    },
    es: {
      title: "Roma: la noche que no recordamos",
      content: "Desde las vinotecas de Trastevere hasta los clubes underground de Testaccio, Roma ofrece una vida nocturna increíble. Empezamos con un aperitivo en una terraza con vistas al Coliseo y acabamos en un club subterráneo a las cinco de la mañana. El novio no supo qué le había pasado.",
    },
  },
  "Ibiza Uncovered: The Ultimate Party Guide": {
    sourceContent: "From Amnesia to Pacha, we break down the best clubs, when to go, and how to do it right. We got VIP access to three clubs in one night, watched the sunrise from a yacht, and somehow everyone made the flight home. Barely.",
    it: {
      title: "Ibiza senza segreti: la guida definitiva alla festa",
      content: "Da Amnesia a Pacha, ecco i club migliori, quando andarci e come vivere la serata al meglio. In una notte siamo entrati da VIP in tre locali, abbiamo visto l'alba da uno yacht e, non si sa come, tutti hanno preso il volo di ritorno. Per un soffio.",
    },
    es: {
      title: "Ibiza al descubierto: la guía definitiva de la fiesta",
      content: "De Amnesia a Pacha, repasamos los mejores clubes, cuándo ir y cómo disfrutar al máximo. En una noche entramos como VIP en tres locales, vimos amanecer desde un yate y, de algún modo, todos llegamos al vuelo de vuelta. Por los pelos.",
    },
  },
  "Cracovia: Eastern Europe's Hidden Gem": {
    sourceContent: "Affordable prices, incredible architecture, and a nightlife scene that rivals any major European city. We spent four days exploring the Old Town by day and the underground clubs by night. The vodka was cheaper than water and twice as dangerous.",
    it: {
      title: "Cracovia: la gemma nascosta dell'Europa dell'Est",
      content: "Prezzi accessibili, architettura incredibile e una vita notturna all'altezza delle grandi città europee. Abbiamo passato quattro giorni tra il centro storico di giorno e i club sotterranei di notte. La vodka costava meno dell'acqua ed era due volte più pericolosa.",
    },
    es: {
      title: "Cracovia: la joya oculta de Europa del Este",
      content: "Precios asequibles, arquitectura increíble y una vida nocturna a la altura de cualquier gran ciudad europea. Pasamos cuatro días recorriendo el casco antiguo de día y los clubes subterráneos de noche. El vodka era más barato que el agua y el doble de peligroso.",
    },
  },
};

export function localizeHomepagePost<T extends { title: string; content: string }>(
  post: T,
  locale: Locale,
): T {
  if (locale === 'en') return post;
  const copy = BLOG_POST_COPY[post.title];
  if (!copy || copy.sourceContent !== post.content) return post;
  return { ...post, ...copy[locale] };
}

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

export function BroCard({ post, t }: { post: BlogPost; t: (k: string) => string }) {
  const alias = getAnonymousAlias(post.id, 'bro');
  const emoji = getAvatarEmoji(post.id, 'bro');
  const locationLabel = post.location
    ? (DESTINATIONS_MAP[post.location] ?? `📍 ${post.location}`)
    : extractLocation(post.title);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
    >
      <div className="relative overflow-hidden">
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
            {t('common.free')}
          </span>
          {locationLabel && (
            <span className="rounded-full border border-border bg-background/80 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
              {locationLabel}
            </span>
          )}
        </div>
        {post.category && (
          <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-base shadow-sm backdrop-blur-sm">
            {post.category === 'sex' ? '🔞' : post.category === 'drink' ? '🍺' : '🤪'}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="mb-2 font-poppins text-lg font-bold leading-snug text-foreground">{post.title}</h3>

        <div className="relative mb-4">
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {post.content}
          </p>
        </div>

        <div className="space-y-2 border-t border-border pt-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-muted text-base">
                {emoji}
              </div>
              <div>
                <p className="text-xs font-medium leading-tight text-foreground">{alias}</p>
                <p className="text-[10px] text-muted-foreground">{t('common.anonymous')}</p>
              </div>
            </div>
            <Link href={`/secret-blog/${post.id}`} className="flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary-hover">
              <BookOpen className="w-3.5 h-3.5" />
              {t('common.readMore')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrideCard({ post, t }: { post: BlogPost; t: (k: string) => string }) {
  const alias = getAnonymousAlias(post.id, 'bride');
  const emoji = getAvatarEmoji(post.id, 'bride');
  const locationLabel = post.location
    ? (DESTINATIONS_MAP[post.location] ?? `📍 ${post.location}`)
    : extractLocation(post.title);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
    >
      <div className="relative overflow-hidden">
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
            {t('common.free')}
          </span>
          {locationLabel && (
            <span className="rounded-full border border-border bg-background/80 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
              {locationLabel}
            </span>
          )}
        </div>
        {post.category && (
          <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-base shadow-sm backdrop-blur-sm">
            {post.category === 'sex' ? '🔞' : post.category === 'drink' ? '🍺' : '🤪'}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="mb-2 font-poppins text-lg font-bold leading-snug text-foreground">{post.title}</h3>

        <div className="relative mb-4">
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {post.content}
          </p>
        </div>

        <div className="space-y-2 border-t border-border pt-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-muted text-base">
                {emoji}
              </div>
              <div>
                <p className="text-xs font-medium leading-tight text-foreground">{alias}</p>
                <p className="text-[10px] text-muted-foreground">{t('common.anonymous')}</p>
              </div>
            </div>
            <Link href={`/secret-blog/${post.id}`} className="flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary-hover">
              <BookOpen className="w-3.5 h-3.5" />
              {t('common.readMore')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
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
  const { locale, t } = useTranslation();
  const isBride = brand === 'bride';
  const subtitle = isBride ? t('blog.bride.subtitle') : t('blog.bro.subtitle');

  const { data: blogPosts, isLoading, error } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog-posts"],
  });

  const titleEmoji = isBride ? '👑' : '🔥';
  if (isLoading) {
    return (
      <section className="bg-background py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div>
              <Skeleton className="h-10 w-56 mb-3" />
              <Skeleton className="h-5 w-80" />
            </div>
            <Skeleton className="h-11 w-44" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-background py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-3 font-poppins text-3xl font-bold text-foreground">{t('blog.title')}</h2>
          <p className="text-destructive">{t('blog.errorLoading')}</p>
        </div>
      </section>
    );
  }

  const visiblePosts = blogPosts?.map((post) => localizeHomepagePost(post, locale)) || [];
  const CardComponent = isBride ? BrideCard : BroCard;

  return (
    <section className="relative overflow-hidden bg-background py-20">
      <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                {titleEmoji} Secret Blog
              </span>
            </div>
            <h2 className="mb-3 font-poppins text-3xl font-bold text-foreground md:text-4xl">
              {t('blog.title')}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary">
              <Flame className="w-3.5 h-3.5" />
              <span>{t('blog.storyLabel')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {visiblePosts.slice(0, 3).map((post) => (
            <CardComponent key={post.id} post={post} t={t} />
          ))}
        </div>

        <div className="text-center">
          <Link href="/secret-blog">
            <Button
              className="font-bold py-2.5 px-8 rounded-xl transition-all duration-300"
            >
              {t('blog.viewAllStories')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
