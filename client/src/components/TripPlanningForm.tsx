import { useState, useEffect, useRef } from "react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Destination, Experience } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useLocation } from "wouter";

const formSchema = z.object({
  name: z.string().min(2, "Trip name must be at least 2 characters"),
  participants: z.number().min(1, "Must have at least 1 participant").max(30, "Maximum 30 participants"),
  startDate: z.string().nonempty("Start date is required"),
  endDate: z.string().nonempty("End date is required"),
  departureCity: z.string().nonempty("Please select a departure city"),
  destinations: z.array(z.string()).nonempty("Select at least one destination"),
  experienceType: z.string().nonempty("Please select an experience type"),
  budget: z.number().min(200, "Minimum budget is €200").max(2000, "Maximum budget is €2000"),
  activities: z.array(z.string()).nonempty("Select at least one activity"),
  specialRequests: z.string().optional(),
  includeMerch: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const departureCities = [
  { value: "london", label: "London" },
  { value: "paris", label: "Paris" },
  { value: "berlin", label: "Berlin" },
  { value: "rome", label: "Rome" },
  { value: "madrid", label: "Madrid" },
  { value: "amsterdam", label: "Amsterdam" },
];

const activities = [
  { value: "nightclubs", label: "Nightclubs" },
  { value: "barCrawl", label: "Bar Crawl" },
  { value: "waterSports", label: "Water Sports" },
  { value: "breweryTours", label: "Brewery Tours" },
  { value: "sightseeing", label: "Sightseeing" },
  { value: "foodTours", label: "Food Tours" },
  { value: "sportsEvents", label: "Sports Events" },
  { value: "boatParties", label: "Boat Parties" },
  { value: "casinoNight", label: "Casino Night" },
];

export default function TripPlanningForm() {
  const [step, setStep] = useState(1);
  const [budgetDisplay, setBudgetDisplay] = useState("800");
  const formRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  // Fetch destinations and experience types
  const { data: destinations } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const { data: experiences } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      participants: 6,
      startDate: "",
      endDate: "",
      departureCity: "",
      destinations: [],
      experienceType: "",
      budget: 800,
      activities: [],
      specialRequests: "",
      includeMerch: false,
    },
  });

  // Handle form progress
  const goToNextStep = () => {
    if (step === 1) {
      const basicFields = ["name", "participants", "startDate", "endDate", "departureCity"];
      const basicValid = basicFields.every(fieldName => 
        !form.formState.errors[fieldName as keyof FormValues]);
      
      if (basicValid) {
        setStep(2);
      } else {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
      }
    } else if (step === 2) {
      const detailFields = ["destinations", "experienceType", "budget"];
      const detailsValid = detailFields.every(fieldName => 
        !form.formState.errors[fieldName as keyof FormValues]);
      
      if (detailsValid) {
        setStep(3);
      } else {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
      }
    }
  };

  const goToPreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please login or register to save your trip.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const tripData = {
        ...data,
        userId: user?.id
      };
      
      const response = await apiRequest("POST", "/api/trips", tripData);
      const trip = await response.json();
      
      toast({
        title: "Trip saved!",
        description: "Your trip has been created. Generating itineraries...",
      });
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: [`/api/trips/user/${user?.id}`] });
      
      // Generate itineraries before redirecting
      await apiRequest("GET", `/api/trips/${trip.id}/itineraries`);
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${trip.id}/itineraries`] });
      
      // Redirect to the itinerary page
      setLocation(`/itinerary/${trip.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "There was a problem saving your trip. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update budget display when slider changes
  useEffect(() => {
    const budgetValue = form.watch("budget");
    setBudgetDisplay(budgetValue.toString());
  }, [form.watch("budget")]);

  // Scroll to top of form when changing steps
  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  // Define step indicators based on current step
  const stepOneActive = step >= 1;
  const stepTwoActive = step >= 2;
  const stepThreeActive = step >= 3;
  const progressOneTwo = step >= 2 ? "100%" : "0%";
  const progressTwoThree = step >= 3 ? "100%" : "0%";

  return (
    <section id="trip-planning" className="py-16 bg-white" ref={formRef}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3">Plan Your Trip</h2>
            <p className="text-gray-600">Tell us what you're looking for and we'll create the perfect bachelor party itinerary.</p>
          </div>
          
          <div className="bg-white shadow-xl rounded-xl overflow-hidden">
            {/* Progress Steps */}
            <div className="bg-gray-50 p-4 border-b">
              <div className="flex justify-between">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${stepOneActive ? 'bg-primary' : 'bg-gray-300'} text-white flex items-center justify-center font-bold`}>1</div>
                  <span className="text-xs mt-1 font-medium">Basics</span>
                </div>
                <div className="w-full max-w-[80px] flex items-center">
                  <div className="h-1 w-full bg-gray-300 rounded">
                    <div className="h-1 w-full bg-primary rounded transition-all duration-300" style={{ width: progressOneTwo }}></div>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${stepTwoActive ? 'bg-primary' : 'bg-gray-300'} text-white flex items-center justify-center font-bold`}>2</div>
                  <span className={`text-xs mt-1 font-medium ${stepTwoActive ? 'text-dark' : 'text-gray-500'}`}>Details</span>
                </div>
                <div className="w-full max-w-[80px] flex items-center">
                  <div className="h-1 w-full bg-gray-300 rounded">
                    <div className="h-1 bg-primary rounded transition-all duration-300" style={{ width: progressTwoThree }}></div>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${stepThreeActive ? 'bg-primary' : 'bg-gray-300'} text-white flex items-center justify-center font-bold`}>3</div>
                  <span className={`text-xs mt-1 font-medium ${stepThreeActive ? 'text-dark' : 'text-gray-500'}`}>Activities</span>
                </div>
              </div>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                {/* Step 1: Basics */}
                {step === 1 && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trip Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Mike's Last Ride" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="participants"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Participants</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="30" 
                                placeholder="6" 
                                {...field}
                                onChange={e => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mb-6">
                      <FormLabel className="block text-sm font-medium text-gray-700 mb-2">When are you planning to go?</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="block text-xs text-gray-500 mb-1">Start Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
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
                              <FormLabel className="block text-xs text-gray-500 mb-1">End Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <FormField
                        control={form.control}
                        name="departureCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Where are you traveling from?</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your departure city" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {departureCities.map((city) => (
                                  <SelectItem key={city.value} value={city.value}>
                                    {city.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        type="button" 
                        className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-accent"
                        onClick={goToNextStep}
                      >
                        Next Step
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Step 2: Details */}
                {step === 2 && (
                  <div className="p-6">
                    <div className="mb-6">
                      <FormField
                        control={form.control}
                        name="destinations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="block text-sm font-medium text-gray-700 mb-2">Destination Preferences</FormLabel>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {destinations?.map((destination) => (
                                <div key={destination.id} className="relative">
                                  <input 
                                    type="checkbox" 
                                    id={`dest-${destination.id}`} 
                                    className="peer absolute opacity-0 w-0 h-0"
                                    value={destination.name}
                                    checked={field.value?.includes(destination.name)}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const newValues = e.target.checked
                                        ? [...(field.value || []), value]
                                        : (field.value || []).filter(v => v !== value);
                                      field.onChange(newValues);
                                    }}
                                  />
                                  <label 
                                    htmlFor={`dest-${destination.id}`} 
                                    className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer transition-all hover:border-primary peer-checked:border-primary peer-checked:bg-primary/5"
                                  >
                                    <span className="w-5 h-5 border border-gray-300 rounded flex-shrink-0 flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-all mr-3">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </span>
                                    <span>{destination.name}</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mb-6">
                      <FormField
                        control={form.control}
                        name="experienceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="block text-sm font-medium text-gray-700 mb-2">Experience Type</FormLabel>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {experiences?.map((experience) => (
                                <div key={experience.id} className="relative">
                                  <input 
                                    type="radio" 
                                    id={`exp-${experience.id}`} 
                                    name="experienceType"
                                    className="peer absolute opacity-0 w-0 h-0"
                                    value={experience.name}
                                    checked={field.value === experience.name}
                                    onChange={() => field.onChange(experience.name)}
                                  />
                                  <label 
                                    htmlFor={`exp-${experience.id}`} 
                                    className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer transition-all hover:border-primary peer-checked:border-primary peer-checked:bg-primary/5"
                                  >
                                    <span className="w-5 h-5 border border-gray-300 rounded-full flex-shrink-0 flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-all mr-3">
                                      <span className="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100"></span>
                                    </span>
                                    <div>
                                      <span className="font-medium block">{experience.name}</span>
                                      <span className="text-gray-500 text-sm">{experience.description}</span>
                                    </div>
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mb-6">
                      <FormField
                        control={form.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="block text-sm font-medium text-gray-700 mb-2">Budget Range (per person)</FormLabel>
                            <div className="px-3">
                              <FormControl>
                                <Slider
                                  min={200}
                                  max={2000}
                                  step={100}
                                  defaultValue={[field.value]}
                                  onValueChange={(value) => field.onChange(value[0])}
                                />
                              </FormControl>
                              <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>€200</span>
                                <span>€2000+</span>
                              </div>
                              <div className="text-center mt-2">
                                <span className="text-sm font-medium">Selected: €{budgetDisplay}</span>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="border border-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg hover:bg-gray-50"
                        onClick={goToPreviousStep}
                      >
                        Back
                      </Button>
                      <Button 
                        type="button" 
                        className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-accent"
                        onClick={goToNextStep}
                      >
                        Next Step
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Step 3: Activities */}
                {step === 3 && (
                  <div className="p-6">
                    <div className="mb-6">
                      <FormField
                        control={form.control}
                        name="activities"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="block text-sm font-medium text-gray-700 mb-2">Activity Preferences</FormLabel>
                            <FormDescription className="text-gray-500 text-sm mb-3">Select the activities you're interested in (select all that apply)</FormDescription>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {activities.map((activity) => (
                                <div key={activity.value} className="relative">
                                  <input 
                                    type="checkbox" 
                                    id={`act-${activity.value}`} 
                                    className="peer absolute opacity-0 w-0 h-0"
                                    value={activity.value}
                                    checked={field.value?.includes(activity.value)}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const newValues = e.target.checked
                                        ? [...(field.value || []), value]
                                        : (field.value || []).filter(v => v !== value);
                                      field.onChange(newValues);
                                    }}
                                  />
                                  <label 
                                    htmlFor={`act-${activity.value}`} 
                                    className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer transition-all hover:border-primary peer-checked:border-primary peer-checked:bg-primary/5"
                                  >
                                    <span className="w-5 h-5 border border-gray-300 rounded flex-shrink-0 flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-all mr-3">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </span>
                                    <div>
                                      <span className="font-medium block">{activity.label}</span>
                                    </div>
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mb-6">
                      <FormField
                        control={form.control}
                        name="specialRequests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Requests</FormLabel>
                            <FormControl>
                              <Textarea 
                                rows={3} 
                                placeholder="Any specific requests or things to avoid?" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mb-6">
                      <FormField
                        control={form.control}
                        name="includeMerch"
                        render={({ field }) => (
                          <FormItem className="flex items-start space-x-2">
                            <FormControl>
                              <input 
                                type="checkbox" 
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-1"
                                checked={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <div>
                              <FormLabel>Include custom t-shirts for all participants</FormLabel>
                              <FormDescription className="text-xs text-gray-500 mt-1">
                                Each participant will receive a custom t-shirt with your trip design
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="border border-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg hover:bg-gray-50"
                        onClick={goToPreviousStep}
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-accent"
                      >
                        Generate Itinerary
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}
