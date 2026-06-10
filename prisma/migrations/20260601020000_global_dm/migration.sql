-- Channel.workspaceId를 nullable로 변경 (DM은 워크스페이스 없이 글로벌 운용)
ALTER TABLE "Channel" ALTER COLUMN "workspaceId" DROP NOT NULL;

-- 기존 DM/GROUP_DM 채널의 workspaceId를 NULL로 전환
UPDATE "Channel" SET "workspaceId" = NULL WHERE "type" IN ('DM', 'GROUP_DM');
