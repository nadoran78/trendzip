import Link from "next/link";

export function SiteFooter({ subtitle }: { subtitle: string }) {
  return (
    <footer className="tz-round px-4 pb-9 pt-8 text-center text-[13px] font-bold text-white/20">
      trend<span className="text-[#00e5ff]/40">zip</span>
      <span className="text-[#ff2d9b]/40">♡</span>
      <p className="mt-1 font-sans text-[10px] font-medium text-white/15">
        {subtitle}
      </p>
      <Link
        href="/privacy"
        className="mt-3 inline-flex font-sans text-[10px] font-semibold text-white/35 underline decoration-white/15 underline-offset-4 transition-colors hover:text-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
      >
        개인정보 및 분석 설정
      </Link>
    </footer>
  );
}
