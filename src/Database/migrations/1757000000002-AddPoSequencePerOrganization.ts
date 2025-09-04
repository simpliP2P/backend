import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPoSequencePerOrganization1757000000002
  implements MigrationInterface
{
  name = "AddPoSequencePerOrganization1757000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create a table to track PO sequences per organization
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS po_sequences (
        organisation_id UUID PRIMARY KEY,
        sequence_name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create sequences for existing organizations
    const organisations = await queryRunner.query(`
      SELECT DISTINCT organisation_id, 
             COALESCE(MAX(CAST(SUBSTRING(po_number, 4) AS INTEGER)), 0) as max_number
      FROM purchase_orders 
      WHERE po_number LIKE 'PO-%'
      AND po_number ~ '^PO-[0-9]+$'
      GROUP BY organisation_id
    `);

    for (const org of organisations) {
      const sequenceName = `po_seq_${org.organisation_id.replace(/-/g, "_")}`;
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
        INSERT INTO po_sequences (organisation_id, sequence_name)
        VALUES ($1, $2)
        ON CONFLICT (organisation_id) DO NOTHING
      `,
        [org.organisation_id, sequenceName],
      );
    }

    // Create index for fast lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_sequences_org_id 
      ON po_sequences (organisation_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get all sequences to drop
    const sequences = await queryRunner.query(`
      SELECT sequence_name FROM po_sequences
    `);

    // Drop all sequences
    for (const seq of sequences) {
      await queryRunner.query(`DROP SEQUENCE IF EXISTS ${seq.sequence_name}`);
    }

    // Drop the tracking table
    await queryRunner.query(`DROP TABLE IF EXISTS po_sequences`);
  }
}
