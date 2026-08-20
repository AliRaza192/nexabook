/**
 * Event Bus for NexaBook
 *
 * A lightweight, in-process event bus that handles domain events
 * with retry logic and dead letter queue support.
 *
 * This is the "nervous system" of the application - it connects
 * different parts of the system through events.
 */

import { DomainEvent } from "./types";

type EventHandler = (event: DomainEvent) => Promise<void>;

interface HandlerRegistration {
  handler: EventHandler;
  eventType: string;
}

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private deadLetters: DomainEvent[] = [];
  private maxRetries = 3;

  /**
   * Register an event handler
   */
  on(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  /**
   * Emit an event to all registered handlers
   */
  async emit(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];

    if (handlers.length === 0) {
      console.warn(`[EventBus] No handlers for event type: ${event.type}`);
      return;
    }

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(
          `[EventBus] Handler failed for ${event.type}:`,
          error
        );
        await this.retry(handler, event, 0);
      }
    }
  }

  /**
   * Emit multiple events
   */
  async emitAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.emit(event);
    }
  }

  /**
   * Retry a failed handler with exponential backoff
   */
  private async retry(
    handler: EventHandler,
    event: DomainEvent,
    attempt: number
  ): Promise<void> {
    if (attempt >= this.maxRetries) {
      console.error(
        `[EventBus] Max retries reached for ${event.type}, adding to dead letter queue`
      );
      this.deadLetters.push(event);
      return;
    }

    const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
    console.log(
      `[EventBus] Retrying ${event.type} in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`
    );

    setTimeout(async () => {
      try {
        await handler(event);
      } catch (error) {
        console.error(
          `[EventBus] Retry ${attempt + 1} failed for ${event.type}:`,
          error
        );
        await this.retry(handler, event, attempt + 1);
      }
    }, delay);
  }

  /**
   * Get dead letter queue events
   */
  getDeadLetters(): DomainEvent[] {
    return [...this.deadLetters];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetters(): void {
    this.deadLetters = [];
  }

  /**
   * Get registered event types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler count for an event type
   */
  getHandlerCount(eventType: string): number {
    return (this.handlers.get(eventType) || []).length;
  }
}

// Singleton instance
export const eventBus = new EventBus();

/**
 * Create a domain event
 */
export function createEvent(
  type: string,
  orgId: string,
  data: Record<string, unknown>,
  metadata?: { source?: string; userId?: string; correlationId?: string }
): DomainEvent {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date(),
    orgId,
    userId: metadata?.userId,
    data,
    metadata: {
      source: metadata?.source || "nexabook",
      correlationId: metadata?.correlationId,
    },
  };
}
