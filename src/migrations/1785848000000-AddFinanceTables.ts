import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFinanceTables1785848000000 implements MigrationInterface {
    name = 'AddFinanceTables1785848000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."categories_type_enum" AS ENUM('income', 'expense')
        `);
        await queryRunner.query(`
            CREATE TABLE "categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "icon" character varying,
                "color" character varying,
                "type" "public"."categories_type_enum" NOT NULL,
                "userId" uuid NOT NULL,
                CONSTRAINT "PK_24dbc6126a28ab3ea7e6bcbb7d0" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "description" character varying NOT NULL,
                "amount" numeric(10,2) NOT NULL,
                "type" "public"."categories_type_enum" NOT NULL,
                "date" date NOT NULL,
                "categoryId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "notes" text,
                "recurring" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a219bfd85d415f69fe5495d96aa" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "budgets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "categoryId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "amount" numeric(10,2) NOT NULL,
                "month" integer NOT NULL,
                "year" integer NOT NULL,
                "spent" numeric(10,2) NOT NULL DEFAULT 0,
                CONSTRAINT "UQ_budgets_user_category_month_year" UNIQUE ("userId", "categoryId", "month", "year"),
                CONSTRAINT "PK_031234567890abcdef12345" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."goals_status_enum" AS ENUM('active', 'completed', 'expired')
        `);
        await queryRunner.query(`
            CREATE TABLE "goals" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "targetAmount" numeric(10,2) NOT NULL,
                "currentAmount" numeric(10,2) NOT NULL DEFAULT 0,
                "deadline" date NOT NULL,
                "userId" uuid NOT NULL,
                "status" "public"."goals_status_enum" NOT NULL DEFAULT 'active',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_goals_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."ai_analyses_type_enum" AS ENUM('monthly_summary', 'forecast', 'tips', 'detection', 'comparison')
        `);
        await queryRunner.query(`
            CREATE TABLE "ai_analyses" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "type" "public"."ai_analyses_type_enum" NOT NULL,
                "period" character varying NOT NULL,
                "result" jsonb NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_analyses_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."generated_reports_type_enum" AS ENUM('monthly', 'annual', 'extract', 'receipt')
        `);
        await queryRunner.query(`
            CREATE TABLE "generated_reports" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "type" "public"."generated_reports_type_enum" NOT NULL,
                "period" character varying NOT NULL,
                "fileUrl" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_generated_reports_id" PRIMARY KEY ("id")
            )
        `);

        // Foreign keys
        await queryRunner.query(`
            ALTER TABLE "categories" ADD CONSTRAINT "FK_categories_user"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_category"
            FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_user"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "budgets" ADD CONSTRAINT "FK_budgets_category"
            FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "budgets" ADD CONSTRAINT "FK_budgets_user"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "goals" ADD CONSTRAINT "FK_goals_user"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "ai_analyses" ADD CONSTRAINT "FK_ai_analyses_user"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "generated_reports" ADD CONSTRAINT "FK_generated_reports_user"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "generated_reports" DROP CONSTRAINT "FK_generated_reports_user"`);
        await queryRunner.query(`ALTER TABLE "ai_analyses" DROP CONSTRAINT "FK_ai_analyses_user"`);
        await queryRunner.query(`ALTER TABLE "goals" DROP CONSTRAINT "FK_goals_user"`);
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_budgets_user"`);
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_budgets_category"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_user"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_category"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_user"`);

        await queryRunner.query(`DROP TABLE "generated_reports"`);
        await queryRunner.query(`DROP TYPE "public"."generated_reports_type_enum"`);
        await queryRunner.query(`DROP TABLE "ai_analyses"`);
        await queryRunner.query(`DROP TYPE "public"."ai_analyses_type_enum"`);
        await queryRunner.query(`DROP TABLE "goals"`);
        await queryRunner.query(`DROP TYPE "public"."goals_status_enum"`);
        await queryRunner.query(`DROP TABLE "budgets"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP TYPE "public"."categories_type_enum"`);
    }
}
