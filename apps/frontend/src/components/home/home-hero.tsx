/* import Link from "next/link";
import ZenoMark from "./zeno-mark";

const HomeHero = () => {
  return (
    <section className="relative h-screen overflow-hidden bg-[#3bf9ad] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-12%] h-[34rem] w-[34rem] rounded-full bg-emerald-400/15 blur-[160px]" />
        <div className="absolute left-[8%] top-[18%] h-[20rem] w-[20rem] rounded-full bg-emerald-500/12 blur-[120px]" />
        <div className="absolute right-[-8%] top-[6%] h-[44rem] w-[44rem] rounded-full bg-teal-300/20 blur-[180px]" />
        <div className="absolute right-[4%] top-[36%] h-[24rem] w-[24rem] rounded-full bg-emerald-300/18 blur-[120px]" />
        <div className="absolute left-1/2 top-0 h-full w-[26rem] -translate-x-1/2 bg-emerald-400/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_28%,rgba(0,0,0,0.35)_52%,rgba(0,0,0,0.86)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.92)_34%,rgba(0,0,0,0.96)_52%,rgba(0,0,0,0.28)_100%)]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 pb-4 pt-6 md:px-10 md:pt-8">
        <Link href="/" className="flex items-center gap-3">
          <ZenoMark className="h-9 w-9" />
          <span className="text-xl font-medium tracking-[-0.03em] text-white/90">
            ZENO
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-md transition hover:bg-white/10"
          >
            Log In
          </button>
          <button
            type="button"
            className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-[#062a23] transition hover:bg-emerald-300"
          >
            회원가입
          </button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-[calc(100vh-88px)] flex-col items-center justify-center px-6 pb-12 md:px-10">
        <div className="flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center">
          <div className="mb-8">
            <ZenoMark className="h-20 w-20 md:h-24 md:w-24" />
          </div>

          <h1 className="max-w-[980px] text-center text-[3.4rem] font-light leading-[0.98] tracking-[-0.08em] text-white md:text-[5.5rem]">
            <span className="block">Start Designing</span>
            <span className="mt-2 block">Smarter — With Zeno</span>
          </h1>

          <p className="mt-6 text-center text-sm text-white/70 md:text-base">
            서비스 전략부터 UI까지, 디자인 자동화의 정답, Zeno
          </p>

          <div className="mt-16 w-full max-w-[1020px]">
            <div className="relative rounded-[28px] border border-black/10 bg-white/90 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-6">
              <textarea
                className="h-[140px] w-full resize-none border-none bg-transparent pr-14 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400 md:h-[150px] md:text-base"
                placeholder="무엇이든 물어보세요. Zeno가 도와드려요."
              />

              <button
                type="button"
                aria-label="파일 추가"
                className="absolute bottom-5 left-5 flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-2xl leading-none text-neutral-500 shadow-sm"
              >
                +
              </button>

              <button
                type="button"
                aria-label="전송"
                className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-black text-lg text-white"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="info"
        className="absolute bottom-8 right-8 z-10 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-xl text-white/85 shadow-[0_0_25px_rgba(16,240,180,0.18)] backdrop-blur-md"
      >
        i
      </button>
    </section>
  );
};

export default HomeHero;
 */

import PromptBox from "./prompt-box";
import ZenoMark from "./zeno-mark";

const HomeHero = () => {
  return (
    <section className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-[#3bf9ad] px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-6%] h-[26rem] w-[26rem] rounded-full bg-emerald-400/12 blur-[140px]" />
        <div className="absolute left-[8%] top-[18%] h-[22rem] w-[22rem] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute left-[10%] bottom-[-10%] h-[18rem] w-[18rem] rounded-full bg-green-500/12 blur-[120px]" />
        <div className="absolute left-1/2 top-0 h-full w-[24rem] -translate-x-1/2 bg-emerald-400/8 blur-[120px]" />
        <div className="absolute right-[-10%] top-[-2%] h-[38rem] w-[38rem] rounded-full bg-teal-200/22 blur-[180px]" />
        <div className="absolute right-[8%] top-[42%] h-[26rem] w-[26rem] rounded-full bg-emerald-400/14 blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.15)_30%,rgba(0,0,0,0.72)_70%,rgba(0,0,0,0.9)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.22)_0%,rgba(0,0,0,0.84)_18%,rgba(0,0,0,0.92)_48%,rgba(0,0,0,0.18)_100%)]" />
      </div>

      <div className="relative z-10 flex w-full max-w-[1080px] flex-col items-center justify-center">
        <div className="mb-9">
          <ZenoMark className="h-14 w-14" />
        </div>

        <h1 className="text-center text-[clamp(4rem,7vw,6.25rem)] font-light leading-[0.94] tracking-[-0.07em] text-white">
          <span className="block">Start Designing</span>
          <span className="mt-2 block">Smarter — With Zeno</span>
        </h1>

        <p className="mt-7 text-center text-sm text-white/72">
          서비스 전략부터 UI까지, 디자인 자동화의 정답, Zeno
        </p>

        <div className="mt-20 w-full">
          <PromptBox />
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
