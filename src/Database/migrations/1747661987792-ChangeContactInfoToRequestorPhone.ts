import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeContactInfoToRequestorPhone1747661987792
  implements MigrationInterface
{
  name = "ChangeContactInfoToRequestorPhone1747661987792";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."unique_product_code_per_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisation_departments" DROP CONSTRAINT "unique_department_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisation_categories" DROP CONSTRAINT "unique_category_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "unique_pro_per_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" RENAME COLUMN "contact_info" TO "requestor_phone"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" RENAME COLUMN "requestor_phone" TO "contact_info"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "unique_pro_per_org" UNIQUE ("organisation_id", "inv_number")`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisation_categories" ADD CONSTRAINT "unique_category_org" UNIQUE ("name", "organisation_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisation_departments" ADD CONSTRAINT "unique_department_org" UNIQUE ("name", "organisation_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "unique_product_code_per_org" ON "products" ("organisation_id", "product_code") WHERE ((product_code IS NOT NULL) AND ((product_code)::text <> ''::text))`,
    );
  }
}
