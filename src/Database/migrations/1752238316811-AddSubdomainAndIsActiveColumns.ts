import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubdomainAndIsActiveColumns1752238316811
  implements MigrationInterface
{
  name = "AddSubdomainAndIsActiveColumns1752238316811";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add subdomain column as nullable
    console.log(
      "Adding subdomain and is_active columns to organisations table...",
    );
    await queryRunner.query(
      `ALTER TABLE "organisations" ADD "subdomain" character varying`,
    );

    // Step 2: Add is_active column (this can be NOT NULL with default)
    await queryRunner.query(
      `ALTER TABLE "organisations" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );

    // Step 3: Get all existing organizations and populate subdomain
    const organizations = await queryRunner.query(
      `SELECT "id", "name" FROM "organisations"`,
    );

    for (const org of organizations) {
      // Generate subdomain from organization name
      const subdomain = this.generateSubdomain(org.name);

      await queryRunner.query(
        `UPDATE "organisations" SET "subdomain" = $1 WHERE "id" = $2`,
        [subdomain, org.id],
      );
    }

    // Step 4: Make subdomain column NOT NULL after populating data
    await queryRunner.query(
      `ALTER TABLE "organisations" ALTER COLUMN "subdomain" SET NOT NULL`,
    );

    // Step 5: Add unique constraint to subdomain
    await queryRunner.query(
      `ALTER TABLE "organisations" ADD CONSTRAINT "UQ_organisations_subdomain" UNIQUE ("subdomain")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove constraints and columns in reverse order
    await queryRunner.query(
      `ALTER TABLE "organisations" DROP CONSTRAINT "UQ_organisations_subdomain"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisations" DROP COLUMN "subdomain"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisations" DROP COLUMN "is_active"`,
    );
  }

  private generateSubdomain(orgName: string): string {
    if (!orgName || typeof orgName !== "string") {
      return `org-${Date.now()}`;
    }

    return (
      orgName
        .toLowerCase()
        .trim()
        // Remove special characters except hyphens and numbers
        .replace(/[^a-z0-9\s-]/g, "")
        // Replace spaces and multiple hyphens with single hyphen
        .replace(/[\s-]+/g, "-")
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, "") ||
      // Ensure minimum length
      `org-${Date.now()}`
    );
  }
}
