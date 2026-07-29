export function LiveStatus() {
  return (
    <span className="tz-round inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white">
      <span className="relative size-1.5" aria-hidden="true">
        <span className="tz-live-pulse absolute inset-0 rounded-full bg-[#ff3b3b]" />
        <span className="absolute inset-0 rounded-full bg-[#ff3b3b] shadow-[0_0_8px_#ff3b3b]" />
      </span>
      LIVE
    </span>
  );
}
