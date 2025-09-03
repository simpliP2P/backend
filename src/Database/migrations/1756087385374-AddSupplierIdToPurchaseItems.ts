import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupplierIdToPurchaseItems1756087385374
  implements MigrationInterface
{
  name = "AddSupplierIdToPurchaseItems1756087385374";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_items" 
      ADD COLUMN "supplier_id" uuid,
      ADD CONSTRAINT "FK_purchase_items_supplier" 
      FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL
    `);

    // Add index for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_purchase_items_supplier_id" 
      ON "purchase_items" ("supplier_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX "IDX_purchase_items_supplier_id"
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "purchase_items" 
      DROP CONSTRAINT "FK_purchase_items_supplier"
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE "purchase_items" 
      DROP COLUMN "supplier_id"
    `);
  }
}
