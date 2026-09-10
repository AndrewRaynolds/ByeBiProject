// Updated storage with only the 10 specified destinations
import {
  Trip, BlogPost, Destination, Experience,
  InsertTrip, InsertBlogPost,
  InsertDestination, InsertExperience, ExpenseGroup, Expense,
  InsertExpenseGroup, InsertExpense,
  expenseGroups as expenseGroupsTable,
  expenses as expensesTable,
  blogPosts as blogPostsTable,
  stripeWebhookEvents,
  affiliateClicks,
  type InsertAffiliateClick,
  trips as tripsTable,
  merchandiseOrders,
  merchandiseNotifications,
  type MerchandiseOrder,
  type InsertMerchandiseOrder,
  type MerchandiseNotification,
  type MerchandiseNotificationType,
} from "@shared/schema";
import type { AffiliateClickSummary } from "@shared/analyticsSchemas";
import { and, desc, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { createDatabase, type DatabaseConnection } from "./db";

export interface IStorage {
  healthCheck(): Promise<void>;
  close(): Promise<void>;

  // Trip operations
  getTrip(id: number): Promise<Trip | undefined>;
  getTripsByUserId(userId: string): Promise<Trip[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;

  // Blog post operations
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  getAllBlogPosts(): Promise<BlogPost[]>;
  createBlogPost(blogPost: InsertBlogPost): Promise<BlogPost>;

  // Destination operations
  getDestination(id: number): Promise<Destination | undefined>;
  getAllDestinations(): Promise<Destination[]>;
  createDestination(destination: InsertDestination): Promise<Destination>;

  // Experience operations
  getExperience(id: number): Promise<Experience | undefined>;
  getAllExperiences(): Promise<Experience[]>;
  createExperience(experience: InsertExperience): Promise<Experience>;
  
  // Expense group operations (SplittaBro feature)
  getExpenseGroup(id: number): Promise<ExpenseGroup | undefined>;
  getExpenseGroupsByTripId(tripId: number, ownerId: string): Promise<ExpenseGroup[]>;
  getAllExpenseGroups(ownerId: string): Promise<ExpenseGroup[]>;
  createExpenseGroup(group: InsertExpenseGroup, ownerId: string): Promise<ExpenseGroup>;
  isExpenseGroupOwner(groupId: number, ownerId: string): Promise<boolean>;
  
  // Expense operations (SplittaBro feature)
  getExpense(id: number): Promise<Expense | undefined>;
  getExpensesByGroupId(groupId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  
  // Stripe webhook idempotency
  hasProcessedStripeEvent(eventId: string): Promise<boolean>;
  markStripeEventProcessed(eventId: string, sessionId: string): Promise<void>;

  // Privacy-preserving first-party affiliate analytics
  recordAffiliateClick(click: InsertAffiliateClick): Promise<void>;
  getAffiliateClickSummary(since: Date, days: number): Promise<AffiliateClickSummary>;

  // Merchandise order lifecycle
  createMerchandiseOrder(order: InsertMerchandiseOrder): Promise<MerchandiseOrder>;
  deleteUnattachedMerchandiseOrder(orderId: string): Promise<boolean>;
  attachStripeSessionToOrder(orderId: string, sessionId: string): Promise<boolean>;
  getMerchandiseOrderById(orderId: string): Promise<MerchandiseOrder | undefined>;
  getMerchandiseOrderByPrintfulOrderId(printfulOrderId: string): Promise<MerchandiseOrder | undefined>;
  getMerchandiseOrderByIdAndSession(orderId: string, sessionId: string): Promise<MerchandiseOrder | undefined>;
  getMerchandiseOrdersByUserId(userId: string): Promise<MerchandiseOrder[]>;
  getAllMerchandiseOrders(limit?: number): Promise<MerchandiseOrder[]>;
  setMerchandiseOrderCustomerEmail(orderId: string, email: string): Promise<void>;
  claimMerchandiseOrderForFulfillment(
    orderId: string,
    sessionId: string,
    eventId: string,
    staleBefore: Date,
  ): Promise<MerchandiseOrder | undefined>;
  markMerchandiseOrderSubmitted(
    orderId: string,
    printfulOrderId: string,
    printfulStatus?: string,
  ): Promise<void>;
  markMerchandiseOrderFailure(
    orderId: string,
    failureCode: string,
    manualReview?: boolean,
  ): Promise<void>;
  markMerchandiseOrderExpired(orderId: string, sessionId: string): Promise<boolean>;
  markMerchandiseOrderRefunded(
    orderId: string,
    refundId: string,
    fulfillmentCancelled: boolean,
  ): Promise<void>;
  updateMerchandiseOrderFromPrintful(
    orderId: string,
    update: {
      printfulStatus: string;
      fulfillmentStatus: string;
      trackingNumber?: string | null;
      trackingUrl?: string | null;
      shippingCarrier?: string | null;
      shippedAt?: Date | null;
      failureCode?: string | null;
    },
  ): Promise<void>;
  enqueueMerchandiseNotification(
    orderId: string,
    type: MerchandiseNotificationType,
  ): Promise<void>;
  getRetryableMerchandiseNotifications(
    staleBefore: Date,
    limit?: number,
  ): Promise<MerchandiseNotification[]>;
  getMerchandiseNotificationsByOrderIds(
    orderIds: string[],
  ): Promise<MerchandiseNotification[]>;
  retryFailedMerchandiseNotifications(orderId: string): Promise<number>;
  claimMerchandiseNotification(id: string, staleBefore: Date): Promise<boolean>;
  completeMerchandiseNotification(
    id: string,
    result: { status: "sent" | "failed"; providerMessageId?: string; lastError?: string },
  ): Promise<void>;
}

export class MemStorage implements IStorage {
  private trips: Map<number, Trip>;
  private blogPosts: Map<number, BlogPost>;
  private destinations: Map<number, Destination>;
  private experiences: Map<number, Experience>;
  private expenseGroups: Map<number, ExpenseGroup>;
  private expenseItems: Map<number, Expense>;
  private processedStripeEventIds: Set<string>;
  private affiliateClickEvents: Array<{
    click: InsertAffiliateClick;
    createdAt: Date;
  }>;
  private merchandiseOrderItems: Map<string, MerchandiseOrder>;
  private merchandiseNotificationItems: Map<string, MerchandiseNotification>;

  private tripId: number;
  private blogPostId: number;
  private destinationId: number;
  private experienceId: number;
  private expenseGroupId: number;
  private expenseId: number;

  constructor() {
    this.trips = new Map();
    this.blogPosts = new Map();
    this.destinations = new Map();
    this.experiences = new Map();
    this.expenseGroups = new Map();
    this.expenseItems = new Map();
    this.processedStripeEventIds = new Set();
    this.affiliateClickEvents = [];
    this.merchandiseOrderItems = new Map();
    this.merchandiseNotificationItems = new Map();

    this.tripId = 1;
    this.blogPostId = 1;
    this.destinationId = 1;
    this.experienceId = 1;
    this.expenseGroupId = 1;
    this.expenseId = 1;

    // Initialize with sample data
    this.initializeDestinations();
    this.initializeExperiences();
    this.initializeBlogPosts();
  }

  async healthCheck(): Promise<void> {
    return Promise.resolve();
  }

  async close(): Promise<void> {
    return Promise.resolve();
  }

  async recordAffiliateClick(click: InsertAffiliateClick): Promise<void> {
    this.affiliateClickEvents.push({ click, createdAt: new Date() });
  }

  async getAffiliateClickSummary(
    since: Date,
    days: number,
  ): Promise<AffiliateClickSummary> {
    return summarizeAffiliateClicks(
      this.affiliateClickEvents
        .filter((event) => event.createdAt >= since)
        .map(({ click }) => ({
          provider: click.provider,
          placement: click.placement,
          monetized: click.monetized,
          count: 1,
        })),
      days,
    );
  }

  async createMerchandiseOrder(
    order: InsertMerchandiseOrder,
  ): Promise<MerchandiseOrder> {
    const now = new Date();
    const created: MerchandiseOrder = {
      id: order.id,
      userId: order.userId ?? null,
      customerEmail: order.customerEmail ?? null,
      brand: order.brand,
      stripeSessionId: null,
      stripeEventId: null,
      paymentStatus: "pending",
      fulfillmentStatus: "pending_payment",
      amountTotal: order.amountTotal,
      currency: order.currency,
      shippingCountry: order.shippingCountry,
      shippingMethod: order.shippingMethod,
      shippingAmount: order.shippingAmount,
      items: order.items,
      printfulOrderId: null,
      printfulStatus: null,
      stripeRefundId: null,
      trackingNumber: null,
      trackingUrl: null,
      shippingCarrier: null,
      shippedAt: null,
      legalVersion: order.legalVersion,
      termsAcceptedAt: order.termsAcceptedAt,
      failureCode: null,
      createdAt: now,
      updatedAt: now,
    };
    this.merchandiseOrderItems.set(created.id, created);
    return created;
  }

  async deleteUnattachedMerchandiseOrder(orderId: string): Promise<boolean> {
    const order = this.merchandiseOrderItems.get(orderId);
    if (!order || order.stripeSessionId || order.paymentStatus !== "pending") return false;
    return this.merchandiseOrderItems.delete(orderId);
  }

  async attachStripeSessionToOrder(orderId: string, sessionId: string): Promise<boolean> {
    const order = this.merchandiseOrderItems.get(orderId);
    if (!order || order.stripeSessionId) return false;
    this.merchandiseOrderItems.set(orderId, {
      ...order,
      stripeSessionId: sessionId,
      updatedAt: new Date(),
    });
    return true;
  }

  async getMerchandiseOrderById(orderId: string): Promise<MerchandiseOrder | undefined> {
    return this.merchandiseOrderItems.get(orderId);
  }

  async getMerchandiseOrderByPrintfulOrderId(
    printfulOrderId: string,
  ): Promise<MerchandiseOrder | undefined> {
    return Array.from(this.merchandiseOrderItems.values())
      .find((order) => order.printfulOrderId === printfulOrderId);
  }

  async getMerchandiseOrderByIdAndSession(
    orderId: string,
    sessionId: string,
  ): Promise<MerchandiseOrder | undefined> {
    const order = this.merchandiseOrderItems.get(orderId);
    return order?.stripeSessionId === sessionId ? order : undefined;
  }

  async getMerchandiseOrdersByUserId(userId: string): Promise<MerchandiseOrder[]> {
    return Array.from(this.merchandiseOrderItems.values())
      .filter((order) => order.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async getAllMerchandiseOrders(limit = 100): Promise<MerchandiseOrder[]> {
    return Array.from(this.merchandiseOrderItems.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, limit);
  }

  async setMerchandiseOrderCustomerEmail(orderId: string, email: string): Promise<void> {
    const order = this.merchandiseOrderItems.get(orderId);
    if (!order) return;
    this.merchandiseOrderItems.set(orderId, {
      ...order,
      customerEmail: email,
      updatedAt: new Date(),
    });
  }

  async claimMerchandiseOrderForFulfillment(
    orderId: string,
    sessionId: string,
    eventId: string,
    staleBefore: Date,
  ): Promise<MerchandiseOrder | undefined> {
    const order = this.merchandiseOrderItems.get(orderId);
    const claimable = order && order.stripeSessionId === sessionId && (
      order.fulfillmentStatus === "pending_payment" ||
      order.fulfillmentStatus === "fulfillment_failed" ||
      (order.fulfillmentStatus === "processing" && order.updatedAt <= staleBefore)
    );
    if (!order || !claimable) return undefined;
    const claimed = {
      ...order,
      stripeEventId: eventId,
      paymentStatus: "paid",
      fulfillmentStatus: "processing",
      failureCode: null,
      updatedAt: new Date(),
    };
    this.merchandiseOrderItems.set(orderId, claimed);
    return claimed;
  }

  async markMerchandiseOrderSubmitted(
    orderId: string,
    printfulOrderId: string,
    printfulStatus?: string,
  ): Promise<void> {
    const order = this.merchandiseOrderItems.get(orderId);
    if (!order) return;
    this.merchandiseOrderItems.set(orderId, {
      ...order,
      fulfillmentStatus: "submitted",
      printfulOrderId,
      printfulStatus: printfulStatus ?? null,
      failureCode: null,
      updatedAt: new Date(),
    });
  }

  async markMerchandiseOrderFailure(
    orderId: string,
    failureCode: string,
    manualReview = false,
  ): Promise<void> {
    const order = this.merchandiseOrderItems.get(orderId);
    if (!order) return;
    this.merchandiseOrderItems.set(orderId, {
      ...order,
      paymentStatus: "paid",
      fulfillmentStatus: manualReview ? "manual_review" : "fulfillment_failed",
      failureCode,
      updatedAt: new Date(),
    });
  }

  async markMerchandiseOrderExpired(orderId: string, sessionId: string): Promise<boolean> {
    const order = this.merchandiseOrderItems.get(orderId);
    if (!order || order.stripeSessionId !== sessionId || order.paymentStatus !== "pending") return false;
    this.merchandiseOrderItems.set(orderId, {
      ...order,
      paymentStatus: "failed",
      fulfillmentStatus: "cancelled",
      failureCode: "checkout_expired",
      updatedAt: new Date(),
    });
    return true;
  }

  async markMerchandiseOrderRefunded(
    orderId: string,
    refundId: string,
    fulfillmentCancelled: boolean,
  ): Promise<void> {
    const order = this.merchandiseOrderItems.get(orderId);
    if (!order) return;
    this.merchandiseOrderItems.set(orderId, {
      ...order,
      paymentStatus: "refunded",
      fulfillmentStatus: fulfillmentCancelled ? "cancelled" : "manual_review",
      stripeRefundId: refundId,
      printfulStatus: fulfillmentCancelled ? "canceled" : order.printfulStatus,
      failureCode: fulfillmentCancelled ? null : "refund_requires_fulfillment_review",
      updatedAt: new Date(),
    });
  }

  async updateMerchandiseOrderFromPrintful(
    orderId: string,
    update: {
      printfulStatus: string;
      fulfillmentStatus: string;
      trackingNumber?: string | null;
      trackingUrl?: string | null;
      shippingCarrier?: string | null;
      shippedAt?: Date | null;
      failureCode?: string | null;
    },
  ): Promise<void> {
    const order = this.merchandiseOrderItems.get(orderId);
    if (!order) return;
    this.merchandiseOrderItems.set(orderId, {
      ...order,
      ...update,
      updatedAt: new Date(),
    });
  }

  async enqueueMerchandiseNotification(
    orderId: string,
    type: MerchandiseNotificationType,
  ): Promise<void> {
    const existing = Array.from(this.merchandiseNotificationItems.values())
      .find((notification) => notification.orderId === orderId && notification.type === type);
    if (existing) return;
    const now = new Date();
    const id = `${orderId}:${type}`;
    this.merchandiseNotificationItems.set(id, {
      id,
      orderId,
      type,
      status: "pending",
      attempts: 0,
      providerMessageId: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async getRetryableMerchandiseNotifications(
    staleBefore: Date,
    limit = 20,
  ): Promise<MerchandiseNotification[]> {
    return Array.from(this.merchandiseNotificationItems.values())
      .filter((notification) =>
        notification.attempts < 5 && (
          notification.status === "pending" ||
          (["failed", "processing"].includes(notification.status) &&
            notification.updatedAt <= staleBefore)
        ),
      )
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .slice(0, limit);
  }

  async getMerchandiseNotificationsByOrderIds(
    orderIds: string[],
  ): Promise<MerchandiseNotification[]> {
    const requestedOrderIds = new Set(orderIds);
    return Array.from(this.merchandiseNotificationItems.values())
      .filter((notification) => requestedOrderIds.has(notification.orderId))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }

  async retryFailedMerchandiseNotifications(orderId: string): Promise<number> {
    let retried = 0;
    for (const [id, notification] of this.merchandiseNotificationItems) {
      if (
        notification.orderId !== orderId ||
        notification.status !== "failed" ||
        notification.attempts < 5
      ) continue;
      this.merchandiseNotificationItems.set(id, {
        ...notification,
        status: "pending",
        attempts: 0,
        providerMessageId: null,
        lastError: null,
        updatedAt: new Date(),
      });
      retried += 1;
    }
    return retried;
  }

  async claimMerchandiseNotification(id: string, staleBefore: Date): Promise<boolean> {
    const notification = this.merchandiseNotificationItems.get(id);
    const claimable = notification && (
      notification.attempts < 5 && (
        notification.status === "pending" ||
        (["failed", "processing"].includes(notification.status) &&
          notification.updatedAt <= staleBefore)
      )
    );
    if (!notification || !claimable) return false;
    this.merchandiseNotificationItems.set(id, {
      ...notification,
      status: "processing",
      attempts: notification.attempts + 1,
      lastError: null,
      updatedAt: new Date(),
    });
    return true;
  }

  async completeMerchandiseNotification(
    id: string,
    result: { status: "sent" | "failed"; providerMessageId?: string; lastError?: string },
  ): Promise<void> {
    const notification = this.merchandiseNotificationItems.get(id);
    if (!notification) return;
    this.merchandiseNotificationItems.set(id, {
      ...notification,
      status: result.status,
      providerMessageId: result.providerMessageId ?? null,
      lastError: result.lastError?.slice(0, 500) ?? null,
      updatedAt: new Date(),
    });
  }

  // Trip operations
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async getTripsByUserId(userId: string): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(trip => trip.userId === userId);
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const trip: Trip = { 
      id: this.tripId++, 
      userId: insertTrip.userId,
      name: insertTrip.name,
      participants: insertTrip.participants,
      startDate: insertTrip.startDate,
      endDate: insertTrip.endDate,
      departureCity: insertTrip.departureCity,
      destinations: insertTrip.destinations ?? null,
      experienceType: insertTrip.experienceType,
      budget: insertTrip.budget,
      activities: insertTrip.activities ?? null,
      specialRequests: insertTrip.specialRequests ?? null,
      includeMerch: insertTrip.includeMerch ?? false,
      createdAt: new Date(),
    };
    this.trips.set(trip.id, trip);
    return trip;
  }

  // Blog post operations
  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    return this.blogPosts.get(id);
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values());
  }

  async createBlogPost(insertBlogPost: InsertBlogPost): Promise<BlogPost> {
    return this.storeBlogPost(insertBlogPost);
  }

  private storeBlogPost(insertBlogPost: InsertBlogPost): BlogPost {
    const blogPost: BlogPost = { 
      id: this.blogPostId++, 
      ...insertBlogPost,
      location: insertBlogPost.location ?? null,
      createdAt: new Date(),
    };
    this.blogPosts.set(blogPost.id, blogPost);
    return blogPost;
  }

  // Destination operations
  async getDestination(id: number): Promise<Destination | undefined> {
    return this.destinations.get(id);
  }

  async getAllDestinations(): Promise<Destination[]> {
    return Array.from(this.destinations.values());
  }

  async createDestination(insertDestination: InsertDestination): Promise<Destination> {
    const destination: Destination = { 
      id: this.destinationId++, 
      ...insertDestination,
      tags: insertDestination.tags ?? null,
    };
    this.destinations.set(destination.id, destination);
    return destination;
  }

  // Experience operations
  async getExperience(id: number): Promise<Experience | undefined> {
    return this.experiences.get(id);
  }

  async getAllExperiences(): Promise<Experience[]> {
    return Array.from(this.experiences.values());
  }

  async createExperience(insertExperience: InsertExperience): Promise<Experience> {
    const experience: Experience = { 
      id: this.experienceId++, 
      ...insertExperience,
    };
    this.experiences.set(experience.id, experience);
    return experience;
  }

  // Expense group operations
  async getExpenseGroup(id: number): Promise<ExpenseGroup | undefined> {
    return this.expenseGroups.get(id);
  }

  async getExpenseGroupsByTripId(tripId: number, ownerId: string): Promise<ExpenseGroup[]> {
    return Array.from(this.expenseGroups.values()).filter(
      (group) => group.ownerId === ownerId && group.tripId === tripId,
    );
  }

  async getAllExpenseGroups(ownerId: string): Promise<ExpenseGroup[]> {
    return Array.from(this.expenseGroups.values()).filter(
      (group) => group.ownerId === ownerId,
    );
  }

  async createExpenseGroup(insertGroup: InsertExpenseGroup, ownerId: string): Promise<ExpenseGroup> {
    const group: ExpenseGroup = { 
      id: this.expenseGroupId++, 
      ownerId,
      tripId: insertGroup.tripId ?? null,
      name: insertGroup.name,
      description: insertGroup.description ?? null,
      members: insertGroup.members,
      totalAmount: 0,
      currency: insertGroup.currency ?? "EUR",
      createdAt: new Date(),
    };
    this.expenseGroups.set(group.id, group);
    return group;
  }

  async isExpenseGroupOwner(groupId: number, ownerId: string): Promise<boolean> {
    return this.expenseGroups.get(groupId)?.ownerId === ownerId;
  }

  // Expense operations
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenseItems.get(id);
  }

  async getExpensesByGroupId(groupId: number): Promise<Expense[]> {
    return Array.from(this.expenseItems.values()).filter(expense => expense.groupId === groupId);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const expense: Expense = { 
      id: this.expenseId++, 
      ...insertExpense,
      createdAt: new Date(),
    };
    this.expenseItems.set(expense.id, expense);
    return expense;
  }

  async updateExpense(id: number, updateData: Partial<InsertExpense>): Promise<Expense | undefined> {
    const expense = this.expenseItems.get(id);
    if (!expense) return undefined;
    
    const updatedExpense: Expense = {
      ...expense,
      ...updateData,
    };
    this.expenseItems.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expenseItems.delete(id);
  }

  async hasProcessedStripeEvent(eventId: string): Promise<boolean> {
    return this.processedStripeEventIds.has(eventId);
  }

  async markStripeEventProcessed(eventId: string, _sessionId: string): Promise<void> {
    this.processedStripeEventIds.add(eventId);
  }

  // Initialize with only the 10 specified destinations
  private initializeDestinations() {
    const destinations = [
      {
        name: "Roma",
        country: "Italy",
        image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "La Città Eterna - storia, cultura e vita notturna indimenticabile nella capitale italiana.",
        tags: ["Storia", "Cultura", "Vita notturna"],
        rating: "4.8",
        reviewCount: 512
      },
      {
        name: "Ibiza",
        country: "Spain", 
        image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "L'isola del divertimento - club leggendari, spiagge da sogno e feste senza fine.",
        tags: ["Club", "Spiagge", "Festa"],
        rating: "4.9",
        reviewCount: 678
      },
      {
        name: "Barcellona", 
        country: "Spain",
        image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Sole, mare, sangria e vita notturna spettacolare - la destinazione mediterranea perfetta.",
        tags: ["Spiagge", "Vita notturna", "Cultura"],
        rating: "4.9",
        reviewCount: 445
      },
      {
        name: "Praga",
        country: "Czech Republic",
        image: "https://images.unsplash.com/photo-1541849546-216549ae216d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Fascino medievale e vita notturna leggendaria - perfetta per gli amanti della birra.",
        tags: ["Birra", "Vita notturna", "Cultura"],
        rating: "4.8",
        reviewCount: 342
      },
      {
        name: "Budapest",
        country: "Hungary",
        image: "https://images.unsplash.com/photo-1468824357306-a439d58ccb1c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Terme, ruin bar e vita notturna incredibile nella Perla del Danubio.",
        tags: ["Terme", "Ruin Bars", "Vita notturna"],
        rating: "4.6",
        reviewCount: 298
      },
      {
        name: "Cracovia",
        country: "Poland",
        image: "https://images.unsplash.com/photo-1674246145742-c6e4563d94cb?ixlib=rb-4.1.0&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Città storica con prezzi accessibili e vita notturna vivace nel cuore della Polonia.",
        tags: ["Storia", "Prezzi bassi", "Vita notturna"],
        rating: "4.5",
        reviewCount: 234
      },
      {
        name: "Amsterdam",
        country: "Netherlands",
        image: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "La Venezia del Nord - tour sui canali, vita notturna e addii al celibato indimenticabili.",
        tags: ["Canali", "Vita notturna", "Cultura"],
        rating: "4.7",
        reviewCount: 389
      },
      {
        name: "Berlino",
        country: "Germany",
        image: "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Club underground, street art e vita notturna senza fine nella capitale europea delle feste.",
        tags: ["Underground", "Club", "Arte"],
        rating: "4.5",
        reviewCount: 267
      },
      {
        name: "Lisbona",
        country: "Portugal",
        image: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Fascino costiero, vita notturna vivace e pesce fresco nella splendida capitale portoghese.",
        tags: ["Costa", "Vita notturna", "Gastronomia"],
        rating: "4.4",
        reviewCount: 189
      },
      {
        name: "Palma de Mallorca",
        country: "Spain",
        image: "https://images.unsplash.com/photo-1729253980006-c961754ef578?ixlib=rb-4.1.0&auto=format&fit=crop&w=800&h=500&q=90",
        description: "Isola balearica con spiagge cristalline, beach club e vita notturna mediterranea.",
        tags: ["Spiagge", "Beach club", "Isola"],
        rating: "4.6",
        reviewCount: 156
      }
    ];
    
    destinations.forEach(destination => {
      this.createDestination(destination);
    });
  }

  private initializeExperiences() {
    const experiences = [
      {
        name: "The Ultimate BroNight",
        description: "Epic club-hopping, exclusive nightclubs, casinos, and unforgettable alcohol-fueled adventures.",
        image: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      },
      {
        name: "My Olympic Bro",
        description: "Exciting sports activities, live sporting events, competitive challenges, and vibrant bars.",
        image: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      },
      {
        name: "Chill and Feel the Bro",
        description: "Relaxed upscale experiences, chic restaurants, refined bars, and elegant city tours.",
        image: "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      },
      {
        name: "The Wild Broventure",
        description: "One last wild adventure with your bros - outdoor activities, hiking, camping, and beers by the fire.",
        image: "https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"
      }
    ];
    
    experiences.forEach(experience => {
      this.createExperience(experience);
    });
  }

  private initializeBlogPosts() {
    const blogPosts = [
      {
        title: "Roma: The Night We Can't Remember",
        content: "From Trastevere's wine bars to Testaccio's underground clubs, Rome offers an incredible nightlife scene. We started at a rooftop aperitivo with views of the Colosseum, then ended up in a basement club at 5am. The bachelor had no idea what hit him.",
        image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        location: "Roma",
        category: "drink" as const
      },
      {
        title: "Ibiza Uncovered: The Ultimate Party Guide",
        content: "From Amnesia to Pacha, we break down the best clubs, when to go, and how to do it right. We got VIP access to three clubs in one night, watched the sunrise from a yacht, and somehow everyone made the flight home. Barely.",
        image: "https://images.unsplash.com/photo-1544552866-d3ed42536cfd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        location: "Ibiza",
        category: "weird" as const
      },
      {
        title: "Cracovia: Eastern Europe's Hidden Gem",
        content: "Affordable prices, incredible architecture, and a nightlife scene that rivals any major European city. We spent four days exploring the Old Town by day and the underground clubs by night. The vodka was cheaper than water and twice as dangerous.",
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80",
        location: "Cracovia",
        category: "drink" as const
      }
    ];
    
    blogPosts.forEach(post => this.storeBlogPost(post));
  }

}

export class DatabaseStorage extends MemStorage {
  constructor(private readonly connection: DatabaseConnection) {
    super();
  }

  private get db() {
    return this.connection.db;
  }

  override async healthCheck(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }

  override async close(): Promise<void> {
    await this.connection.close();
  }

  override async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await this.db
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.id, id))
      .limit(1);
    return trip;
  }

  override async getTripsByUserId(userId: string): Promise<Trip[]> {
    return this.db
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.userId, userId));
  }

  override async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await this.db
      .insert(tripsTable)
      .values(insertTrip)
      .returning();
    return trip;
  }

  override async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [post] = await this.db
      .select()
      .from(blogPostsTable)
      .where(eq(blogPostsTable.id, id))
      .limit(1);
    return post;
  }

  override async getAllBlogPosts(): Promise<BlogPost[]> {
    return this.db
      .select()
      .from(blogPostsTable)
      .orderBy(desc(blogPostsTable.createdAt), desc(blogPostsTable.id));
  }

  override async createBlogPost(
    insertBlogPost: InsertBlogPost,
  ): Promise<BlogPost> {
    const [post] = await this.db
      .insert(blogPostsTable)
      .values(insertBlogPost)
      .returning();
    return post;
  }

  override async getExpenseGroup(id: number): Promise<ExpenseGroup | undefined> {
    const [group] = await this.db
      .select()
      .from(expenseGroupsTable)
      .where(eq(expenseGroupsTable.id, id))
      .limit(1);
    return group;
  }

  override async getExpenseGroupsByTripId(
    tripId: number,
    ownerId: string,
  ): Promise<ExpenseGroup[]> {
    return this.db
      .select()
      .from(expenseGroupsTable)
      .where(
        and(
          eq(expenseGroupsTable.tripId, tripId),
          eq(expenseGroupsTable.ownerId, ownerId),
        ),
      );
  }

  override async getAllExpenseGroups(ownerId: string): Promise<ExpenseGroup[]> {
    return this.db
      .select()
      .from(expenseGroupsTable)
      .where(eq(expenseGroupsTable.ownerId, ownerId));
  }

  override async createExpenseGroup(
    insertGroup: InsertExpenseGroup,
    ownerId: string,
  ): Promise<ExpenseGroup> {
    const [group] = await this.db
      .insert(expenseGroupsTable)
      .values({
        ...insertGroup,
        tripId: insertGroup.tripId ?? null,
        ownerId,
      })
      .returning();
    return group;
  }

  override async isExpenseGroupOwner(
    groupId: number,
    ownerId: string,
  ): Promise<boolean> {
    const [group] = await this.db
      .select({ id: expenseGroupsTable.id })
      .from(expenseGroupsTable)
      .where(
        and(
          eq(expenseGroupsTable.id, groupId),
          eq(expenseGroupsTable.ownerId, ownerId),
        ),
      )
      .limit(1);
    return Boolean(group);
  }

  override async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await this.db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, id))
      .limit(1);
    return expense;
  }

  override async getExpensesByGroupId(groupId: number): Promise<Expense[]> {
    return this.db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.groupId, groupId));
  }

  override async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await this.db
      .insert(expensesTable)
      .values(insertExpense)
      .returning();
    return expense;
  }

  override async updateExpense(
    id: number,
    updateData: Partial<InsertExpense>,
  ): Promise<Expense | undefined> {
    const [expense] = await this.db
      .update(expensesTable)
      .set(updateData)
      .where(eq(expensesTable.id, id))
      .returning();
    return expense;
  }

  override async deleteExpense(id: number): Promise<boolean> {
    const deleted = await this.db
      .delete(expensesTable)
      .where(eq(expensesTable.id, id))
      .returning({ id: expensesTable.id });
    return deleted.length > 0;
  }

  override async hasProcessedStripeEvent(eventId: string): Promise<boolean> {
    const [event] = await this.db
      .select({ eventId: stripeWebhookEvents.eventId })
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.eventId, eventId))
      .limit(1);
    return Boolean(event);
  }

  override async markStripeEventProcessed(
    eventId: string,
    sessionId: string,
  ): Promise<void> {
    await this.db
      .insert(stripeWebhookEvents)
      .values({ eventId, sessionId })
      .onConflictDoNothing({ target: stripeWebhookEvents.eventId });
  }

  override async recordAffiliateClick(
    click: InsertAffiliateClick,
  ): Promise<void> {
    await this.db.insert(affiliateClicks).values(click);
  }

  override async getAffiliateClickSummary(
    since: Date,
    days: number,
  ): Promise<AffiliateClickSummary> {
    const rows = await this.db
      .select({
        provider: affiliateClicks.provider,
        placement: affiliateClicks.placement,
        monetized: affiliateClicks.monetized,
        count: sql<number>`count(*)::int`,
      })
      .from(affiliateClicks)
      .where(gte(affiliateClicks.createdAt, since))
      .groupBy(
        affiliateClicks.provider,
        affiliateClicks.placement,
        affiliateClicks.monetized,
      );

    return summarizeAffiliateClicks(rows, days);
  }

  override async createMerchandiseOrder(
    order: InsertMerchandiseOrder,
  ): Promise<MerchandiseOrder> {
    const [created] = await this.db
      .insert(merchandiseOrders)
      .values(order)
      .returning();
    return created;
  }

  override async deleteUnattachedMerchandiseOrder(orderId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(merchandiseOrders)
      .where(and(
        eq(merchandiseOrders.id, orderId),
        isNull(merchandiseOrders.stripeSessionId),
        eq(merchandiseOrders.paymentStatus, "pending"),
      ))
      .returning({ id: merchandiseOrders.id });
    return deleted.length === 1;
  }

  override async attachStripeSessionToOrder(
    orderId: string,
    sessionId: string,
  ): Promise<boolean> {
    const updated = await this.db
      .update(merchandiseOrders)
      .set({ stripeSessionId: sessionId, updatedAt: new Date() })
      .where(and(
        eq(merchandiseOrders.id, orderId),
        sql`${merchandiseOrders.stripeSessionId} is null`,
      ))
      .returning({ id: merchandiseOrders.id });
    return updated.length === 1;
  }

  override async getMerchandiseOrderById(
    orderId: string,
  ): Promise<MerchandiseOrder | undefined> {
    const [order] = await this.db
      .select()
      .from(merchandiseOrders)
      .where(eq(merchandiseOrders.id, orderId))
      .limit(1);
    return order;
  }

  override async getMerchandiseOrderByPrintfulOrderId(
    printfulOrderId: string,
  ): Promise<MerchandiseOrder | undefined> {
    const [order] = await this.db
      .select()
      .from(merchandiseOrders)
      .where(eq(merchandiseOrders.printfulOrderId, printfulOrderId))
      .limit(1);
    return order;
  }

  override async getMerchandiseOrderByIdAndSession(
    orderId: string,
    sessionId: string,
  ): Promise<MerchandiseOrder | undefined> {
    const [order] = await this.db
      .select()
      .from(merchandiseOrders)
      .where(and(
        eq(merchandiseOrders.id, orderId),
        eq(merchandiseOrders.stripeSessionId, sessionId),
      ))
      .limit(1);
    return order;
  }

  override async getMerchandiseOrdersByUserId(
    userId: string,
  ): Promise<MerchandiseOrder[]> {
    return this.db
      .select()
      .from(merchandiseOrders)
      .where(eq(merchandiseOrders.userId, userId))
      .orderBy(desc(merchandiseOrders.createdAt));
  }

  override async getAllMerchandiseOrders(limit = 100): Promise<MerchandiseOrder[]> {
    return this.db
      .select()
      .from(merchandiseOrders)
      .orderBy(desc(merchandiseOrders.createdAt))
      .limit(limit);
  }

  override async setMerchandiseOrderCustomerEmail(
    orderId: string,
    email: string,
  ): Promise<void> {
    await this.db
      .update(merchandiseOrders)
      .set({ customerEmail: email, updatedAt: new Date() })
      .where(eq(merchandiseOrders.id, orderId));
  }

  override async claimMerchandiseOrderForFulfillment(
    orderId: string,
    sessionId: string,
    eventId: string,
    staleBefore: Date,
  ): Promise<MerchandiseOrder | undefined> {
    const [order] = await this.db
      .update(merchandiseOrders)
      .set({
        stripeEventId: eventId,
        paymentStatus: "paid",
        fulfillmentStatus: "processing",
        failureCode: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(merchandiseOrders.id, orderId),
        eq(merchandiseOrders.stripeSessionId, sessionId),
        or(
          eq(merchandiseOrders.fulfillmentStatus, "pending_payment"),
          eq(merchandiseOrders.fulfillmentStatus, "fulfillment_failed"),
          and(
            eq(merchandiseOrders.fulfillmentStatus, "processing"),
            lte(merchandiseOrders.updatedAt, staleBefore),
          ),
        ),
      ))
      .returning();
    return order;
  }

  override async markMerchandiseOrderSubmitted(
    orderId: string,
    printfulOrderId: string,
    printfulStatus?: string,
  ): Promise<void> {
    await this.db
      .update(merchandiseOrders)
      .set({
        fulfillmentStatus: "submitted",
        printfulOrderId,
        printfulStatus: printfulStatus ?? null,
        failureCode: null,
        updatedAt: new Date(),
      })
      .where(eq(merchandiseOrders.id, orderId));
  }

  override async markMerchandiseOrderFailure(
    orderId: string,
    failureCode: string,
    manualReview = false,
  ): Promise<void> {
    await this.db
      .update(merchandiseOrders)
      .set({
        paymentStatus: "paid",
        fulfillmentStatus: manualReview ? "manual_review" : "fulfillment_failed",
        failureCode,
        updatedAt: new Date(),
      })
      .where(eq(merchandiseOrders.id, orderId));
  }

  override async markMerchandiseOrderExpired(
    orderId: string,
    sessionId: string,
  ): Promise<boolean> {
    const updated = await this.db
      .update(merchandiseOrders)
      .set({
        paymentStatus: "failed",
        fulfillmentStatus: "cancelled",
        failureCode: "checkout_expired",
        updatedAt: new Date(),
      })
      .where(and(
        eq(merchandiseOrders.id, orderId),
        eq(merchandiseOrders.stripeSessionId, sessionId),
        eq(merchandiseOrders.paymentStatus, "pending"),
      ))
      .returning({ id: merchandiseOrders.id });
    return updated.length === 1;
  }

  override async markMerchandiseOrderRefunded(
    orderId: string,
    refundId: string,
    fulfillmentCancelled: boolean,
  ): Promise<void> {
    await this.db
      .update(merchandiseOrders)
      .set({
        paymentStatus: "refunded",
        fulfillmentStatus: fulfillmentCancelled ? "cancelled" : "manual_review",
        stripeRefundId: refundId,
        ...(fulfillmentCancelled ? { printfulStatus: "canceled" } : {}),
        failureCode: fulfillmentCancelled ? null : "refund_requires_fulfillment_review",
        updatedAt: new Date(),
      })
      .where(eq(merchandiseOrders.id, orderId));
  }

  override async updateMerchandiseOrderFromPrintful(
    orderId: string,
    update: {
      printfulStatus: string;
      fulfillmentStatus: string;
      trackingNumber?: string | null;
      trackingUrl?: string | null;
      shippingCarrier?: string | null;
      shippedAt?: Date | null;
      failureCode?: string | null;
    },
  ): Promise<void> {
    await this.db
      .update(merchandiseOrders)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(merchandiseOrders.id, orderId));
  }

  override async enqueueMerchandiseNotification(
    orderId: string,
    type: MerchandiseNotificationType,
  ): Promise<void> {
    await this.db
      .insert(merchandiseNotifications)
      .values({ orderId, type })
      .onConflictDoNothing({
        target: [merchandiseNotifications.orderId, merchandiseNotifications.type],
      });
  }

  override async getRetryableMerchandiseNotifications(
    staleBefore: Date,
    limit = 20,
  ): Promise<MerchandiseNotification[]> {
    return this.db
      .select()
      .from(merchandiseNotifications)
      .where(or(
        and(
          lt(merchandiseNotifications.attempts, 5),
          eq(merchandiseNotifications.status, "pending"),
        ),
        and(
          lt(merchandiseNotifications.attempts, 5),
          eq(merchandiseNotifications.status, "failed"),
          lte(merchandiseNotifications.updatedAt, staleBefore),
        ),
        and(
          lt(merchandiseNotifications.attempts, 5),
          eq(merchandiseNotifications.status, "processing"),
          lte(merchandiseNotifications.updatedAt, staleBefore),
        ),
      ))
      .orderBy(merchandiseNotifications.createdAt)
      .limit(limit);
  }

  override async getMerchandiseNotificationsByOrderIds(
    orderIds: string[],
  ): Promise<MerchandiseNotification[]> {
    if (orderIds.length === 0) return [];
    return this.db
      .select()
      .from(merchandiseNotifications)
      .where(inArray(merchandiseNotifications.orderId, orderIds))
      .orderBy(desc(merchandiseNotifications.updatedAt));
  }

  override async retryFailedMerchandiseNotifications(orderId: string): Promise<number> {
    const retried = await this.db
      .update(merchandiseNotifications)
      .set({
        status: "pending",
        attempts: 0,
        providerMessageId: null,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(merchandiseNotifications.orderId, orderId),
        eq(merchandiseNotifications.status, "failed"),
        gte(merchandiseNotifications.attempts, 5),
      ))
      .returning({ id: merchandiseNotifications.id });
    return retried.length;
  }

  override async claimMerchandiseNotification(
    id: string,
    staleBefore: Date,
  ): Promise<boolean> {
    const claimed = await this.db
      .update(merchandiseNotifications)
      .set({
        status: "processing",
        attempts: sql`${merchandiseNotifications.attempts} + 1`,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(merchandiseNotifications.id, id),
        lt(merchandiseNotifications.attempts, 5),
        or(
          eq(merchandiseNotifications.status, "pending"),
          and(
            eq(merchandiseNotifications.status, "failed"),
            lte(merchandiseNotifications.updatedAt, staleBefore),
          ),
          and(
            eq(merchandiseNotifications.status, "processing"),
            lte(merchandiseNotifications.updatedAt, staleBefore),
          ),
        ),
      ))
      .returning({ id: merchandiseNotifications.id });
    return claimed.length === 1;
  }

  override async completeMerchandiseNotification(
    id: string,
    result: { status: "sent" | "failed"; providerMessageId?: string; lastError?: string },
  ): Promise<void> {
    await this.db
      .update(merchandiseNotifications)
      .set({
        status: result.status,
        providerMessageId: result.providerMessageId ?? null,
        lastError: result.lastError?.slice(0, 500) ?? null,
        updatedAt: new Date(),
      })
      .where(eq(merchandiseNotifications.id, id));
  }
}

type AffiliateCountRow = {
  provider: string;
  placement: string;
  monetized: boolean;
  count: number;
};

export function summarizeAffiliateClicks(
  rows: AffiliateCountRow[],
  days: number,
): AffiliateClickSummary {
  const providers = new Map<string, { total: number; monetized: number }>();
  const placements = new Map<string, { total: number; monetized: number }>();
  let totalClicks = 0;
  let monetizedClicks = 0;

  for (const row of rows) {
    const count = Number(row.count);
    totalClicks += count;
    if (row.monetized) monetizedClicks += count;

    for (const [map, key] of [
      [providers, row.provider],
      [placements, row.placement],
    ] as const) {
      const current = map.get(key) ?? { total: 0, monetized: 0 };
      current.total += count;
      if (row.monetized) current.monetized += count;
      map.set(key, current);
    }
  }

  const toRows = (values: Map<string, { total: number; monetized: number }>) =>
    Array.from(values, ([key, counts]) => ({ key, ...counts }))
      .sort((left, right) => right.total - left.total || left.key.localeCompare(right.key));

  return {
    days,
    totalClicks,
    monetizedClicks,
    providers: toRows(providers),
    placements: toRows(placements),
  };
}

export function createStorageFromEnvironment(): IStorage {
  const persistenceMode = process.env.CRITICAL_DATA_PERSISTENCE;

  if (process.env.NODE_ENV === "production" && persistenceMode !== "database") {
    throw new Error(
      "CRITICAL_DATA_PERSISTENCE=database is required in production",
    );
  }

  if (persistenceMode !== "database") {
    return new MemStorage();
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required when CRITICAL_DATA_PERSISTENCE=database",
    );
  }

  return new DatabaseStorage(createDatabase(databaseUrl));
}

export const storage = createStorageFromEnvironment();
