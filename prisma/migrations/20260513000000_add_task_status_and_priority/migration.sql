-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

-- AlterEnum: Priority (LOW/NORMAL/HIGH/URGENT -> P1/P2/P3)
ALTER TABLE "Task" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "priority" TYPE TEXT;
DROP TYPE "Priority";
CREATE TYPE "Priority" AS ENUM ('P1', 'P2', 'P3');
ALTER TABLE "Task" ALTER COLUMN "priority" TYPE "Priority" USING (
  CASE "priority"
    WHEN 'URGENT' THEN 'P1'
    WHEN 'HIGH' THEN 'P1'
    WHEN 'NORMAL' THEN 'P2'
    WHEN 'LOW' THEN 'P3'
    ELSE 'P2'
  END
)::"Priority";
ALTER TABLE "Task" ALTER COLUMN "priority" SET DEFAULT 'P2'::"Priority";

-- AlterTable: Project
ALTER TABLE "Project" ADD COLUMN "taskCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Task
ALTER TABLE "Task" ADD COLUMN "number" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "status" "TaskStatus" NOT NULL DEFAULT 'BACKLOG';
ALTER TABLE "Task" ALTER COLUMN "columnId" DROP NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "order" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Task_projectId_number_key" ON "Task"("projectId", "number");
CREATE INDEX "Task_status_idx" ON "Task"("status");
