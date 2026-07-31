import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Star, Clock, Send, Flame, ChevronRight, ChevronLeft, Eye, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

type CategoryFilter = 'drink' | 'weird' | null;

const CATEGORY_FILTERS: { value: CategoryFilter; icon: string; label: string }[] = [
  { value: null, icon: '', label: 'secretBlog.filters.all' },
  { value: 'drink', icon: '🍺', label: 'secretBlog.filters.drink' },
  { value: 'weird', icon: '🤪', label: 'secretBlog.filters.weird' },
];

interface PostGridProps {
  posts: BlogPost[];
  brand: Brand;
  t: (k: string, params?: Record<string, string | number>) => string;
  filterLocation: string | null;
  filterCategory: CategoryFilter;
}

function PostGrid({ posts, brand, t, filterLocation, filterCategory }: PostGridProps) {
  const filtered = posts.filter(p => {
    const locationMatch = filterLocation ? p.location === filterLocation : true;
    const categoryMatch = filterCategory
      ? p.category === filterCategory || !p.category
      : true;
    return locationMatch && categoryMatch;
  });

  const CardComponent = brand === 'bride' ? BrideCard : BroCard;

  if (filtered.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">{t('secretBlog.emptyFilteredTitle')}</p>
        <p className="text-gray-600 text-sm mt-1">{t('secretBlog.emptyFilteredDesc')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filtered.map((post) => (
        <CardComponent key={post.id} post={post} t={t} />
      ))}
    </div>
  );
}

interface StoryFormProps {
  isAuthenticated: boolean;
  brand: Brand;
  t: (k: string, params?: Record<string, string | number>) => string;
}

type Category = 'drink' | 'weird';

const CATEGORY_OPTIONS: { value: Category; icon: string; label: string; desc: string }[] = [
  { value: 'drink', icon: '🍺', label: 'secretBlog.category.drink', desc: 'secretBlog.category.drinkDesc' },
  { value: 'weird', icon: '🤪', label: 'secretBlog.category.weird', desc: 'secretBlog.category.weirdDesc' },
];

export function StoryForm({ isAuthenticated, brand, t }: StoryFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [storyContent, setStoryContent] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const isBride = brand === 'bride';
  const alias = useMemo(() => getAnonymousAlias(Math.floor(Math.random() * 8) + 1, brand), [brand]);
  const emoji = useMemo(() => getAvatarEmoji(Math.floor(Math.random() * 8) + 1, brand), [brand]);

  const autoTitle = useMemo(() => {
    const tagsText = selectedTags.length > 0 ? ` ${selectedTags.join(' ')}` : '';
    return t('secretBlog.autoTitle', { destination: selectedDestination, alias, tags: tagsText });
  }, [selectedDestination, alias, selectedTags, t]);

  const resolvedTitle = customTitle.trim() !== '' ? customTitle.trim() : autoTitle;

  const accentColor = isBride ? 'from-purple-600 to-pink-500' : 'from-red-700 to-red-600';
  const accentText = isBride ? 'text-pink-400' : 'text-red-400';
  const borderAccent = isBride ? 'border-purple-500/40' : 'border-red-600/40';

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDestination("");
    setStoryContent("");
    setCustomTitle("");
    setSelectedCategory('');
    setSelectedTags([]);
    setShowPreview(false);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/blog-posts", {
        title: resolvedTitle,
        content: storyContent,
        location: selectedDestination,
        category: selectedCategory,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
      toast({
        title: t('secretBlog.toastPublishedTitle'),
        description: t('secretBlog.toastPublishedDesc'),
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('secretBlog.toastPublishError'),
        variant: "destructive",
      });
    },
  });

  const stepLabels = [
    t('secretBlog.stepDestination'),
    t('secretBlog.stepStory'),
    t('secretBlog.stepCategory'),
    t('secretBlog.stepTags'),
  ];

  if (!isAuthenticated) {
    return (
      <div className={`rounded-2xl border ${borderAccent} bg-gray-950 p-8 text-center`}>
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
          <LogIn className={`w-6 h-6 ${accentText}`} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{t('secretBlog.authTitle')}</h3>
        <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
          {t('secretBlog.authDesc')}
        </p>
        <Link href="/auth">
          <Button className={`bg-gradient-to-r ${accentColor} hover:opacity-90 text-white font-bold px-8 py-2.5 rounded-xl`}>
            {t('secretBlog.authCta')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${borderAccent} bg-gray-950 overflow-hidden`}>
      <div className={`bg-gradient-to-r ${accentColor} p-5`}>
        <h2 className="text-xl font-bold text-white mb-1">{t('secretBlog.formTitle')}</h2>
        <p className="text-white/70 text-sm">{t('secretBlog.formSubtitle')}</p>
      </div>

      <div className="p-6">
        <ol className="flex items-center gap-2 mb-6" aria-label={t('secretBlog.formTitle')}>
          {stepLabels.map((label, i) => (
            <li
              key={i}
              className="flex items-center gap-2 flex-1"
              aria-current={step === i + 1 ? 'step' : undefined}
            >
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
            </li>
          ))}
        </ol>

        {step === 1 && (
          <fieldset>
            <legend className="text-gray-300 text-sm mb-4">{t('secretBlog.destinationQuestion')}</legend>
            <div className="flex flex-wrap gap-2 mb-6">
              {DESTINATIONS.map((dest) => (
                <button
                  type="button"
                  key={dest.value}
                  onClick={() => setSelectedDestination(dest.value)}
                  aria-pressed={selectedDestination === dest.value}
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
              {t('common.continue')} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </fieldset>
        )}

        {step === 2 && (
          <div>
            <label htmlFor="secret-blog-story" className="block text-gray-300 text-sm mb-3">
              {t('secretBlog.storyQuestionPrefix')} <span className={`font-semibold ${accentText}`}>{selectedDestination}</span>. {t('secretBlog.storyPrivacyHint')}
            </label>
            <Textarea
              id="secret-blog-story"
              placeholder=""
              className="min-h-[160px] mb-4 bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 focus:border-red-500 resize-none"
              value={storyContent}
              onChange={(e) => setStoryContent(e.target.value)}
            />
            <div className="mb-4">
              <label htmlFor="secret-blog-title" className="block text-gray-400 text-xs font-medium mb-1.5">
                {t('secretBlog.customTitle')} <span className="text-gray-600">({t('secretBlog.optional')})</span>
              </label>
              <Input
                id="secret-blog-title"
                placeholder={autoTitle}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 focus:border-red-500"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                maxLength={100}
                aria-describedby="secret-blog-title-hint"
              />
              <p id="secret-blog-title-hint" className="text-gray-600 text-[11px] mt-1">{t('secretBlog.autoTitleHint')}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="text-gray-400" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> {t('common.back')}
              </Button>
              <Button
                className={`bg-gradient-to-r ${accentColor} hover:opacity-90 text-white font-bold px-6 rounded-xl`}
                disabled={storyContent.trim().length < 20}
                onClick={() => setStep(3)}
              >
                {t('common.continue')} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <fieldset>
            <legend className="text-gray-300 text-sm mb-5">{t('secretBlog.categoryQuestion')}</legend>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setSelectedCategory(opt.value)}
                  aria-pressed={selectedCategory === opt.value}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
                    ${selectedCategory === opt.value
                      ? `bg-gradient-to-br ${accentColor} border-transparent text-white shadow-lg scale-105`
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800'}`}
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wide">{t(opt.label)}</span>
                  <span className="text-[10px] text-center opacity-70 leading-tight">{t(opt.desc)}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="text-gray-400" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> {t('common.back')}
              </Button>
              <Button
                className={`bg-gradient-to-r ${accentColor} hover:opacity-90 text-white font-bold px-6 rounded-xl`}
                disabled={!selectedCategory}
                onClick={() => setStep(4)}
              >
                {t('common.continue')} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </fieldset>
        )}

        {step === 4 && (
          <div>
            <fieldset>
              <legend className="text-gray-300 text-sm mb-4">{t('secretBlog.tagsQuestion')}</legend>
              <div className="flex flex-wrap gap-2 mb-6">
                {STORY_TAGS.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={selectedTags.includes(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-mono transition-all border
                      ${selectedTags.includes(tag)
                        ? `bg-gradient-to-r ${accentColor} text-white border-transparent`
                        : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex gap-3 mb-6">
              <Button variant="ghost" className="text-gray-400" onClick={() => setStep(3)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> {t('common.back')}
              </Button>
              <Button
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                onClick={() => setShowPreview(!showPreview)}
                aria-expanded={showPreview}
                aria-controls="secret-blog-preview"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? t('secretBlog.hidePreview') : t('secretBlog.showPreview')}
              </Button>
              <Button
                className={`bg-gradient-to-r ${accentColor} hover:opacity-90 text-white font-bold px-6 rounded-xl`}
                disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                <Send className="w-4 h-4 mr-2" />
                {submitMutation.isPending ? t('secretBlog.publishing') : t('secretBlog.publishAnonymous')}
              </Button>
            </div>

            {showPreview && (
              <div id="secret-blog-preview" className={`rounded-xl border ${borderAccent} bg-gray-900 overflow-hidden`}>
                <div className="h-24 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                  <span className="text-4xl opacity-40">✨</span>
                  {selectedCategory && (
                    <div className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-base">
                      {selectedCategory === 'drink' ? '🍺' : '🤪'}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isBride ? 'bg-pink-500' : 'bg-emerald-500'} text-white`}>{t('secretBlog.newStory')}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/50 text-gray-300 border border-white/10">
                      {selectedDestination && DESTINATIONS.find(d => d.value === selectedDestination)?.label}
                    </span>
                  </div>
                  <p className="text-white text-sm font-bold mb-1">{resolvedTitle}</p>
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
                      <p className="text-gray-600 text-[10px]">{t('common.anonymous')}</p>
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
  const [filterCategory, setFilterCategory] = useState<CategoryFilter>(null);

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

  const totalStories = blogPosts?.length ?? 0;

  const accentColor = isBride ? 'from-purple-600 to-pink-500' : 'from-red-700 to-red-600';
  const accentText = isBride ? 'text-pink-400' : 'text-red-400';

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />

      <main id="main-content" tabIndex={-1} className="flex-grow">
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
              <span>{isBride ? t('secretBlog.heroEyebrowBride') : t('secretBlog.heroEyebrowBro')}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-poppins text-white mb-4 leading-tight">
              {isBride ? t('secretBlog.heroTitleBride') : t('secretBlog.heroTitleBro')}
            </h1>
            <p className={`max-w-2xl mx-auto text-base leading-relaxed mb-6 ${isBride ? 'text-purple-200/60' : 'text-gray-400'}`}>
              {isBride
                ? t('secretBlog.heroSubtitleBride')
                : t('secretBlog.heroSubtitleBro')}
            </p>
            <div className={`flex items-center justify-center gap-1.5 text-sm font-medium mb-8 ${isBride ? 'text-pink-400/70' : 'text-red-500/70'}`}>
              <Flame className="w-4 h-4" />
              <span>{t('blog.storyCount', { count: totalStories })}</span>
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
                  <Star className="mr-2 h-4 w-4" /> {t('secretBlog.popular')}
                </TabsTrigger>
                <TabsTrigger
                  value="newest"
                  className={isBride
                    ? 'data-[state=active]:text-purple-300 data-[state=active]:bg-gray-800'
                    : 'data-[state=active]:text-red-400 data-[state=active]:bg-gray-800'}
                >
                  <Clock className="mr-2 h-4 w-4" /> {t('secretBlog.newest')}
                </TabsTrigger>
              </TabsList>

            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              {availableLocations.length > 0 && (
                <div className="flex flex-wrap gap-2 flex-1">
                  <button
                    onClick={() => setFilterLocation(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                      ${!filterLocation
                        ? `bg-gradient-to-r ${accentColor} text-white border-transparent`
                        : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                  >
                    {t('secretBlog.filters.all')}
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

              <div className="flex gap-2 shrink-0">
                {CATEGORY_FILTERS.map(cat => (
                  <button
                    key={String(cat.value)}
                    onClick={() => setFilterCategory(filterCategory === cat.value ? null : cat.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5
                      ${filterCategory === cat.value
                        ? `bg-gradient-to-r ${accentColor} text-white border-transparent`
                        : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                  >
                    {cat.icon && <span>{cat.icon}</span>}
                    <span>{t(cat.label)}</span>
                  </button>
                ))}
              </div>
            </div>

            <TabsContent value="popular">
              {isLoading ? (
                <PostGridSkeleton />
              ) : error ? (
                <div className="text-center py-10">
                  <p className="text-red-500">{t('secretBlog.errorLoading')}</p>
                </div>
              ) : (
                <PostGrid
                  posts={popularPosts}
                  brand={brand}
                  t={t}
                  filterLocation={filterLocation}
                  filterCategory={filterCategory}
                />
              )}
            </TabsContent>

            <TabsContent value="newest">
              {isLoading ? (
                <PostGridSkeleton />
              ) : error ? (
                <div className="text-center py-10">
                  <p className="text-red-500">{t('secretBlog.errorLoading')}</p>
                </div>
              ) : (
                <PostGrid
                  posts={newestPosts}
                  brand={brand}
                  t={t}
                  filterLocation={filterLocation}
                  filterCategory={filterCategory}
                />
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-16">
            <div className="mb-8 text-center">
              <h2 className={`text-2xl font-bold text-white mb-2`}>
                {isBride ? t('secretBlog.shareTitleBride') : t('secretBlog.shareTitleBro')}
              </h2>
              <p className={`text-sm ${isBride ? 'text-purple-200/50' : 'text-gray-500'}`}>
                {t('secretBlog.shareSubtitle')}
              </p>
            </div>
            <StoryForm
              isAuthenticated={isAuthenticated}
              brand={brand}
              t={t}
            />
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
