import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-kakao";

// Render 프록시가 느린 응답을 재시도하면 동일 코드로 교환이 2번 발생한다.
// 첫 번째 교환 결과를 캐싱해 두 번째 요청이 재사용하도록 한다.
const inFlightExchanges = new Map<
  string,
  Promise<{ err: any; at: string; rt: string; p: any }>
>();

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

    const oauth2 = (this as any)._oauth2;
    const origGetToken = (
      oauth2.getOAuthAccessToken as Function
    ).bind(oauth2);

    oauth2.getOAuthAccessToken = (
      code: string,
      params: any,
      callback: (...args: any[]) => void,
    ) => {
      console.log(
        `[KakaoStrategy] Token exchange: code=${code?.slice(0, 20)}...`,
      );

      const existing = inFlightExchanges.get(code);
      if (existing) {
        // Render 재시도: 동일 코드로 두 번째 요청 → 첫 번째 결과 재사용
        console.log(
          `[KakaoStrategy] Duplicate exchange — reusing first result for code=${code?.slice(0, 20)}...`,
        );
        void existing.then(({ err, at, rt, p }) => callback(err, at, rt, p));
        return;
      }

      let resolve!: (v: { err: any; at: string; rt: string; p: any }) => void;
      const promise = new Promise<{ err: any; at: string; rt: string; p: any }>(
        (res) => {
          resolve = res;
        },
      );
      inFlightExchanges.set(code, promise);
      setTimeout(() => inFlightExchanges.delete(code), 60_000);

      origGetToken(code, params, (err: any, at: string, rt: string, p: any) => {
        console.log(
          `[KakaoStrategy] Token result: hasToken=${!!at} err=${err ? JSON.stringify(err) : "none"}`,
        );
        resolve({ err, at, rt, p });
        callback(err, at, rt, p);
      });
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
