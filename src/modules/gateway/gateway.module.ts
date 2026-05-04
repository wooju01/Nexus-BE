import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ChatGateway } from "./chat.gateway";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
    }),
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}
