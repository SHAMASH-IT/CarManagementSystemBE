/*
  Warnings:

  - The `status` column on the `Location` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Location" DROP COLUMN "status",
ADD COLUMN     "status" "StatusP" NOT NULL DEFAULT 'EMPTY';
