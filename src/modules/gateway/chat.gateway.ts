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

  // 사용자 상태 업데이트 및 클라이언트에 알림
  private async setPresence(userId: string, status: PresenceStatus) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status, lastSeenAt: new Date() },
    });
    this.server.emit("presence.changed", { userId, status });
  }
}
