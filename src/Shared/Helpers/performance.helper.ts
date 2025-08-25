import { AppLogger } from "src/Logger/logger.service";

export class PerformanceHelper {
  private static logger = new AppLogger();

  /**
   * Measure execution time of a function
   */
  static async measureExecutionTime<T>(
    operationName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const executionTime = Date.now() - startTime;

      if (executionTime > 1000) {
        this.logger.warn(
          `Slow operation detected: ${operationName} took ${executionTime}ms`,
        );
      } else if (executionTime > 500) {
        this.logger.log(
          `Moderate operation: ${operationName} took ${executionTime}ms`,
        );
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Operation failed: ${operationName} took ${executionTime}ms`,
        error,
      );
      throw error;
    }
  }

  /**
   * Measure database query performance
   */
  static async measureDatabaseQuery<T>(
    queryName: string,
    query: () => Promise<T>,
  ): Promise<T> {
    return this.measureExecutionTime(`DB Query: ${queryName}`, query);
  }

  /**
   * Log slow API endpoints
   */
  static logSlowEndpoint(method: string, url: string, duration: number): void {
    if (duration > 2000) {
      this.logger.error(`Very slow endpoint: ${method} ${url} - ${duration}ms`);
    } else if (duration > 1000) {
      this.logger.warn(`Slow endpoint: ${method} ${url} - ${duration}ms`);
    } else if (duration > 500) {
      this.logger.log(`Moderate endpoint: ${method} ${url} - ${duration}ms`);
    }
  }

  /**
   * Get database connection pool stats
   */
  static getConnectionPoolStats(): any {
    try {
      // This would need to be implemented based on your database connection
      // For now, return a placeholder
      return {
        totalConnections: 0,
        idleConnections: 0,
        activeConnections: 0,
        waitingConnections: 0,
      };
    } catch (error) {
      this.logger.error("Failed to get connection pool stats", error);
      return null;
    }
  }
}
