import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-kakao";

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, "kakao") {
  constructor() {
    const callbackURL = process.env.KAKAO_CALLBACK_URL;
    const clientID = process.env.KAKAO_CLIENT_ID;
    console.log(
      `[KakaoStrategy] clientID=${clientID?.slice(0, 8)}... callbackURL=${callbackURL}`,
    );
    super({
      clientID: clientID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
      callbackURL: callbackURL!,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ) {
    const { id, displayName, _json } = profile;
    const email = _json?.kakao_account?.email;

    done(null, {
      provider: "kakao",
      providerAccountId: String(id),
      email: email ?? `kakao_${id}@nexus.local`,
      name: displayName,
    });
  }
}
