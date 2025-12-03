-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('GENERAL', 'TRANSACTION', 'THRESHOLD');

-- AlterTable
ALTER TABLE "reminders" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "reminderType" "ReminderType" DEFAULT 'GENERAL',
ADD COLUMN     "thresholdAmount" DECIMAL(10,2),
ADD COLUMN     "transactionAmount" DECIMAL(10,2),
ADD COLUMN     "transactionType" "TransactionType";

-- CreateIndex
CREATE INDEX "reminders_userId_reminderType_completed_idx" ON "reminders"("userId", "reminderType", "completed");

-- CreateIndex
CREATE INDEX "reminders_categoryId_idx" ON "reminders"("categoryId");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

