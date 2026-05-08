import ZenoMark from "./zeno-mark";

type NavItemButtonProps = {
  children: React.ReactNode;
  label: string;
  isDark?: boolean;
};

const NavItemButton = ({ children, label, isDark }: NavItemButtonProps) => {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
        isDark
          ? "text-white/60 hover:bg-white/10 hover:text-white"
          : "text-[#222] hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
};

const LayersIcon = () => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4L4 8.5L12 13L20 8.5L12 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.5 12L12 15L17.5 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.5 15.5L12 18.5L17.5 15.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

const InfoIcon = () => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 10.2V15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7.7" r="0.9" fill="currentColor" />
    </svg>
  );
};

const SettingsIcon = () => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 8.8A3.2 3.2 0 1 0 12 15.2A3.2 3.2 0 1 0 12 8.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M19 12C19 11.53 18.96 11.07 18.88 10.63L21 9L19 5.5L16.57 6.25C15.88 5.69 15.11 5.23 14.28 4.91L13.75 2.4H10.25L9.72 4.91C8.89 5.23 8.12 5.69 7.43 6.25L5 5.5L3 9L5.12 10.63C5.04 11.07 5 11.53 5 12C5 12.47 5.04 12.93 5.12 13.37L3 15L5 18.5L7.43 17.75C8.12 18.31 8.89 18.77 9.72 19.09L10.25 21.6H13.75L14.28 19.09C15.11 18.77 15.88 18.31 16.57 17.75L19 18.5L21 15L18.88 13.37C18.96 12.93 19 12.47 19 12Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const GuestCard = () => {
  return (
    <div className="absolute bottom-0 left-[76px] w-52 rounded-2xl border border-black/8 bg-white p-3 shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-[#111]">Guest</div>
        <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-semibold text-[#063a30]">
          free
        </span>
      </div>

      <p className="mt-1 text-xs text-neutral-500">
        로그인하면 워크스페이스 저장과 히스토리 관리가 가능해요.
      </p>

      <div className="mt-3 space-y-1.5">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[12px] text-neutral-700 transition hover:bg-neutral-50"
        >
          <span>로그인</span>
          <span>↗</span>
        </button>

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[12px] text-neutral-700 transition hover:bg-neutral-50"
        >
          <span>회원가입</span>
          <span>+</span>
        </button>
      </div>
    </div>
  );
};

type SideNavProps = {
  showGuestCard?: boolean;
  variant?: "light" | "dark";
};

const SideNav = ({ showGuestCard = true, variant = "light" }: SideNavProps) => {
  const isDark = variant === "dark";

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col items-center justify-between overflow-visible ${
        isDark
          ? "w-[90px] border-r border-white/20 bg-black/40"
          : "w-[76px] border-r border-black/6 bg-white"
      }`}
    >
      <div className="flex w-full flex-col items-center pt-4">
        <button
          type="button"
          aria-label="Zeno home"
          className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
            isDark ? "hover:bg-white/10" : "hover:bg-black/5"
          }`}
        >
          <ZenoMark className={isDark ? "h-7 w-7" : "h-6 w-6"} />
        </button>

        <div className="mt-8 flex flex-col items-center gap-3">
          <NavItemButton label="workspace" isDark={isDark}>
            <LayersIcon />
          </NavItemButton>

          <NavItemButton label="info" isDark={isDark}>
            <InfoIcon />
          </NavItemButton>

          <div
            className={`my-1 h-px w-5 ${isDark ? "bg-white/20" : "bg-black/18"}`}
          />

          <NavItemButton label="settings" isDark={isDark}>
            <SettingsIcon />
          </NavItemButton>
        </div>
      </div>

      <div className="relative flex w-full flex-col items-center pb-4">
        <button
          type="button"
          aria-label="guest profile"
          className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full transition ${
            isDark
              ? "border border-white/20 bg-white/10 hover:bg-white/15"
              : "border border-black/8 bg-[linear-gradient(135deg,#f6d8d8,#d4d4d4)]"
          }`}
        >
          <span
            className={`text-xs font-medium ${isDark ? "text-white/70" : "text-[#222]"}`}
          >
            G
          </span>
        </button>

        {!isDark && showGuestCard ? <GuestCard /> : null}
      </div>
    </aside>
  );
};

export default SideNav;
