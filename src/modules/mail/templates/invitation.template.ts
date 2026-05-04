/**
 * 초대 메일 본문 빌더.
 *
 * 단일 컬럼 레이아웃 + 인라인 스타일.
 * 이메일 클라이언트 호환성 때문에 외부 CSS 사용 X, table 기반 레이아웃 권장이지만
 * 프로토타입 단계에선 단순한 div + 인라인 스타일로 충분.
 */

type RenderInput = {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: "ADMIN" | "MEMBER";
  acceptUrl: string;
  expiresAt: Date;
};

export function renderInvitationEmail(input: RenderInput): {
  subject: string;
  text: string;
  html: string;
} {
  const roleLabel = input.role === "ADMIN" ? "관리자" : "멤버";
  const expiresLabel = formatDateKo(input.expiresAt);

  const subject = `[Nexus] ${input.workspaceName} 워크스페이스에 초대됐습니다`;

  // text fallback (rich client 가 아닌 경우 / spam filter 우회 도움).
  const text = [
    `안녕하세요,`,
    ``,
    `${input.inviterName}님이 ${input.workspaceName} 워크스페이스의 ${roleLabel} 역할로 초대했습니다.`,
    ``,
    `아래 링크에서 초대를 수락해주세요:`,
    input.acceptUrl,
    ``,
    `이 초대는 ${expiresLabel}까지 유효합니다.`,
    ``,
    `— Nexus 팀`,
  ].join("\n");

  const html = `
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background:#0b0d10; color:#e6e8eb; font-family: 'Inter', 'Pretendard', system-ui, -apple-system, sans-serif;">
  <div style="max-width:560px; margin:0 auto; padding:48px 24px;">
    <div style="font-size:18px; font-weight:700; letter-spacing:-0.01em; color:#ffffff; margin-bottom:32px;">
      Nexus
    </div>

    <div style="background:#15181d; border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:32px;">
      <h1 style="font-size:22px; font-weight:700; margin:0 0 12px; color:#ffffff;">
        ${escapeHtml(input.workspaceName)}에 초대됐습니다
      </h1>
      <p style="font-size:14px; line-height:1.6; margin:0 0 24px; color:#b8bcc4;">
        <strong style="color:#ffffff;">${escapeHtml(input.inviterName)}</strong>님이
        <strong style="color:#ffffff;">${roleLabel}</strong> 역할로 초대했습니다.
        가입 후 워크스페이스에 자동으로 합류됩니다.
      </p>

      <a
        href="${escapeAttr(input.acceptUrl)}"
        style="display:inline-block; background:#3b82f6; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; padding:12px 20px; border-radius:10px;"
      >
        초대 수락하기
      </a>

      <p style="font-size:12px; line-height:1.5; margin:24px 0 0; color:#7a808a;">
        버튼이 동작하지 않으면 아래 링크를 복사해서 브라우저에 붙여넣으세요.
      </p>
      <p style="font-size:12px; line-height:1.5; margin:6px 0 0; color:#7a808a; word-break:break-all;">
        ${escapeHtml(input.acceptUrl)}
      </p>
    </div>

    <p style="font-size:12px; color:#7a808a; margin:24px 0 0;">
      이 초대는 <strong>${escapeHtml(expiresLabel)}</strong>까지 유효합니다.
    </p>
    <p style="font-size:11px; color:#5b606a; margin:32px 0 0;">
      이 메일을 받기를 원하지 않으셨다면 무시하셔도 됩니다. 초대를 수락하지 않으면
      아무 일도 일어나지 않습니다.
    </p>
  </div>
</body>
</html>`.trim();

  return { subject, text, html };
}

function formatDateKo(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${hh}:${mm}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
