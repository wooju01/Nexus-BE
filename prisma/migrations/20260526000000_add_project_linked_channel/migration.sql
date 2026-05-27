-- AlterTable: Project에 linkedChannelId 컬럼 추가
ALTER TABLE "Project" ADD COLUMN "linkedChannelId" TEXT;

-- CreateIndex: linkedChannelId unique 제약
CREATE UNIQUE INDEX "Project_linkedChannelId_key" ON "Project"("linkedChannelId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_linkedChannelId_fkey" FOREIGN KEY ("linkedChannelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
