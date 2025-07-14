import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveTenantCodeColumn1752499711635 implements MigrationInterface {
  name = "RemoveTenantCodeColumn1752499711635";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organisations" DROP COLUMN "tenant_code"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organisations" ADD "tenant_code" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisations" ADD CONSTRAINT "UQ_ec3fd2c88c2e600840126648ecc" UNIQUE ("tenant_code")`,
    );
  }
}
