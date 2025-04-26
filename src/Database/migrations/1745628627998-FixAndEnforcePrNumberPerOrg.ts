import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAndEnforcePrNumberPerOrg1745628627998
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop old global unique constraint
    await queryRunner.query(`
      ALTER TABLE purchase_requisitions DROP CONSTRAINT IF EXISTS purchase_requisitions_pr_number_key;
    `);

    // Step 2: Fix duplicates per org
    const orgs = await queryRunner.query(
      `SELECT DISTINCT organisation_id FROM purchase_requisitions`,
    );

    for (const { organisation_id } of orgs) {
      const requisitions = await queryRunner.query(
        `
        SELECT id
        FROM purchase_requisitions
        WHERE organisation_id = $1
        ORDER BY created_at ASC
      `,
        [organisation_id],
      );

      for (let i = 0; i < requisitions.length; i++) {
        const padded = String(i + 1).padStart(3, "0");
        await queryRunner.query(
          `
          UPDATE purchase_requisitions
          SET pr_number = $1
          WHERE id = $2
        `,
          [`PR-${padded}`, requisitions[i].id],
        );
      }
    }

    // Step 3: Add new composite unique constraint
    await queryRunner.query(`
      ALTER TABLE purchase_requisitions
      ADD CONSTRAINT unique_pr_number_per_org UNIQUE (organisation_id, pr_number);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new composite constraint
    await queryRunner.query(`
      ALTER TABLE purchase_requisitions
      DROP CONSTRAINT IF EXISTS unique_pr_number_per_org;
    `);

    // Optionally restore old global constraint
    await queryRunner.query(`
      ALTER TABLE purchase_requisitions
      ADD CONSTRAINT purchase_requisitions_pr_number_key UNIQUE (pr_number);
    `);
  }
}
