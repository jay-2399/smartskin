-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paymentSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_paymentSessionId_key" ON "User"("paymentSessionId");
