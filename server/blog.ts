import { z } from "zod";
import type { InsertBlogPost } from "@shared/schema";

export const blogSubmissionSchema = z.object({
  title: z.string().trim().min(5).max(160),
  content: z.string().trim().min(50).max(5_000),
  location: z.string().trim().min(2).max(100),
  category: z.enum(["sex", "drink", "weird"]),
});

const CATEGORY_IMAGES: Record<
  z.infer<typeof blogSubmissionSchema>["category"],
  string
> = {
  sex: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&h=300&q=80",
  drink:
    "https://images.unsplash.com/photo-1470337458703-46ad1756a1875?auto=format&fit=crop&w=500&h=300&q=80",
  weird:
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=500&h=300&q=80",
};

export function buildPublicBlogPost(input: unknown): InsertBlogPost {
  const submission = blogSubmissionSchema.parse(input);
  return {
    ...submission,
    image: CATEGORY_IMAGES[submission.category],
  };
}
