import { Module } from "@nestjs/common";
import { ChannelMessageController } from "./channel-message.controller";
import { MessageController } from "./message.controller";
import { MessageService } from "./message.service";

@Module({
  controllers: [ChannelMessageController, MessageController],
  providers: [MessageService],
})
export class MessageModule {}
