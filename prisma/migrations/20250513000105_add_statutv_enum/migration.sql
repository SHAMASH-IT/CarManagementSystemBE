/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatutV" AS ENUM ('HIDDEN', 'VISIBLE');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "statut" "StatutV" NOT NULL DEFAULT 'VISIBLE';

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
