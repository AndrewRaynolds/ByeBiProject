import { useState } from 'react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const languageFlags = {
  en: '🇬🇧',
  it: '🇮🇹', 
  es: '🇪🇸'
};

const languageNames = {
  en: 'English',
  it: 'Italiano',
  es: 'Español'
};

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-9 px-3 text-white hover:bg-white/10 border border-white/20"
        >
          <span className="text-lg mr-2">{languageFlags[language]}</span>
          <span className="hidden sm:inline text-sm">{languageNames[language]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="min-w-[140px] bg-slate-800 border-slate-700 text-white"
      >
        {Object.entries(languageFlags).map(([lang, flag]) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang as Language)}
            className={`
              flex items-center gap-3 px-3 py-2 cursor-pointer
              hover:bg-slate-700 focus:bg-slate-700
              ${language === lang ? 'bg-slate-700' : ''}
            `}
          >
            <span className="text-lg">{flag}</span>
            <span className="text-sm">{languageNames[lang as Language]}</span>
            {language === lang && (
              <Badge variant="secondary" className="ml-auto text-xs">
                ✓
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}