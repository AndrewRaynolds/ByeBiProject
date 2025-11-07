import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Music, Ship, Utensils, PartyPopper, Car, Waves, Flame, Beer, MapPin, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const activityFormSchema = z.object({
  destination: z.string().min(1, "Select a destination"),
  month: z.string().min(1, "Select a month"),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

interface ActivitySuggestion {
  name: string;
  description: string;
  icon: string;
  venues: string[];
}

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

const destinations = [
  'Roma',
  'Ibiza',
  'Barcellona',
  'Praga',
  'Budapest',
  'Cracovia',
  'Amsterdam',
  'Berlino',
  'Lisbona',
  'Palma de Mallorca',
];

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function ActivityIdeasCompact() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      destination: '',
      month: '',
    },
  });

  const onSubmit = async (data: ActivityFormValues) => {
    setIsLoading(true);
    setSuggestions([]);

    try {
      // Create fake dates for the API (using the selected month)
      const year = new Date().getFullYear();
      const monthIndex = months.indexOf(data.month);
      const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-28`;

      const response = await fetch('/api/chat/activity-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: data.destination,
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const result = await response.json();
      setSuggestions(result.suggestions || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error getting activity suggestions:', error);
      toast({
        title: 'Error',
        description: 'Unable to get activity suggestions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-300" />
          <h3 className="text-white font-bold text-lg">Get Trip Ideas</h3>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Destination</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger 
                        className="bg-white/95 border-white/30 text-gray-900"
                        data-testid="select-destination-compact"
                      >
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {destinations.map((dest) => (
                        <SelectItem key={dest} value={dest}>
                          {dest}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-200" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Travel Month</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger 
                        className="bg-white/95 border-white/30 text-gray-900"
                        data-testid="select-month-compact"
                      >
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-200" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
              disabled={isLoading}
              data-testid="button-generate-compact"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Get Activity Ideas'
              )}
            </Button>
          </form>
        </Form>
      </div>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Activity Ideas for {form.getValues('destination')}
            </DialogTitle>
          </DialogHeader>
          
          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {suggestions.map((activity, index) => {
                const IconComponent = iconMap[activity.icon] || PartyPopper;
                return (
                  <Card
                    key={index}
                    className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-red-500"
                    data-testid={`card-activity-compact-${index}`}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                          <IconComponent className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-base">{activity.name}</CardTitle>
                      </div>
                      <CardDescription className="text-sm">{activity.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {activity.venues && activity.venues.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
                            Recommended venues:
                          </p>
                          <ul className="space-y-1">
                            {activity.venues.map((venue, vIndex) => (
                              <li
                                key={vIndex}
                                className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2"
                              >
                                <span className="text-red-500 mt-0.5">•</span>
                                <span>{venue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
