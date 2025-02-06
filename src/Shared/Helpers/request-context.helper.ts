import { AsyncLocalStorage } from "async_hooks";

interface RequestContextStore {
  userId?: string; // User ID from JWT `sub`
  organisationId?: string; // Organisation ID from JWT `org`
}

export class RequestContext {
  private static storage = new AsyncLocalStorage<RequestContextStore>();

  /**
   * Run a function within a request context
   */
  static run(context: RequestContextStore, callback: () => Promise<any>) {
    return this.storage.run(context, callback);
  }

  /**
   * Get the current user ID (from JWT `sub`)
   */
  static getUserId(): string | null {
    return this.storage.getStore()?.userId || null;
  }

  /**
   * Get the current organisation ID
   */
  static getOrganisationId(): string | null {
    return this.storage.getStore()?.organisationId || null;
  }
}
