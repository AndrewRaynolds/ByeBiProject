import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Star, Clock, Send, Flame, ChevronRight, ChevronLeft, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Brand,
  BroCard,
  BrideCard,
  getAnonymousAlias,
  getAvatarEmoji,
} from "@/components/SecretBlog";
import { useTranslation } from "@/contexts/LanguageContext";

const DESTINATIONS = [
  { label: "🇮🇹 Roma", value: "Roma" },
  { label: "🇪🇸 Ibiza", value: "Ibiza" },
  { label: "🇵🇱 Cracovia", value: "Cracovia" },
  { label: "🇪🇸 Barcellona", value: "Barcellona" },
  { label: "🇳🇱 Amsterdam", value: "Amsterdam" },
  { label: "🇨🇿 Praga", value: "Praga" },
  { label: "🇩🇪 Berlino", value: "Berlino" },
  { label: "🇭🇺 Budapest", value: "Budapest" },
  { label: "🇫🇷 Parigi", value: "Parigi" },
  { label: "🇬🇷 Mykonos", value: "Mykonos" },
  { label: "🇬🇷 Santorini", value: "Santorini" },
  { label: "🇵🇹 Lisbona", value: "Lisbona" },
];

const STORY_TAGS = ["#epico", "#disastro", "#love", "#survival", "#illegale", "#leggendario", "#imbarazzante", "#da-dimenticare"];

function getBrand(): Brand {
  try {
    const saved = localStorage.getItem('selectedBrand');
    return saved === 'byebride' ? 'bride' : 'bro';
  } catch {
    return 'bro';
  }
}

function PostGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
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
      ))}
    </div>
  );
}

interface PostGridProps {
  posts: BlogPost[];
  isPremium: boolean;
  brand: Brand;
  t: (k: string) => string;
  filterLocation: string | null;
}

function PostGrid({ posts, isPremium, brand, t, filterLocation }: PostGridProps) {
  const filtered = filterLocation
    ? posts.filter(p => p.location === filterLocation)
    : posts;

  const CardComponent = brand === 'bride' ? BrideCard : BroCard;

  if (filtered.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">Nessuna storia trovata per questa destinazione.</p>
        <p className="text-gray-600 text-sm mt-1">Prova a selezionare un'altra città.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filtered.map((post) => (
        <CardComponent key={post.id} post={post} isPremium={isPremium} t={t} />
      ))}
    </div>
  );
}

interface StoryFormProps {
  isPremium: boolean;
  isAuthenticated: boolean;
  brand: Brand;
  t: (k: string) => string;
  onScrollToPremium: () => void;
}

function StoryForm({ isPremium, isAuthenticated, brand, t, onScrollToPremium }: StoryFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [storyContent, setStoryContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const isBride = brand === 'bride';
  const alias = useMemo(() => getAnonymousAlias(Math.floor(Math.random() * 8) + 1, brand), [brand]);
  const emoji = useMemo(() => getAvatarEmoji(Math.floor(Math.random() * 8) + 1, brand), [brand]);

  const accentColor = isBride ? 'from-purple-600 to-pink-500' : 'from-red-700 to-red-600';
  const accentText = isBride ? 'text-pink-400' : 'text-red-400';
  const borderAccent = isBride ? 'border-purple-500/40' : 'border-red-600/40';

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    toast({
      title: "Storia inviata! 🎉",
      description: "La tua storia è in fase di revisione. Sarà pubblicata presto!",
    });
    setStep(1);
    setSelectedDestination("");
    setStoryContent("");
    setSelectedTags([]);
    setShowPreview(false);
  };

  const stepLabels = ["Destinazione", "La tua storia", "Tag"];

  return (
    <div className={`rounded-2xl border ${borderAccent} bg-gray-950 overflow-hidden`}>
      <div className={`bg-gradient-to-r ${accentColor} p-5`}>
        <h2 className="text-xl font-bold text-white mb-1">Racconta la tua storia</h2>
        <p className="text-white/70 text-sm">In modo completamente anonimo</p>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step > i + 1 ? `bg-gradient-to-r ${accentColor} text-white` :
                  step === i + 1 ? `bg-gradient-to-r ${accentColor} text-white ring-2 ring-offset-2 ring-offset-gray-950 ${isBride ? 'ring-purple-500' : 'ring-red-500'}` :
                  'bg-gray-800 text-gray-500'}`}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === i + 1 ? 'text-white' : 'text-gray-500'}`}>{label}</span>
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-[1px] ${step > i + 1 ? `bg-gradient-to-r ${accentColor}` : 'bg-gray-800'}`} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <p className="text-gray-300 text-sm mb-4">Dove è successa questa storia epica?</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {DESTINATIONS.map((dest) => (
                <button
                  key={dest.value}
                  onClick={() => setSelectedDestination(dest.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                    ${selectedDestination === dest.value
                      ? `bg-gradient-to-r ${accentColor} text-white border-transparent`
                      : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                >
                  {dest.label}
                </button>
              ))}
            </div>
            <Button
              className={`bg-gradient-to-r ${accentColor} hover:opacity-90 text-white font-bold px-6 rounded-xl`}
              disabled={!selectedDestination}
              onClick={() => setStep(2)}
            >
              Avanti <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-gray-300 text-sm mb-3">
              Racconta cosa è successo a <span className={`font-semibold ${accentText}`}>{selectedDestination}</span>. Nessun nome, nessun dettaglio identificativo.
            </p>
            <Textarea
              placeholder="Era la seconda notte quando il testimone ha deciso di..."
              className="min-h-[160px] mb-4 bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 focus:border-red-500 resize-none"
              value={storyContent}
              onChange={(e) => setStoryContent(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="ghost" className="text-gray-400" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
              </Button>
              <Button
                className={`bg-gradient-to-r ${accentColor} hover:opacity-90 text-white font-bold px-6 rounded-xl`}
                disabled={storyContent.trim().length < 20}
                onClick={() => setStep(3)}
              >
                Avanti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-gray-300 text-sm mb-4">Scegli uno o più tag che descrivono la storia:</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {STORY_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-mono transition-all border
                    ${selectedTags.includes(tag)
                      ? `bg-gradient-to-r ${accentColor} text-white border-transparent`
                      : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mb-6">
              <Button variant="ghost" className="text-gray-400" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
              </Button>
              <Button
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? "Nascondi anteprima" : "Vedi anteprima"}
              </Button>
              <Button
                className={`bg-gradient-to-r ${accentColor} hover:opacity-90 text-white font-bold px-6 rounded-xl`}
                onClick={handleSubmit}
              >
                <Send className="w-4 h-4 mr-2" />
                Invia in forma anonima
              </Button>
            </div>

            {showPreview && (
              <div className={`rounded-xl border ${borderAccent} bg-gray-900 overflow-hidden`}>
                <div className="h-24 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <span className="text-4xl opacity-40">✨</span>
                </div>
                <div className="p-4">
                  <div className="flex gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isBride ? 'bg-pink-500' : 'bg-emerald-500'} text-white`}>Nuova storia</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/50 text-gray-300 border border-white/10">
                      {selectedDestination && DESTINATIONS.find(d => d.value === selectedDestination)?.label}
                    </span>
                  </div>
                  <p className="text-white text-sm font-bold mb-1">La tua storia da {selectedDestination}</p>
                  <p className="text-gray-400 text-xs line-clamp-2 mb-3">{storyContent}</p>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {selectedTags.map(tag => (
                        <span key={tag} className={`text-xs font-mono ${accentText}`}>{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                    <div className={`w-7 h-7 rounded-full ${isBride ? 'bg-purple-900/50' : 'bg-gray-800'} flex items-center justify-center text-sm`}>
                      {emoji}
                    </div>
                    <div>
                      <p className="text-gray-300 text-xs font-medium">{alias}</p>
                      <p className="text-gray-600 text-[10px]">Anonimo</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SecretBlogPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const brand = getBrand();
  const isBride = brand === 'bride';

  const [filterLocation, setFilterLocation] = useState<string | null>(null);

  const { data: blogPosts, isLoading, error } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog-posts"],
  });

  const popularPosts = useMemo(() => blogPosts ?? [], [blogPosts]);
  const newestPosts = useMemo(
    () => [...(blogPosts ?? [])].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }),
    [blogPosts]
  );

  const availableLocations = useMemo(() => {
    if (!blogPosts) return [];
    const locs = new Set<string>();
    blogPosts.forEach(p => {
      if (p.location) locs.add(p.location);
    });
    return Array.from(locs);
  }, [blogPosts]);

  const totalStories = (blogPosts?.length ?? 0) + 197;

  const accentColor = isBride ? 'from-purple-600 to-pink-500' : 'from-red-700 to-red-600';
  const accentText = isBride ? 'text-pink-400' : 'text-red-400';

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />

      <main className="flex-grow">
        <section className="relative overflow-hidden py-28">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: isBride
                ? "url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80')"
                : "url('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80')"
            }}
          />
          <div className={`absolute inset-0 ${isBride ? 'bg-[#0a0515]/85' : 'bg-black/80'}`} />
          {isBride ? (
            <>
              <div className="absolute top-0 left-1/3 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-pink-900/20 rounded-full blur-3xl pointer-events-none" />
            </>
          ) : (
            <>
              <div className="absolute top-0 right-1/4 w-72 h-72 bg-red-900/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />
            </>
          )}

          <div className="container mx-auto px-4 text-center relative">
            <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${accentText} mb-4`}>
              <Flame className="w-3.5 h-3.5" />
              <span>{isBride ? '👑 Secret Diary' : '🔥 Secret Blog'}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-poppins text-white mb-4 leading-tight">
              {isBride ? "Storie Segrete" : "Confessioni Anonime"}
            </h1>
            <p className={`max-w-2xl mx-auto text-base leading-relaxed mb-6 ${isBride ? 'text-purple-200/60' : 'text-gray-400'}`}>
              {isBride
                ? "Storie vere e anonime da addii al nubilato in tutta Europa. Impara dalle esperienze altrui e condividi le tue."
                : "Storie vere e anonime da addii al celibato in tutta Europa. Impara dagli errori altrui. Aggiungine di tuoi."}
            </p>
            <div className={`flex items-center justify-center gap-1.5 text-sm font-medium mb-8 ${isBride ? 'text-pink-400/70' : 'text-red-500/70'}`}>
              <Flame className="w-4 h-4" />
              <span>Oltre {totalStories} storie anonime condivise</span>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <Tabs defaultValue="popular" className="w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
              <TabsList className="bg-gray-900 border border-gray-800">
                <TabsTrigger
                  value="popular"
                  className={isBride
                    ? 'data-[state=active]:text-purple-300 data-[state=active]:bg-gray-800'
                    : 'data-[state=active]:text-red-400 data-[state=active]:bg-gray-800'}
                >
                  <Star className="mr-2 h-4 w-4" /> Più Popolari
                </TabsTrigger>
                <TabsTrigger
                  value="newest"
                  className={isBride
                    ? 'data-[state=active]:text-purple-300 data-[state=active]:bg-gray-800'
                    : 'data-[state=active]:text-red-400 data-[state=active]:bg-gray-800'}
                >
                  <Clock className="mr-2 h-4 w-4" /> Più Recenti
                </TabsTrigger>
              </TabsList>

            </div>

            {availableLocations.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                <button
                  onClick={() => setFilterLocation(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                    ${!filterLocation
                      ? `bg-gradient-to-r ${accentColor} text-white border-transparent`
                      : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                >
                  Tutte
                </button>
                {availableLocations.map(loc => {
                  const destObj = DESTINATIONS.find(d => d.value === loc);
                  return (
                    <button
                      key={loc}
                      onClick={() => setFilterLocation(filterLocation === loc ? null : loc)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                        ${filterLocation === loc
                          ? `bg-gradient-to-r ${accentColor} text-white border-transparent`
                          : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                    >
                      {destObj?.label ?? loc}
                    </button>
                  );
                })}
              </div>
            )}

            <TabsContent value="popular">
              {isLoading ? (
                <PostGridSkeleton />
              ) : error ? (
                <div className="text-center py-10">
                  <p className="text-red-500">Errore nel caricamento delle storie. Riprova più tardi.</p>
                </div>
              ) : (
                <PostGrid
                  posts={popularPosts}
                  isPremium={true}
                  brand={brand}
                  t={t}
                  filterLocation={filterLocation}
                />
              )}
            </TabsContent>

            <TabsContent value="newest">
              {isLoading ? (
                <PostGridSkeleton />
              ) : error ? (
                <div className="text-center py-10">
                  <p className="text-red-500">Errore nel caricamento delle storie. Riprova più tardi.</p>
                </div>
              ) : (
                <PostGrid
                  posts={newestPosts}
                  isPremium={true}
                  brand={brand}
                  t={t}
                  filterLocation={filterLocation}
                />
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-16">
            <div className="mb-8 text-center">
              <h2 className={`text-2xl font-bold text-white mb-2`}>
                {isBride ? "Racconta la tua storia 💌" : "Racconta la tua storia 🔥"}
              </h2>
              <p className={`text-sm ${isBride ? 'text-purple-200/50' : 'text-gray-500'}`}>
                Completamente anonimo. Solo la community ti vedrà.
              </p>
            </div>
            <StoryForm
              isPremium={true}
              isAuthenticated={isAuthenticated}
              brand={brand}
              t={t}
              onScrollToPremium={() => {}}
            />
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
