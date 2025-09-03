import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexesForPurchaseRequisitions1756087385375
  implements MigrationInterface
{
  name = "AddPerformanceIndexesForPurchaseRequisitions1756087385375";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for checking uncompleted requisitions (critical for performance)
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_created_by_org_status 
            ON purchase_requisitions(created_by, organisation_id, status) 
            WHERE status NOT IN ('APPROVED', 'REJECTED')
        `);

    // Index for organisation and status queries
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_org_status 
            ON purchase_requisitions(organisation_id, status)
        `);

    // Index for PR number generation queries
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_org_pr_number 
            ON purchase_requisitions(organisation_id, pr_number)
        `);

    // Composite index for common query patterns
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_org_created_by_created 
            ON purchase_requisitions(organisation_id, created_by, created_at)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_requisitions_created_by_org_status`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_requisitions_org_status`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_requisitions_org_pr_number`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_purchase_requisitions_org_created_by_created`,
    );
  }
}
