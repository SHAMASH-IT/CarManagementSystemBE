-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_interventionId_fkey";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "orderId" INTEGER,
ALTER COLUMN "interventionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
