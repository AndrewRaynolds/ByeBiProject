import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date");

export function getTripDurationDays(startDate: string, endDate: string): number {
  return Math.round(
    (Date.parse(`${endDate}T00:00:00.000Z`) -
      Date.parse(`${startDate}T00:00:00.000Z`)) /
      (24 * 60 * 60 * 1000),
  );
}

export const generatedItineraryRequestSchema = z
  .object({
    destination: z.string().trim().min(2).max(80),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    participants: z.number().int().min(1).max(50),
    eventType: z.string().trim().min(1).max(80),
    selectedExperiences: z
      .array(z.string().trim().min(1).max(100))
      .max(20)
      .optional()
      .default([]),
  })
  .strict()
  .superRefine((value, context) => {
    const durationDays = getTripDurationDays(value.startDate, value.endDate);
    if (durationDays < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after start date",
      });
    } else if (durationDays > 30) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Trip duration cannot exceed 30 days",
      });
    }
  });
