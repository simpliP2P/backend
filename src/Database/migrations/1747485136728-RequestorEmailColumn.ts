import { MigrationInterface, QueryRunner } from "typeorm";

export class RequestorEmailColumn1747485136728 implements MigrationInterface {
  name = "RequestorEmailColumn1747485136728";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" ADD "requestor_email" character varying NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" DROP COLUMN "requestor_email"`,
    );
  }
}
