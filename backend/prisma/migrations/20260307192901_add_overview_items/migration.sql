-- CreateTable
CREATE TABLE "OverviewItem" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "choiceRank" INTEGER NOT NULL,
    "requirementType" TEXT,
    "requirementText" TEXT NOT NULL,
    "hasIt" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OverviewItem_studentId_choiceRank_idx" ON "OverviewItem"("studentId", "choiceRank");

-- AddForeignKey
ALTER TABLE "OverviewItem" ADD CONSTRAINT "OverviewItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
