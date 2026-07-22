import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-kakao";

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, "kakao") {
  constructor() {
    const callbackURL = process.env.KAKAO_CALLBACK_URL;
    const clientID = process.env.KAKAO_CLIENT_ID;
    const clientSecret = process.env.KAKAO_CLIENT_SECRET;
    console.log(
      `[KakaoStrategy] clientID=${clientID?.slice(0, 8)}... callbackURL="${callbackURL}" (len=${callbackURL?.length}) hasSecret=${!!clientSecret}`,
    );
    super({
      clientID: clientID!,
      clientSecret: clientSecret ?? "",
      callbackURL: callbackURL!,
      state: false,
    });

    // 디버그: Kakao 토큰 엔드포인트로 전송되는 정확한 파라미터 확인
    const oauth2 = (this as any)._oauth2;
    const origReq = (oauth2._request as Function).bind(oauth2);
    oauth2._request = (
      method: string,
      url: string,
      headers: any,
      body: string,
      token: any,
      cb: any,
    ) => {
      if (url.includes("/oauth/token")) {
        console.log(`[KakaoStrategy] Token POST → ${url}`);
        console.log(`[KakaoStrategy] Token body → ${body}`);
      }
      return origReq(method, url, headers, body, token, cb);
    };
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
