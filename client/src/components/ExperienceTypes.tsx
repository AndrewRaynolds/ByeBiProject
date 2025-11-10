import { useQuery } from "@tanstack/react-query";
import { Experience } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

type Brand = 'bro' | 'bride';

interface ExperienceTypesProps {
  brand?: Brand;
}

const COPY = {
  bro: {
    title: "Choose Your Experience",
    subtitle: "From adrenaline-pumping adventures to relaxing getaways, we've got the perfect experience for every bachelor party."
  },
  bride: {
    title: "Choose Your Experience",
    subtitle: "From adrenaline-pumping adventures to relaxing getaways, we've got the perfect experience for every bachelorette party."
  }
};

const EXPERIENCE_NAME_MAP: Record<string, string> = {
  "The Ultimate BroNight": "The Ultimate BrideNight",
  "My Olympic Bro": "My Olympic Bride",
  "Chill and Feel the Bro": "Chill and Feel the Bride",
  "The Wild Broventure": "The Wild Brideventure"
};

export default function ExperienceTypes({ brand = 'bro' }: ExperienceTypesProps) {
  const { data: experiences, isLoading, error } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
  });
  
  const copy = COPY[brand];
  const mappedExperiences = experiences?.map(exp => ({
    ...exp,
    name: brand === 'bride' && EXPERIENCE_NAME_MAP[exp.name] ? EXPERIENCE_NAME_MAP[exp.name] : exp.name
  }));

  if (isLoading) {
    return (
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-5 w-96 mx-auto mt-3" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-900 rounded-xl overflow-hidden shadow-md">
                <Skeleton className="h-48 w-full" />
                <div className="p-4">
                  <Skeleton className="h-6 w-36 mb-4" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3 text-white">Choose Your Experience</h2>
            <p className="text-red-500">Error loading experiences. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3 text-white">{copy.title}</h2>
          <p className="text-gray-300 max-w-3xl mx-auto">{copy.subtitle}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mappedExperiences?.map((experience) => (
            <div key={experience.id} className="bg-gray-900 rounded-xl overflow-hidden shadow-md group hover:shadow-lg transition duration-300">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={experience.image} 
                  alt={experience.name} 
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                  <div className="p-4">
                    <h3 className="text-white text-xl font-bold font-poppins">{experience.name}</h3>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-gray-300 text-sm">{experience.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
