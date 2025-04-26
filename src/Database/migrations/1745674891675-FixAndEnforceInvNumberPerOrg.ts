import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAndEnforceInvNumberPerOrg1745674891675
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Fix duplicates per org
    const orgs = await queryRunner.query(
      `SELECT DISTINCT organisation_id FROM products`,
    );

    for (const { organisation_id } of orgs) {
      const products = await queryRunner.query(
        `SELECT id
         FROM products
         WHERE organisation_id = $1
         ORDER BY created_at ASC`,
        [organisation_id],
      );

      for (let i = 0; i < products.length; i++) {
        const padded = String(i + 1).padStart(3, "0");
        await queryRunner.query(
          `UPDATE products
           SET inv_number = $1
           WHERE id = $2`,
          [`INV-${padded}`, products[i].id],
        );
      }
    }

    // Step 2: Add new composite unique constraint
    await queryRunner.query(
      `ALTER TABLE products
       ADD CONSTRAINT unique_inv_number_per_org UNIQUE (organisation_id, inv_number)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new composite constraint
    await queryRunner.query(
      `ALTER TABLE products
       DROP CONSTRAINT IF EXISTS unique_inv_number_per_org`,
    );
  }
}
