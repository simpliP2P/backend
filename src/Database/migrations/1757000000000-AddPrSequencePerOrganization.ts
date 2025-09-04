import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPrSequencePerOrganization1757000000000
  implements MigrationInterface
{
  name = "AddPrSequencePerOrganization1757000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create a table to track sequences per organization
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pr_sequences (
        organisation_id UUID PRIMARY KEY,
        sequence_name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create sequences for existing organizations
    const organisations = await queryRunner.query(`
      SELECT DISTINCT organisation_id, 
             COALESCE(MAX(CAST(SUBSTRING(pr_number, 4) AS INTEGER)), 0) as max_number
      FROM purchase_requisitions 
      WHERE pr_number LIKE 'PR-%'
      AND pr_number ~ '^PR-[0-9]+$'
      GROUP BY organisation_id
    `);

    for (const org of organisations) {
      const sequenceName = `pr_seq_${org.organisation_id.replace(/-/g, "_")}`;
      const startValue = org.max_number + 1;

      // Create sequence for this organization
      await queryRunner.query(`
        CREATE SEQUENCE IF NOT EXISTS ${sequenceName} 
        START WITH ${startValue}
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
      `);

      // Record the sequence in our tracking table
      await queryRunner.query(
        `
        INSERT INTO pr_sequences (organisation_id, sequence_name)
        VALUES ($1, $2)
        ON CONFLICT (organisation_id) DO NOTHING
      `,
        [org.organisation_id, sequenceName],
      );
    }

    // Create index for fast lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pr_sequences_org_id 
      ON pr_sequences (organisation_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get all sequences to drop
    const sequences = await queryRunner.query(`
      SELECT sequence_name FROM pr_sequences
    `);

    // Drop all sequences
    for (const seq of sequences) {
      await queryRunner.query(`DROP SEQUENCE IF EXISTS ${seq.sequence_name}`);
    }

    // Drop the tracking table
    await queryRunner.query(`DROP TABLE IF EXISTS pr_sequences`);
  }
}
