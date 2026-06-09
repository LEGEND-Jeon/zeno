import PromptBox from "./prompt-box";
import ZenoBadge from "./zeno-badge";

const SUGGESTIONS = [
  "스킨케어 브랜드 기획",
  "디저트 브랜드 로고",
  "프리미엄 디퓨저 패키지",
  "AI 스타트업 랜딩페이지",
];

/*
 * Figma 메타데이터 기반 정확한 원 데이터 (frame: 684.7 × 475.8px)
 *
 * Ellipse 50 (주 밝은 cyan):  중심 (98.2%, -4.4%),  반지름 254px → 54vh
 * Ellipse 52 (중간 teal):     중심  (5.8%, 102.6%), 반지름 249px → 53vh
 * Ellipse 49 (거의 안 보임):  중심 (11.6%,  17.5%), 반지름 246px → 52vh
 * Ellipse 48 (거의 안 보임):  중심 (44.6%,  93.7%), 반지름 208px → 44vh
 *
 * 배치 공식: 각 div는 inset:0(컨테이너 전체). 그라디언트 중심은 at 50% 50%.
 * translate(X%, Y%) 로 이동 → 시각적 중심 = (50+X%, 50+Y%).
 * 따라서 X = 목표중심X - 50, Y = 목표중심Y - 50.
 *
 * 애니메이션: Ellipse50·52만 이동(F1→F2 소폭→F3 대폭→F1)
 */

const HomeHero = () => {
  return (
    <section
      className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden"
      style={{ background: "#000000" }}
    >
      <style>{`
        @keyframes blob50 {
          from { transform: translate(48.2%, -54.4%) scale(3); }
          to   { transform: translate(48.2%,  48.0%) scale(3); }
        }
        @keyframes blob52 {
          from { transform: translate(-44.2%,  52.6%) scale(3); }
          to   { transform: translate(-45.0%, -55.0%) scale(3); }
        }
      `}</style>

      {/* 그라디언트 레이어 — overflow-hidden 으로 클립 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Ellipse 49: 상단 좌측 ambient (희미), 고정 */}
        {/* 마지막 stop: transparent 대신 동일 색상 alpha=0 → 검정 보간 방지 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle 21.7vh at 50% 50%, rgba(54,255,218,0.12) 0%, rgba(27,160,138,0.06) 15%, rgba(54,255,218,0) 33.3%)",
            transform: "translate(-38.4%, -32.5%) scale(3)",
          }}
        />
        {/* Ellipse 48: 하단 중앙 ambient (희미), 고정 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle 18.3vh at 50% 50%, rgba(36,210,182,0.10) 0%, rgba(18,140,122,0.05) 15%, rgba(36,210,182,0) 33.3%)",
            transform: "translate(-5.4%, 43.7%) scale(3)",
          }}
        />
        {/* Ellipse 52: 중간 teal, 하단좌측 → 상단좌측 */}
        {/* 73vh, 6-stop 지수 감쇠, 마지막 stop = 동일 색상 alpha=0 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle 145.5vh at 50% 50%, rgba(36,220,190,0.78) 0%, rgba(35,212,184,0.70) 2.15%, rgba(33,202,176,0.62) 4.3%, rgba(30,188,164,0.53) 6.8%, rgba(27,172,150,0.44) 9.3%, rgba(23,150,132,0.35) 12.3%, rgba(18,126,110,0.26) 15.3%, rgba(12,100,88,0.19) 18.5%, rgba(7,74,65,0.11) 21.7%, rgba(4,52,46,0.08) 24.5%, rgba(2,30,27,0.04) 27.3%, rgba(2,30,27,0.02) 30.3%, rgba(36,220,190,0) 33.3%)",
            opacity: 0.6,
            animation: "blob52 5s ease-in-out infinite alternate",
            animationDelay: "-2.5s",
          }}
        />
        {/* Ellipse 50: 주 밝은 cyan, 상단우측 → 하단우측 */}
        {/* 78vh, 6-stop 지수 감쇠, 마지막 stop = 동일 색상 alpha=0 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle 156vh at 50% 50%, rgba(54,255,218,0.92) 0%, rgba(52,246,210,0.84) 1.65%, rgba(49,234,200,0.76) 3.3%, rgba(45,218,188,0.66) 5.3%, rgba(41,200,174,0.56) 7.3%, rgba(36,178,155,0.46) 10%, rgba(29,152,133,0.35) 12.7%, rgba(21,124,108,0.26) 15.85%, rgba(13,96,84,0.16) 19%, rgba(7,68,60,0.11) 22%, rgba(3,42,37,0.06) 25%, rgba(3,42,37,0.03) 29.15%, rgba(54,255,218,0) 33.3%)",
            opacity: 0.6,
            animation: "blob50 5s ease-in-out infinite alternate",
            animationDelay: "-2.5s",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-[80px]">
        {/* Logo + heading */}
        <div className="flex w-[770px] flex-col items-center gap-[30px]">
          <ZenoBadge size={70} />

          <div className="flex w-full flex-col items-center gap-5">
            <div className="flex w-full flex-col items-center">
              <p
                className="whitespace-nowrap capitalize text-[72px] leading-normal text-white"
                style={{ fontFamily: "var(--font-lato, 'Lato', sans-serif)" }}
              >
                Start designing
              </p>
              <div className="flex w-full items-center justify-center gap-10">
                <p
                  className="whitespace-nowrap capitalize text-[72px] leading-normal text-white"
                  style={{ fontFamily: "var(--font-lato, 'Lato', sans-serif)" }}
                >
                  smarter
                </p>
                <div className="h-[2px] w-[99px] bg-white" />
                <p
                  className="whitespace-nowrap capitalize text-[72px] leading-normal text-white"
                  style={{ fontFamily: "var(--font-lato, 'Lato', sans-serif)" }}
                >
                  with Zeno
                </p>
              </div>
            </div>
            <p className="w-full text-center text-[16px] leading-[1.3] text-white">
              서비스 전략부터 UI까지, 디자인 자동화의 정답, Zeno
            </p>
          </div>
        </div>

        {/* Prompt box + suggestion pills */}
        <div className="flex flex-col items-center gap-[30px]">
          <PromptBox />
          <div className="flex items-center gap-[10px]">
            {SUGGESTIONS.map((text) => (
              <button
                key={text}
                type="button"
                className="flex h-[34px] items-center justify-center whitespace-nowrap rounded-[10px] bg-white/20 px-3 py-1.5 text-[14px] leading-[1.7] text-white"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
