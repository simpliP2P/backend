import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTotalItemsColumnToPR1748249070726
  implements MigrationInterface
{
  name = "AddTotalItemsColumnToPR1748249070726";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" ADD "total_items" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" DROP COLUMN "total_items"`,
    );
  }
}
