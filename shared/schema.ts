import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb, index, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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
  location: text("location"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).pick({
  title: true,
  content: true,
  image: true,
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

export type MerchandiseOrderItem = {
  productId: number;
  variantId: number;
  productName: string;
  variantName: string;
  quantity: number;
  unitAmount: number;
};

export const merchandiseOrders = pgTable(
  "merchandise_orders",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id"),
    customerEmail: text("customer_email"),
    brand: text("brand").notNull(),
    stripeSessionId: text("stripe_session_id"),
    stripeEventId: text("stripe_event_id"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    fulfillmentStatus: text("fulfillment_status").notNull().default("pending_payment"),
    amountTotal: integer("amount_total").notNull(),
    currency: text("currency").notNull(),
    shippingCountry: text("shipping_country").notNull(),
    shippingMethod: text("shipping_method").notNull(),
    shippingAmount: integer("shipping_amount").notNull(),
    items: jsonb("items").$type<MerchandiseOrderItem[]>().notNull(),
    printfulOrderId: text("printful_order_id"),
    printfulStatus: text("printful_status"),
    stripeRefundId: text("stripe_refund_id"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    shippingCarrier: text("shipping_carrier"),
    shippedAt: timestamp("shipped_at"),
    legalVersion: text("legal_version").notNull(),
    termsAcceptedAt: timestamp("terms_accepted_at").notNull(),
    failureCode: text("failure_code"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("merchandise_orders_stripe_session_id_uidx").on(table.stripeSessionId),
    uniqueIndex("merchandise_orders_stripe_event_id_uidx").on(table.stripeEventId),
    index("merchandise_orders_user_id_idx").on(table.userId),
    index("merchandise_orders_created_at_idx").on(table.createdAt),
  ],
);

export const merchandiseOrderItemSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  productName: z.string().min(1).max(200),
  variantName: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(10),
  unitAmount: z.number().int().positive(),
});

export const insertMerchandiseOrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1).nullable().optional(),
  customerEmail: z.string().email().max(320).nullable().optional(),
  brand: z.enum(["byebro", "byebride"]),
  amountTotal: z.number().int().positive(),
  currency: z.string().length(3),
  shippingCountry: z.string().length(2),
  shippingMethod: z.string().min(1).max(100),
  shippingAmount: z.number().int().nonnegative(),
  legalVersion: z.string().min(1).max(50),
  termsAcceptedAt: z.date(),
  items: z.array(merchandiseOrderItemSchema).min(1).max(20),
});

export type MerchandiseOrder = typeof merchandiseOrders.$inferSelect;
export type InsertMerchandiseOrder = z.infer<typeof insertMerchandiseOrderSchema>;

export const merchandiseNotificationTypes = [
  "payment_confirmed",
  "order_submitted",
  "order_shipped",
  "order_attention",
  "order_refunded",
] as const;

export type MerchandiseNotificationType =
  (typeof merchandiseNotificationTypes)[number];

export const merchandiseNotifications = pgTable(
  "merchandise_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").notNull().references(() => merchandiseOrders.id),
    type: text("type").$type<MerchandiseNotificationType>().notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    providerMessageId: text("provider_message_id"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("merchandise_notifications_order_type_uidx").on(
      table.orderId,
      table.type,
    ),
    index("merchandise_notifications_status_updated_idx").on(
      table.status,
      table.updatedAt,
    ),
  ],
);

export type MerchandiseNotification =
  typeof merchandiseNotifications.$inferSelect;

export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    provider: text("provider").notNull(),
    placement: text("placement").notNull(),
    brand: text("brand").notNull(),
    destination: text("destination"),
    monetized: boolean("monetized").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("affiliate_clicks_created_at_idx").on(table.createdAt),
    index("affiliate_clicks_provider_idx").on(table.provider),
  ],
);

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks)
  .pick({
    sessionId: true,
    provider: true,
    placement: true,
    brand: true,
    destination: true,
    monetized: true,
  });

export type AffiliateClick = typeof affiliateClicks.$inferSelect;
export type InsertAffiliateClick = z.infer<typeof insertAffiliateClickSchema>;
