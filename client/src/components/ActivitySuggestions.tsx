import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Music, Ship, Utensils, PartyPopper, Car, Waves, Flame, Beer, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const activityFormSchema = z.object({
  destination: z.string().min(1, "Seleziona una destinazione"),
  startDate: z.string().min(1, "Inserisci la data di inizio"),
  endDate: z.string().min(1, "Inserisci la data di fine"),
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

export default function ActivitySuggestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);
  const { toast } = useToast();

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      destination: '',
      startDate: '',
      endDate: '',
    },
  });

  const onSubmit = async (data: ActivityFormValues) => {
    setIsLoading(true);
    setSuggestions([]);

    try {
      const response = await fetch('/api/chat/activity-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const result = await response.json();
      setSuggestions(result.suggestions || []);
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

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Activity Ideas Generator
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get personalized activity suggestions for your bachelor/bachelorette party
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Where and when?</CardTitle>
              <CardDescription>
                Select your destination and dates to get customized activity ideas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="destination"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destination</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-destination">
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              data-testid="input-start-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              data-testid="input-end-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700"
                    disabled={isLoading}
                    data-testid="button-generate-ideas"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating ideas...
                      </>
                    ) : (
                      'Get Activity Ideas'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {suggestions.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold mb-6 text-center">
                Suggested Activities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suggestions.map((activity, index) => {
                  const IconComponent = iconMap[activity.icon] || PartyPopper;
                  return (
                    <Card
                      key={index}
                      className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-red-500"
                      data-testid={`card-activity-${index}`}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                            <IconComponent className="w-6 h-6 text-red-600 dark:text-red-400" />
                          </div>
                          <CardTitle className="text-lg">{activity.name}</CardTitle>
                        </div>
                        <CardDescription>{activity.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {activity.venues && activity.venues.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                              Recommended venues:
                            </p>
                            <ul className="space-y-1">
                              {activity.venues.map((venue, vIndex) => (
                                <li
                                  key={vIndex}
                                  className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                                >
                                  <span className="text-red-500 mt-1">•</span>
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
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
