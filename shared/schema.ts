import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
});

// Trip model
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
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
  createdAt: timestamp("created_at").defaultNow()
});

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

// Itinerary model
export const itineraries = pgTable("itineraries", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  duration: text("duration").notNull(),
  price: integer("price").notNull(),
  image: text("image").notNull(),
  rating: text("rating").notNull(),
  highlights: text("highlights").array(),
  includes: text("includes").array(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertItinerarySchema = createInsertSchema(itineraries).pick({
  tripId: true,
  name: true,
  description: true,
  duration: true,
  price: true,
  image: true,
  rating: true,
  highlights: true,
  includes: true,
});

// Blog post model
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  image: text("image").notNull(),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).pick({
  title: true,
  content: true,
  image: true,
  isPremium: true,
});

// Merchandise model
export const merchandise = pgTable("merchandise", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  image: text("image").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertMerchandiseSchema = createInsertSchema(merchandise).pick({
  name: true,
  description: true,
  price: true,
  image: true,
  type: true,
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
export const expenseGroups = pgTable("expense_groups", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  name: text("name").notNull(),
  participants: json("participants").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertExpenseGroupSchema = createInsertSchema(expenseGroups).pick({
  tripId: true,
  name: true,
  participants: true,
});

// Expense model (for SplittaBro feature)
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  paidBy: text("paid_by").notNull(),
  splitWith: json("split_with").notNull(),
  date: timestamp("date").defaultNow(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  groupId: true,
  description: true,
  amount: true,
  paidBy: true,
  splitWith: true,
  date: true,
  category: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type Itinerary = typeof itineraries.$inferSelect;
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

export type Merchandise = typeof merchandise.$inferSelect;
export type InsertMerchandise = z.infer<typeof insertMerchandiseSchema>;

export type Destination = typeof destinations.$inferSelect;
export type InsertDestination = z.infer<typeof insertDestinationSchema>;

export type Experience = typeof experiences.$inferSelect;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;

export type ExpenseGroup = typeof expenseGroups.$inferSelect;
export type InsertExpenseGroup = z.infer<typeof insertExpenseGroupSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
