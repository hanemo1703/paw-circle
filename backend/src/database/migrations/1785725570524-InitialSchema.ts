import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1785725570524 implements MigrationInterface {
    name = 'InitialSchema1785725570524'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."posts_type_enum" AS ENUM('LOST', 'ADOPTION', 'SUPPLY', 'TRADE')`);
        await queryRunner.query(`CREATE TYPE "public"."posts_status_enum" AS ENUM('OPEN', 'RESOLVED', 'CLOSED')`);
        await queryRunner.query(`CREATE TYPE "public"."posts_gender_enum" AS ENUM('MALE', 'FEMALE', 'UNKNOWN')`);
        await queryRunner.query(`CREATE TABLE "posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."posts_type_enum" NOT NULL, "status" "public"."posts_status_enum" NOT NULL DEFAULT 'OPEN', "title" character varying NOT NULL, "description" text NOT NULL, "images" text array NOT NULL DEFAULT '{}', "latitude" double precision, "longitude" double precision, "address" character varying, "provinceCode" integer, "wardCode" integer, "price" double precision, "species" character varying, "breed" character varying, "color" character varying, "size" double precision, "gender" "public"."posts_gender_enum", "collarDescription" character varying, "pets" jsonb, "authorId" uuid NOT NULL, "petId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_560752d45d78a3332853345e32" ON "posts" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_a69d9e2ae78ef7d100f8317ae0" ON "posts" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_8e2260af8fc4095d3f183a6585" ON "posts" ("provinceCode") `);
        await queryRunner.query(`CREATE INDEX "IDX_c5a322ad12a7bf95460c958e80" ON "posts" ("authorId") `);
        await queryRunner.query(`CREATE INDEX "IDX_46bc204f43827b6f25e0133dbf" ON "posts" ("createdAt") `);
        await queryRunner.query(`CREATE TYPE "public"."pets_species_enum" AS ENUM('DOG', 'CAT', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "pets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying, "species" "public"."pets_species_enum" NOT NULL, "breed" character varying, "color" character varying, "age" integer, "description" text, "microchipId" character varying, "avatarUrl" character varying, "ownerId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d01e9e7b4ada753c826720bee8b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_275e1bb3fdeea68f8356d8e1eb" ON "pets" ("ownerId") `);
        await queryRunner.query(`CREATE TABLE "donations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" double precision NOT NULL, "message" text, "anonymous" boolean NOT NULL DEFAULT false, "proofImageUrl" character varying, "donorId" uuid NOT NULL, "campaignId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c01355d6f6f50fc6d1b4a946abf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e3eebd26ba5ec476feb06c93ce" ON "donations" ("donorId") `);
        await queryRunner.query(`CREATE INDEX "IDX_dce45a84508ba5fd75e35d6f2a" ON "donations" ("campaignId") `);
        await queryRunner.query(`CREATE TYPE "public"."donation_campaigns_postertype_enum" AS ENUM('INDIVIDUAL', 'ORGANIZATION')`);
        await queryRunner.query(`CREATE TYPE "public"."donation_campaigns_category_enum" AS ENUM('FOOD_SUPPLIES', 'MEDICAL', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "public"."donation_campaigns_status_enum" AS ENUM('ACTIVE', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "donation_campaigns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "posterType" "public"."donation_campaigns_postertype_enum" NOT NULL DEFAULT 'INDIVIDUAL', "category" "public"."donation_campaigns_category_enum" NOT NULL DEFAULT 'OTHER', "categoryOther" character varying, "organizationLink" character varying, "title" character varying NOT NULL, "description" text NOT NULL, "images" text array NOT NULL DEFAULT '{}', "targetAmount" double precision, "currentAmount" double precision NOT NULL DEFAULT '0', "deadline" TIMESTAMP WITH TIME ZONE, "bankName" character varying, "bankAccountNumber" character varying, "bankAccountHolder" character varying, "qrImageUrl" character varying, "contactPhone" character varying, "contactEmail" character varying, "pickupAddress" character varying, "status" "public"."donation_campaigns_status_enum" NOT NULL DEFAULT 'ACTIVE', "creatorId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d592dfa0964d30ef0095c66b45a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f70814ebe911a492f32122304b" ON "donation_campaigns" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_33d7cea9c950689fd576167053" ON "donation_campaigns" ("creatorId") `);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "senderId" uuid NOT NULL, "receiverId" uuid NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2db9cf2b3ca111742793f6c37c" ON "messages" ("senderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_acf951a58e3b9611dd96ce8904" ON "messages" ("receiverId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6ce6acdb0801254590f8a78c08" ON "messages" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_25d41a45259dbc644a746b7337" ON "messages" ("receiverId", "isRead") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'ORGANIZATION', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying, "name" character varying NOT NULL, "phone" character varying, "avatarUrl" character varying, "googleId" character varying, "facebookId" character varying, "provider" character varying NOT NULL DEFAULT 'local', "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "isVerifiedOrg" boolean NOT NULL DEFAULT false, "showPhonePublicly" boolean NOT NULL DEFAULT true, "showEmailPublicly" boolean NOT NULL DEFAULT false, "resetPasswordToken" character varying, "resetPasswordExpires" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_f382af58ab36057334fb262efd5" UNIQUE ("googleId"), CONSTRAINT "UQ_f9740e1e654a5daddb82c60bd75" UNIQUE ("facebookId"), CONSTRAINT "UQ_4e8c8c78bc87861c7fb6b44bd3f" UNIQUE ("resetPasswordToken"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('MESSAGE', 'DONATION')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "recipientId" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "content" text NOT NULL, "link" character varying, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_22dbdf106e7981d0d8e1aed884" ON "notifications" ("recipientId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "FK_c5a322ad12a7bf95460c958e80e" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "FK_09a2a9477b6dbd5a033e4aa0038" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pets" ADD CONSTRAINT "FK_275e1bb3fdeea68f8356d8e1ebb" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donations" ADD CONSTRAINT "FK_e3eebd26ba5ec476feb06c93cea" FOREIGN KEY ("donorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donations" ADD CONSTRAINT "FK_dce45a84508ba5fd75e35d6f2a4" FOREIGN KEY ("campaignId") REFERENCES "donation_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donation_campaigns" ADD CONSTRAINT "FK_33d7cea9c950689fd576167053c" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_acf951a58e3b9611dd96ce89042" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_db873ba9a123711a4bff527ccd5" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_db873ba9a123711a4bff527ccd5"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_acf951a58e3b9611dd96ce89042"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`);
        await queryRunner.query(`ALTER TABLE "donation_campaigns" DROP CONSTRAINT "FK_33d7cea9c950689fd576167053c"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_dce45a84508ba5fd75e35d6f2a4"`);
        await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_e3eebd26ba5ec476feb06c93cea"`);
        await queryRunner.query(`ALTER TABLE "pets" DROP CONSTRAINT "FK_275e1bb3fdeea68f8356d8e1ebb"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_09a2a9477b6dbd5a033e4aa0038"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_c5a322ad12a7bf95460c958e80e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_22dbdf106e7981d0d8e1aed884"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_25d41a45259dbc644a746b7337"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6ce6acdb0801254590f8a78c08"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_acf951a58e3b9611dd96ce8904"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2db9cf2b3ca111742793f6c37c"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_33d7cea9c950689fd576167053"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f70814ebe911a492f32122304b"`);
        await queryRunner.query(`DROP TABLE "donation_campaigns"`);
        await queryRunner.query(`DROP TYPE "public"."donation_campaigns_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."donation_campaigns_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."donation_campaigns_postertype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dce45a84508ba5fd75e35d6f2a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e3eebd26ba5ec476feb06c93ce"`);
        await queryRunner.query(`DROP TABLE "donations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_275e1bb3fdeea68f8356d8e1eb"`);
        await queryRunner.query(`DROP TABLE "pets"`);
        await queryRunner.query(`DROP TYPE "public"."pets_species_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_46bc204f43827b6f25e0133dbf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c5a322ad12a7bf95460c958e80"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8e2260af8fc4095d3f183a6585"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a69d9e2ae78ef7d100f8317ae0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_560752d45d78a3332853345e32"`);
        await queryRunner.query(`DROP TABLE "posts"`);
        await queryRunner.query(`DROP TYPE "public"."posts_gender_enum"`);
        await queryRunner.query(`DROP TYPE "public"."posts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."posts_type_enum"`);
    }

}
