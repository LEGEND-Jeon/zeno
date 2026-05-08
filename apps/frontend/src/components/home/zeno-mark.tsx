/* type ZenoMarkProps = {
  className?: string;
};

const ZenoMark = ({ className = "" }: ZenoMarkProps) => {
  return (
    <div
      className={`relative h-12 w-12 shrink-0 rounded-full border border-emerald-400/30
      bg-[radial-gradient(circle_at_30%_30%,rgba(57,255,203,0.35),rgba(5,18,17,0.95)_72%)]
      shadow-[0_0_30px_rgba(16,240,180,0.28)] ${className}`}
    >
      <span className="absolute left-1/2 top-1/2 h-[2px] w-[46%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,255,214,0.8)]" />
      <span className="absolute left-1/2 top-1/2 h-[2px] w-[46%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,255,214,0.8)]" />
    </div>
  );
};

export default ZenoMark;
 */
type ZenoMarkProps = {
  className?: string;
};

const ZenoMark = ({ className = "" }: ZenoMarkProps) => {
  return (
    <div
      className={`relative rounded-full border border-emerald-300/25 bg-[radial-gradient(circle_at_30%_30%,rgba(56,255,214,0.38),rgba(0,18,15,0.96)_68%)] shadow-[0_0_30px_rgba(22,236,187,0.22)] ${className}`}
    >
      <span className="absolute left-1/2 top-1/2 h-[2px] w-[46%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(68,255,220,0.95)]" />
      <span className="absolute left-1/2 top-1/2 h-[2px] w-[46%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(68,255,220,0.95)]" />
    </div>
  );
};

export default ZenoMark;
