/*
  Warnings:

  - Added the required column `initialPrice` to the `Piece` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Piece" ADD COLUMN     "initialPrice" DOUBLE PRECISION NOT NULL;
