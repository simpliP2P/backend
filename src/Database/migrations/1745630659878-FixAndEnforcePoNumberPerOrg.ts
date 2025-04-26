import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAndEnforcePoNumberPerOrg1745630659878
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop old global unique constraint if it exists
    await queryRunner.query(`
      ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_po_number_key;
    `);

    // Step 2: Fix duplicates per org
    const orgs = await queryRunner.query(`
      SELECT DISTINCT organisation_id FROM purchase_orders
    `);

    for (const { organisation_id } of orgs) {
      const orders = await queryRunner.query(
        `
        SELECT id
        FROM purchase_orders
        WHERE organisation_id = $1
        ORDER BY created_at ASC
      `,
        [organisation_id],
      );

      for (let i = 0; i < orders.length; i++) {
        const padded = String(i + 1).padStart(3, "0");
        await queryRunner.query(
          `
          UPDATE purchase_orders
          SET po_number = $1
          WHERE id = $2
        `,
          [`PO-${padded}`, orders[i].id],
        );
      }
    }

    // Step 3: Add new composite unique constraint per org
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      ADD CONSTRAINT unique_po_number_per_org UNIQUE (organisation_id, po_number);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop composite constraint
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      DROP CONSTRAINT IF EXISTS unique_po_number_per_org;
    `);

    // Restore global unique constraint if needed
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      ADD CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number);
    `);
  }
}
