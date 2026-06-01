-- AlterTable: User에 username 컬럼 추가 (nullable, unique)
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- CreateIndex: username unique 제약
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
