import { MigrationInterface, QueryRunner } from "typeorm";

export class UltraPerformanceOptimizations1756087385376
  implements MigrationInterface
{
  name = "UltraPerformanceOptimizations1756087385376";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Note: ALTER SYSTEM commands must be run manually by database admin
    // These settings are commented out as they cannot run in transactions
    /*
    ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
    ALTER SYSTEM SET max_connections = 200;
    ALTER SYSTEM SET shared_buffers = '256MB';
    ALTER SYSTEM SET effective_cache_size = '1GB';
    ALTER SYSTEM SET maintenance_work_mem = '64MB';
    ALTER SYSTEM SET checkpoint_completion_target = 0.9;
    ALTER SYSTEM SET wal_buffers = '16MB';
    ALTER SYSTEM SET default_statistics_target = 100;
    ALTER SYSTEM SET random_page_cost = 1.1;
    ALTER SYSTEM SET effective_io_concurrency = 200;
    ALTER SYSTEM SET work_mem = '8MB';
    ALTER SYSTEM SET min_wal_size = '1GB';
    ALTER SYSTEM SET max_wal_size = '4GB';
    ALTER SYSTEM SET max_worker_processes = 8;
    ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
    ALTER SYSTEM SET max_parallel_workers = 8;
    ALTER SYSTEM SET max_parallel_maintenance_workers = 4;
    */

    // Create additional performance indexes
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_status_created_at 
            ON purchase_requisitions(status, created_at);
            
            CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_org_branch_dept 
            ON purchase_requisitions(organisation_id, branch_id, department_id);
            
            CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_created_by_status 
            ON purchase_requisitions(created_by, status);
        `);

    // Create partial indexes for common query patterns
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_pending_only 
            ON purchase_requisitions(created_by, organisation_id) 
            WHERE status = 'PENDING';
            
            CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_initialized_only 
            ON purchase_requisitions(created_by, organisation_id) 
            WHERE status = 'INITIALIZED';
        `);

    // Analyze tables for better query planning
    await queryRunner.query(`ANALYZE purchase_requisitions;`);
    await queryRunner.query(`ANALYZE purchase_items;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop additional indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_requisitions_status_created_at`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_requisitions_org_branch_dept`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_requisitions_created_by_status`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_requisitions_pending_only`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_requisitions_initialized_only`,
    );

    // Note: ALTER SYSTEM RESET commands must be run manually by database admin
    // These settings are commented out as they cannot run in transactions
    /*
        ALTER SYSTEM RESET shared_preload_libraries;
        ALTER SYSTEM RESET max_connections;
        ALTER SYSTEM RESET shared_buffers;
        ALTER SYSTEM RESET effective_cache_size;
        ALTER SYSTEM RESET maintenance_work_mem;
        ALTER SYSTEM RESET checkpoint_completion_target;
        ALTER SYSTEM RESET wal_buffers;
        ALTER SYSTEM RESET default_statistics_target;
        ALTER SYSTEM RESET random_page_cost;
        ALTER SYSTEM RESET effective_io_concurrency;
        ALTER SYSTEM RESET work_mem;
        ALTER SYSTEM RESET min_wal_size;
        ALTER SYSTEM RESET max_wal_size;
        ALTER SYSTEM RESET max_worker_processes;
        ALTER SYSTEM RESET max_parallel_workers_per_gather;
        ALTER SYSTEM RESET max_parallel_workers;
        ALTER SYSTEM RESET max_parallel_maintenance_workers;
        */
  }
}
