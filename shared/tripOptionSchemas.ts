import { z } from "zod";

export const tripOptionCategorySchema = z.enum(["flight", "hotel", "activities"]);
export const tripOptionUrlSchema = z.string().trim().max(2048).url().refine((value) => {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch { return false; }
}, "Use a public HTTP or HTTPS link");

export const tripOptionInputSchema = z.object({
  category: tripOptionCategorySchema,
  url: tripOptionUrlSchema,
  title: z.string().trim().min(1).max(160),
  source: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  imageUrl: tripOptionUrlSchema.nullable().optional(),
  priceNote: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
}).strict();

export const tripOptionPatchSchema = tripOptionInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);
export const tripOptionPreviewRequestSchema = z.object({ url: tripOptionUrlSchema }).strict();
export const tripOptionPreviewSchema = z.object({
  url: tripOptionUrlSchema,
  source: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  imageUrl: tripOptionUrlSchema.nullable(),
  available: z.boolean(),
}).strict();
export type TripOptionInput = z.infer<typeof tripOptionInputSchema>;
export type TripOptionPatch = z.infer<typeof tripOptionPatchSchema>;
export type TripOptionPreview = z.infer<typeof tripOptionPreviewSchema>;
