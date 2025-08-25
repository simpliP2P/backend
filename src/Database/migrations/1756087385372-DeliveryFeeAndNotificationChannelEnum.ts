import { MigrationInterface, QueryRunner } from "typeorm";

export class DeliveryFeeAndNotificationChannelEnum1756087385372
  implements MigrationInterface
{
  name = "DeliveryFeeAndNotificationChannelEnum1756087385372";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organisation_departments" DROP CONSTRAINT IF EXISTS "unique_department_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisation_categories" DROP CONSTRAINT IF EXISTS "unique_category_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" ADD COLUMN IF NOT EXISTS "delivery_fee" numeric(10,2) DEFAULT '0'`,
    );

    // Handle duplicate head_of_department_id values before creating unique constraint
    await queryRunner.query(`
            UPDATE organisation_departments 
            SET head_of_department_id = NULL 
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, 
                           ROW_NUMBER() OVER (PARTITION BY head_of_department_id ORDER BY created_at, id) as rn
                    FROM organisation_departments 
                    WHERE head_of_department_id IS NOT NULL
                ) t 
                WHERE t.rn > 1
            )
        `);

    // Drop existing constraint if exists
    await queryRunner.query(
      `ALTER TABLE "organisation_departments" DROP CONSTRAINT IF EXISTS "UQ_fa27407a66a67f92d3af188c002"`,
    );

    // Create unique constraint only if no duplicates exist
    await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM organisation_departments 
                    WHERE head_of_department_id IS NOT NULL 
                    GROUP BY head_of_department_id 
                    HAVING COUNT(*) > 1
                ) THEN
                    ALTER TABLE organisation_departments ADD CONSTRAINT "UQ_fa27407a66a67f92d3af188c002" UNIQUE (head_of_department_id);
                END IF;
            END $$;
        `);

    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" DROP COLUMN IF EXISTS "status"`,
    );

    // Create enum type if it doesn't exist
    await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_requisitions_status_enum') THEN
                    CREATE TYPE "public"."purchase_requisitions_status_enum" AS ENUM('INITIALIZED', 'SAVED_FOR_LATER', 'PENDING', 'APPROVED', 'REJECTED', 'REQUEST_MODIFICATION');
                END IF;
            END $$;
        `);

    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" ADD COLUMN IF NOT EXISTS "status" "public"."purchase_requisitions_status_enum" NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."suppliers_notification_channel_enum" RENAME TO "suppliers_notification_channel_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."suppliers_notification_channel_enum" AS ENUM('sms', 'email', 'whatsapp')`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "notification_channel" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "notification_channel" TYPE "public"."suppliers_notification_channel_enum" USING "notification_channel"::"text"::"public"."suppliers_notification_channel_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "notification_channel" SET DEFAULT 'email'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."suppliers_notification_channel_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisation_departments" ADD CONSTRAINT "FK_fa27407a66a67f92d3af188c002" FOREIGN KEY ("head_of_department_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organisation_departments" DROP CONSTRAINT IF EXISTS "FK_fa27407a66a67f92d3af188c002"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."suppliers_notification_channel_enum_old" AS ENUM('sms', 'email')`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "notification_channel" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "notification_channel" TYPE "public"."suppliers_notification_channel_enum_old" USING "notification_channel"::"text"::"public"."suppliers_notification_channel_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "notification_channel" SET DEFAULT 'email'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."suppliers_notification_channel_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."suppliers_notification_channel_enum_old" RENAME TO "suppliers_notification_channel_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."purchase_requisitions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisation_departments" DROP CONSTRAINT IF EXISTS "UQ_fa27407a66a67f92d3af188c002"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_requisitions" DROP COLUMN IF EXISTS "delivery_fee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisation_categories" ADD CONSTRAINT "unique_category_org" UNIQUE ("name", "organisation_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisation_departments" ADD CONSTRAINT "unique_department_org" UNIQUE ("name", "organisation_id")`,
    );
  }
}
