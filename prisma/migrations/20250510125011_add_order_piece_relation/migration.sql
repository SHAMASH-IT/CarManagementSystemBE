/*
  Warnings:

  - You are about to drop the column `pieceId` on the `Intervention` table. All the data in the column will be lost.
  - You are about to drop the column `pieceId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Order` table. All the data in the column will be lost.
  - Made the column `pieceId` on table `InterventionPiece` required. This step will fail if there are existing NULL values in that column.
  - Made the column `interventionId` on table `InterventionPiece` required. This step will fail if there are existing NULL values in that column.
  - Made the column `quantity` on table `InterventionPiece` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalPrice` on table `InterventionPiece` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `ordertype` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerId` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatusOrder" AS ENUM ('BUYING', 'SELLING');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPPLIER';

-- DropForeignKey
ALTER TABLE "Intervention" DROP CONSTRAINT "Intervention_pieceId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_pieceId_fkey";

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Intervention" DROP COLUMN "pieceId",
ADD COLUMN     "commentaire" TEXT,
ADD COLUMN     "rate" INTEGER;

-- AlterTable
ALTER TABLE "InterventionPiece" ALTER COLUMN "pieceId" SET NOT NULL,
ALTER COLUMN "interventionId" SET NOT NULL,
ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "totalPrice" SET NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "pieceId",
DROP COLUMN "quantity",
ADD COLUMN     "ordertype" "StatusOrder" NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Piece" ADD COLUMN     "marque" TEXT,
ALTER COLUMN "initialPrice" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "providerId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "OrderPiece" (
    "id" SERIAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "pieceId" INTEGER NOT NULL,

    CONSTRAINT "OrderPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_OrderToPiece" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_OrderToPiece_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_OrderToPiece_B_index" ON "_OrderToPiece"("B");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPiece" ADD CONSTRAINT "OrderPiece_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPiece" ADD CONSTRAINT "OrderPiece_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderToPiece" ADD CONSTRAINT "_OrderToPiece_A_fkey" FOREIGN KEY ("A") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderToPiece" ADD CONSTRAINT "_OrderToPiece_B_fkey" FOREIGN KEY ("B") REFERENCES "Piece"("id") ON DELETE CASCADE ON UPDATE CASCADE;
