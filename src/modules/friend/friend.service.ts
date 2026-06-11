import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { FriendStatus } from "@prisma/client";
import type { SendFriendRequestDto } from "./dto/send-friend-request.dto";

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  status: true,
};

@Injectable()
export class FriendService {
  constructor(private readonly prisma: PrismaService) {}

  // POST /friends/requests — username으로 친구 요청
  async sendRequest(senderId: string, dto: SendFriendRequestDto) {
    const receiver = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: USER_SELECT,
    });
    if (!receiver)
      throw new NotFoundException("해당 username의 유저를 찾을 수 없습니다.");
    if (receiver.id === senderId)
      throw new BadRequestException(
        "자기 자신에게 친구 요청을 보낼 수 없습니다.",
      );

    // 이미 요청이 존재하는지 확인 (양방향)
    const existing = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendStatus.ACCEPTED)
        throw new ConflictException("이미 친구입니다.");
      if (existing.status === FriendStatus.PENDING)
        throw new ConflictException(
          "이미 친구 요청을 보냈거나 받은 상태입니다.",
        );
      if (existing.status === FriendStatus.BLOCKED)
        throw new ForbiddenException("차단된 유저입니다.");
    }

    return this.prisma.friendRequest.create({
      data: { senderId, receiverId: receiver.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        receiver: { select: USER_SELECT },
      },
    });
  }

  // GET /friends/requests/received — 받은 요청 목록
  async getReceivedRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { receiverId: userId, status: FriendStatus.PENDING },
      select: {
        id: true,
        status: true,
        createdAt: true,
        sender: { select: USER_SELECT },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // GET /friends/requests/sent — 보낸 요청 목록
  async getSentRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { senderId: userId, status: FriendStatus.PENDING },
      select: {
        id: true,
        status: true,
        createdAt: true,
        receiver: { select: USER_SELECT },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // PATCH /friends/requests/:id/accept
  async acceptRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException("친구 요청을 찾을 수 없습니다.");
    if (request.receiverId !== userId) throw new ForbiddenException();
    if (request.status !== FriendStatus.PENDING)
      throw new ConflictException("이미 처리된 요청입니다.");

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: FriendStatus.ACCEPTED },
      select: {
        id: true,
        status: true,
        sender: { select: USER_SELECT },
      },
    });
  }

  // PATCH /friends/requests/:id/decline
  async declineRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException("친구 요청을 찾을 수 없습니다.");
    if (request.receiverId !== userId) throw new ForbiddenException();
    if (request.status !== FriendStatus.PENDING)
      throw new ConflictException("이미 처리된 요청입니다.");

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: FriendStatus.DECLINED },
    });
  }

  // DELETE /friends/requests/:id — 내가 보낸 요청 취소
  async cancelRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException("친구 요청을 찾을 수 없습니다.");
    if (request.senderId !== userId) throw new ForbiddenException();
    if (request.status !== FriendStatus.PENDING)
      throw new ConflictException("이미 처리된 요청입니다.");

    // 다시 요청을 보낼 수 있도록 레코드를 삭제
    await this.prisma.friendRequest.delete({ where: { id: requestId } });
  }

  // GET /friends — 수락된 친구 목록
  async getFriends(userId: string) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        status: FriendStatus.ACCEPTED,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: {
        id: true,
        senderId: true,
        sender: { select: USER_SELECT },
        receiver: { select: USER_SELECT },
      },
    });

    // 상대방 정보만 추출
    return requests.map((r) => ({
      friendRequestId: r.id,
      user: r.senderId === userId ? r.receiver : r.sender,
    }));
  }

  // DELETE /friends/:userId — 친구 삭제
  async removeFriend(userId: string, friendUserId: string) {
    const request = await this.prisma.friendRequest.findFirst({
      where: {
        status: FriendStatus.ACCEPTED,
        OR: [
          { senderId: userId, receiverId: friendUserId },
          { senderId: friendUserId, receiverId: userId },
        ],
      },
    });
    if (!request) throw new NotFoundException("친구 관계를 찾을 수 없습니다.");

    await this.prisma.friendRequest.delete({ where: { id: request.id } });
  }
}
