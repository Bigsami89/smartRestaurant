/*
  Warnings:

  - Added the required column `updatedAt` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "dinerNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tip" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "requiresKitchen" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "category_history" (
    "id" TEXT NOT NULL,
    "listName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "details" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "category_history" ADD CONSTRAINT "category_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
