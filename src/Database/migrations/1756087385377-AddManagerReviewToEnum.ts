import { MigrationInterface, QueryRunner } from "typeorm";

export class AddManagerReviewToEnum1756087385377 implements MigrationInterface {
  name = "AddManagerReviewToEnum1756087385377";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, let's find the actual enum type name
    const enumTypes = await queryRunner.query(`
            SELECT typname FROM pg_type WHERE typtype = 'e' AND typname LIKE '%status%'
        `);

    console.log("Found enum types:", enumTypes);

    // Add MANAGER_REVIEW to the enum if it doesn't exist
    // Use the correct enum type name we found
    const correctEnumName = "purchase_requisitions_status_enum";

    try {
      await queryRunner.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_enum 
                        WHERE enumlabel = 'MANAGER_REVIEW' 
                        AND enumtypid = (
                            SELECT oid FROM pg_type 
                            WHERE typname = '${correctEnumName}'
                        )
                    ) THEN
                        ALTER TYPE ${correctEnumName} ADD VALUE 'MANAGER_REVIEW';
                        RAISE NOTICE 'Successfully added MANAGER_REVIEW to ${correctEnumName}';
                    ELSE
                        RAISE NOTICE 'MANAGER_REVIEW already exists in ${correctEnumName}';
                    END IF;
                END $$;
            `);
      console.log(
        `Successfully processed MANAGER_REVIEW for ${correctEnumName}`,
      );
    } catch (error) {
      console.log(
        `Error adding MANAGER_REVIEW to ${correctEnumName}:`,
        error.message,
      );
      throw error;
    }
  }

  // @ts-ignore
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type
    // For now, we'll just log that manual intervention is needed
    console.log(
      "Warning: To remove MANAGER_REVIEW from enum, manual database intervention is required",
    );
  }
}
