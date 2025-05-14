/*
  Warnings:

  - You are about to drop the column `rne` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[matf]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_rne_key";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "interventionId" INTEGER,
ALTER COLUMN "appointmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "rne",
ADD COLUMN     "matf" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_matf_key" ON "User"("matf");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;
