import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Loader2, Music, Ship, Utensils, PartyPopper, Car, Waves, Flame, Beer, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const activityFormSchema = z.object({
  destination: z.string().min(1, "Please select a destination"),
  month: z.string().min(1, "Please select a month"),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

const DESTINATIONS = [
  "Roma", "Ibiza", "Barcellona", "Praga", "Budapest", 
  "Cracovia", "Amsterdam", "Berlino", "Lisbona", "Palma de Mallorca"
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const iconMap: { [key: string]: any } = {
  music: Music,
  ship: Ship,
  utensils: Utensils,
  party: PartyPopper,
  car: Car,
  waves: Waves,
  flame: Flame,
  beer: Beer,
  mappin: MapPin,
};

interface Activity {
  title: string;
  description: string;
  icon: string;
}

export default function ActivityIdeasCompactBride() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Activity[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      destination: '',
      month: '',
    },
  });

  const onSubmit = async (data: ActivityFormValues) => {
    setIsGenerating(true);
    setSuggestions([]);

    try {
      const response = await fetch('/api/chat/activity-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: data.destination,
          month: data.month,
          partyType: 'bachelorette'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const result = await response.json();
      
      if (result.activities && Array.isArray(result.activities)) {
        setSuggestions(result.activities);
        setDialogOpen(true);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-pink-300" />
          <h3 className="text-white font-bold text-lg">Activity Ideas</h3>
        </div>
        
        <p className="text-white/80 text-sm mb-4">
          Get AI-powered activity suggestions instantly
        </p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-white/95 border-white/30 text-gray-900 focus:ring-2 focus:ring-pink-500" data-testid="select-destination-bride">
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {DESTINATIONS.map((dest) => (
                          <SelectItem key={dest} value={dest}>
                            {dest}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-white/95 border-white/30 text-gray-900 focus:ring-2 focus:ring-pink-500" data-testid="select-month-bride">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <Button 
              type="submit"
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              disabled={isGenerating}
              data-testid="button-generate-ideas-bride"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Get Ideas
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="w-6 h-6 text-pink-600" />
              Activity Suggestions for {form.getValues('destination')}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {suggestions.map((activity, index) => {
              const IconComponent = iconMap[activity.icon] || MapPin;
              return (
                <Card key={index} className="border-pink-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-pink-100 p-2 rounded-lg">
                        <IconComponent className="w-5 h-5 text-pink-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{activity.title}</h3>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
