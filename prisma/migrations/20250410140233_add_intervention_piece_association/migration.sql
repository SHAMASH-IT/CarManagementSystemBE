-- CreateTable
CREATE TABLE "InterventionPiece" (
    "id" SERIAL NOT NULL,
    "pieceId" INTEGER,
    "interventionId" INTEGER,
    "quantity" INTEGER,
    "totalPrice" DOUBLE PRECISION,

    CONSTRAINT "InterventionPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PieceInterventions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PieceInterventions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PieceInterventions_B_index" ON "_PieceInterventions"("B");

-- AddForeignKey
ALTER TABLE "InterventionPiece" ADD CONSTRAINT "InterventionPiece_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionPiece" ADD CONSTRAINT "InterventionPiece_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PieceInterventions" ADD CONSTRAINT "_PieceInterventions_A_fkey" FOREIGN KEY ("A") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PieceInterventions" ADD CONSTRAINT "_PieceInterventions_B_fkey" FOREIGN KEY ("B") REFERENCES "Piece"("id") ON DELETE CASCADE ON UPDATE CASCADE;
