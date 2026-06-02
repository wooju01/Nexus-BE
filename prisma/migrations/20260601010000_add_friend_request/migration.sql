-- CreateEnum
CREATE TYPE "FriendStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "FriendStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_senderId_receiverId_key" ON "FriendRequest"("senderId", "receiverId");
CREATE INDEX "FriendRequest_receiverId_idx" ON "FriendRequest"("receiverId");
CREATE INDEX "FriendRequest_senderId_idx" ON "FriendRequest"("senderId");

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_receiverId_fkey"
  FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
