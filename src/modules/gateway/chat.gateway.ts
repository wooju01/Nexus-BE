import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { PresenceStatus } from "@prisma/client";

// CORS 설정을 통해 모든 도메인에서의 WebSocket 연결 허용
@WebSocketGateway({ cors: { origin: "*" } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  // userId → socketId 집합 (멀티 탭/디바이스 지원)
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth as { token?: string }).token ??
      client.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      client.data.userId = payload.sub;

      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      // 첫 소켓 연결 시에만 ONLINE으로 전환
      if (this.userSockets.get(payload.sub)!.size === 1) {
        await this.setPresence(payload.sub, PresenceStatus.ONLINE);
      }

      // DM 채널 룸 자동 join — FE가 channel.join을 emit하기 전에도 알림 수신 가능
      const dmChannels = await this.prisma.channelMember.findMany({
        where: {
          userId: payload.sub,
          channel: { type: { in: ["DM", "GROUP_DM"] } },
        },
        select: { channelId: true },
      });
      for (const { channelId } of dmChannels) {
        await client.join(`channel:${channelId}`);
      }
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        await this.setPresence(userId, PresenceStatus.OFFLINE);
      }
    }
  }

  // 채널 참여/퇴장 및 타이핑 이벤트 처리
  @SubscribeMessage("channel.join")
  handleChannelJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() channelId: string,
  ) {
    client.join(`channel:${channelId}`);
  }

  @SubscribeMessage("channel.leave")
  handleChannelLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() channelId: string,
  ) {
    client.leave(`channel:${channelId}`);
  }

  @SubscribeMessage("typing.start")
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() channelId: string,
  ) {
    client.to(`channel:${channelId}`).emit("typing.start", {
      userId: client.data.userId,
      channelId,
    });
  }

  @SubscribeMessage("typing.stop")
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() channelId: string,
  ) {
    client.to(`channel:${channelId}`).emit("typing.stop", {
      userId: client.data.userId,
      channelId,
    });
  }

  // 채널에 이벤트를 브로드캐스트하는 유틸리티 메서드

  broadcastToChannel(event: string, channelId: string, payload: unknown) {
    this.server.to(`channel:${channelId}`).emit(event, payload);
  }

  // ── 프로젝트(보드) 룸 ─────────────────────────────────────────────────
  //
  // 보드 페이지에 머무는 동안 클라이언트가 project.join 으로 룸에 합류하면
  // TaskService 에서 broadcastToProject 로 동일 보드를 보는 모든 사용자에게
  // task.created / task.updated / task.deleted 이벤트가 전달된다.

  @SubscribeMessage("project.join")
  handleProjectJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() projectId: string,
  ) {
    client.join(`project:${projectId}`);
  }

  @SubscribeMessage("project.leave")
  handleProjectLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() projectId: string,
  ) {
    client.leave(`project:${projectId}`);
  }

  /** TaskService 등 외부 모듈에서 보드 이벤트를 브로드캐스트할 때 사용. */
  broadcastToProject(event: string, projectId: string, payload: unknown) {
    this.server.to(`project:${projectId}`).emit(event, payload);
  }

  // 사용자 상태 업데이트 및 클라이언트에 알림
  private async setPresence(userId: string, status: PresenceStatus) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status, lastSeenAt: new Date() },
    });
    this.server.emit("presence.changed", { userId, status });
  }
}
