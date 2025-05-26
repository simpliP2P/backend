import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePurchaseItemTriggersFix1747985608895
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Clean up existing triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_update_pr_after_insert ON purchase_items;
      DROP TRIGGER IF EXISTS trg_update_pr_after_update ON purchase_items;
      DROP TRIGGER IF EXISTS trg_update_pr_before_delete ON purchase_items;
    `);

    // Update the insert trigger function (CREATE OR REPLACE)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_pr_totals_on_insert()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE purchase_requisitions
        SET
          quantity = quantity + NEW.pr_quantity,
          estimated_cost = estimated_cost + (NEW.pr_quantity * NEW.unit_price),
          total_items = total_items + 1
        WHERE id = NEW.purchase_requisition_id;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Update the update trigger function (CREATE OR REPLACE)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_pr_totals_on_update()
      RETURNS TRIGGER AS $$
      DECLARE
        old_cost NUMERIC := OLD.pr_quantity * OLD.unit_price;
        new_cost NUMERIC := NEW.pr_quantity * NEW.unit_price;
      BEGIN
        UPDATE purchase_requisitions
        SET
          quantity = quantity + (NEW.pr_quantity - OLD.pr_quantity),
          estimated_cost = estimated_cost + (new_cost - old_cost)
        WHERE id = NEW.purchase_requisition_id;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Update the delete trigger function (CREATE OR REPLACE)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_pr_totals_on_delete()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE purchase_requisitions
        SET
          quantity = GREATEST(0, quantity - OLD.pr_quantity),
          estimated_cost = GREATEST(0, estimated_cost - (OLD.pr_quantity * OLD.unit_price)),
          total_items = GREATEST(0, total_items - 1)
        WHERE id = OLD.purchase_requisition_id;

        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Recreate triggers
    await queryRunner.query(`
      CREATE TRIGGER trg_update_pr_after_insert
      AFTER INSERT ON purchase_items
      FOR EACH ROW
      EXECUTE FUNCTION update_pr_totals_on_insert();
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_update_pr_after_update
      AFTER UPDATE ON purchase_items
      FOR EACH ROW
      WHEN (
        OLD.pr_quantity IS DISTINCT FROM NEW.pr_quantity OR
        OLD.unit_price IS DISTINCT FROM NEW.unit_price
      )
      EXECUTE FUNCTION update_pr_totals_on_update();
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_update_pr_before_delete
      BEFORE DELETE ON purchase_items
      FOR EACH ROW
      EXECUTE FUNCTION update_pr_totals_on_delete();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_update_pr_after_insert ON purchase_items;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_update_pr_after_update ON purchase_items;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_update_pr_before_delete ON purchase_items;`,
    );

    // Drop functions if needed (optional, you might want to keep them)
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_pr_totals_on_insert;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_pr_totals_on_update;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_pr_totals_on_delete;`,
    );
  }
}
