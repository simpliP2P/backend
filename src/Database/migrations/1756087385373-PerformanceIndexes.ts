import { MigrationInterface, QueryRunner } from "typeorm";

export class PerformanceIndexes1756087385373 implements MigrationInterface {
  name = "PerformanceIndexes1756087385373";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add indexes for critical performance bottlenecks

    // Users table - email lookup for login
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email")`,
    );

    // Audit logs - timestamp for filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at")`,
    );

    // Tokens - user_id and type for token verification
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tokens_user_id_type" ON "tokens" ("user_id", "type")`,
    );

    // Purchase requisitions - organisation and status for filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_purchase_requisitions_org_status" ON "purchase_requisitions" ("organisation_id", "status")`,
    );

    // Purchase orders - organisation for filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_purchase_orders_org" ON "purchase_orders" ("organisation_id")`,
    );

    // Products - organisation for filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_products_org" ON "products" ("organisation_id")`,
    );

    // User organisations - user_id for profile lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_organisations_user_id" ON "user_organisations" ("user_id")`,
    );

    // Comments - entity_id for comment lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_comments_entity_id" ON "comments" ("entity_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_comments_entity_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_user_organisations_user_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_purchase_orders_org"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_purchase_requisitions_org_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tokens_user_id_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email"`);
  }
}
