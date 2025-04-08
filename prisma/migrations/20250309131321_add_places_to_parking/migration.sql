/*
  Warnings:

  - Added the required column `places` to the `Parking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Parking" ADD COLUMN     "places" INTEGER NOT NULL;
