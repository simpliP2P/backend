import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAndEnforceSupplierNumberPerOrg1745626233688
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop old global unique constraint
    await queryRunner.query(`
      ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_supplier_no_key;
    `);

    // Step 2: Fix duplicates per org
    // Fetch all orgs
    const orgs = await queryRunner.query(
      `SELECT DISTINCT organisation_id FROM suppliers`,
    );

    for (const { organisation_id } of orgs) {
      const suppliers = await queryRunner.query(
        `
        SELECT id
        FROM suppliers
        WHERE organisation_id = $1
        ORDER BY created_at ASC
      `,
        [organisation_id],
      );

      for (let i = 0; i < suppliers.length; i++) {
        const padded = String(i + 1).padStart(3, "0");
        await queryRunner.query(
          `
          UPDATE suppliers
          SET supplier_no = $1
          WHERE id = $2
        `,
          [`SUP-${padded}`, suppliers[i].id],
        );
      }
    }

    // Step 3: Add new composite unique constraint
    await queryRunner.query(`
      ALTER TABLE suppliers
      ADD CONSTRAINT unique_supplier_no_per_org UNIQUE (organisation_id, supplier_no);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new composite unique constraint
    await queryRunner.query(`
      ALTER TABLE suppliers
      DROP CONSTRAINT IF EXISTS unique_supplier_no_per_org;
    `);

    // Optional: You might want to restore the original supplier_no values here,
    // if you stored them elsewhere beforehand.

    // Restore global uniqueness if needed
    await queryRunner.query(`
      ALTER TABLE suppliers
      ADD CONSTRAINT suppliers_supplier_no_key UNIQUE (supplier_no);
    `);
  }
}
