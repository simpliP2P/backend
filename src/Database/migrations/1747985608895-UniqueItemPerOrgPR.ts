import { MigrationInterface, QueryRunner } from "typeorm";

export class UniqueItemPerOrgPR1747985608895 implements MigrationInterface {
  name = "UniqueItemPerOrgPR1747985608895";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_items" ADD CONSTRAINT "unique_item_per_org_pr" UNIQUE ("item_name", "organisation_id", "purchase_requisition_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_items" DROP CONSTRAINT "unique_item_per_org_pr"`,
    );
  }
}
