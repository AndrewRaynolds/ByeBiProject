import { pgTable, text, serial, integer, boolean, timestamp, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Trip model
export const trips = pgTable(
  "trips",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    participants: integer("participants").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    departureCity: text("departure_city").notNull(),
    destinations: text("destinations").array(),
    experienceType: text("experience_type").notNull(),
    budget: integer("budget").notNull(),
    activities: text("activities").array(),
    specialRequests: text("special_requests"),
    includeMerch: boolean("include_merch").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("trips_user_id_idx").on(table.userId)],
);

export const insertTripSchema = createInsertSchema(trips).pick({
  userId: true,
  name: true,
  participants: true,
  startDate: true,
  endDate: true,
  departureCity: true,
  destinations: true,
  experienceType: true,
  budget: true,
  activities: true,
  specialRequests: true,
  includeMerch: true,
});

// Blog post model
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  image: text("image").notNull(),
  isPremium: boolean("is_premium").default(false),
  location: text("location"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).pick({
  title: true,
  content: true,
  image: true,
  isPremium: true,
  location: true,
  category: true,
}).extend({
  category: z.enum(['sex', 'drink', 'weird']),
});

// Destination model
export const destinations = pgTable("destinations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  image: text("image").notNull(),
  description: text("description").notNull(),
  tags: text("tags").array(),
  rating: text("rating").notNull(),
  reviewCount: integer("review_count").notNull(),
});

export const insertDestinationSchema = createInsertSchema(destinations).pick({
  name: true,
  country: true,
  image: true,
  description: true,
  tags: true,
  rating: true,
  reviewCount: true,
});

// Experience model
export const experiences = pgTable("experiences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
});

export const insertExperienceSchema = createInsertSchema(experiences).pick({
  name: true,
  description: true,
  image: true,
});

// Expense Group model (for SplittaBro feature)
export const expenseGroups = pgTable(
  "expense_groups",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    tripId: integer("trip_id").references(() => trips.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    members: json("members").notNull(),
    totalAmount: integer("total_amount").default(0),
    currency: text("currency").default("EUR"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("expense_groups_owner_id_idx").on(table.ownerId),
    index("expense_groups_trip_id_idx").on(table.tripId),
  ],
);

export const insertExpenseGroupSchema = createInsertSchema(expenseGroups).pick({
  tripId: true,
  name: true,
  description: true,
  members: true,
  currency: true,
});

// Expense model (for SplittaBro feature)
export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => expenseGroups.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    paidBy: text("paid_by").notNull(),
    splitBetween: json("split_between").notNull(),
    category: text("category").notNull(),
    date: text("date").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("expenses_group_id_idx").on(table.groupId)],
);

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  groupId: true,
  description: true,
  amount: true,
  paidBy: true,
  splitBetween: true,
  category: true,
  date: true,
});

// Export types
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

export type Destination = typeof destinations.$inferSelect;
export type InsertDestination = z.infer<typeof insertDestinationSchema>;

export type Experience = typeof experiences.$inferSelect;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;

export type ExpenseGroup = typeof expenseGroups.$inferSelect;
export type InsertExpenseGroup = z.infer<typeof insertExpenseGroupSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  sessionId: text("session_id").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});
