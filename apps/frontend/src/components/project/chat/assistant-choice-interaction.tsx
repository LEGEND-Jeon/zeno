import type {
  AssistantChoiceInteraction,
  ChoiceInteractionOption,
  ChoiceResponse,
} from "@zeno/shared";

type AssistantChoiceInteractionProps = {
  interaction: AssistantChoiceInteraction;
  selectedChoiceResponse?: ChoiceResponse | null;
  disabled?: boolean;
  onSelect: (option: ChoiceInteractionOption) => void;
};

export default function AssistantChoiceInteraction({
  interaction,
  selectedChoiceResponse,
  disabled = false,
  onSelect,
}: AssistantChoiceInteractionProps) {
  const selectedOptionId = selectedChoiceResponse?.optionId;
  const isLocked = disabled || Boolean(selectedOptionId);

  return (
    <div className="mt-5 space-y-3">
      {interaction.title ? (
        <p className="text-[14px] font-semibold leading-6 text-white/90">
          {interaction.title}
        </p>
      ) : null}

      {interaction.description ? (
        <p className="text-[13px] leading-6 text-white/58">
          {interaction.description}
        </p>
      ) : null}

      <div className="grid gap-2">
        {interaction.options.map((option, index) => {
          const isSelected = option.id === selectedOptionId;

          return (
            <button
              key={option.id}
              type="button"
              disabled={isLocked}
              onClick={() => onSelect(option)}
              className={`group flex w-full items-start gap-3 rounded-[18px] border px-4 py-3 text-left transition ${
                isSelected
                  ? "border-[#80f3c9]/60 bg-[#80f3c9]/14 text-white"
                  : isLocked
                    ? "cursor-not-allowed border-white/8 bg-white/5 text-white/46"
                    : "border-white/10 bg-white/7 text-white/84 hover:border-[#80f3c9]/45 hover:bg-[#80f3c9]/10"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold ${
                  isSelected
                    ? "border-[#80f3c9]/70 bg-[#80f3c9]/20 text-[#baf8df]"
                    : "border-white/14 bg-black/16 text-white/62 group-hover:border-[#80f3c9]/45 group-hover:text-[#baf8df]"
                }`}
              >
                {index + 1}
              </span>

              <span className="min-w-0">
                <span className="block text-[14px] font-semibold leading-6">
                  {option.label}
                </span>

                {option.description ? (
                  <span className="mt-0.5 block text-[13px] leading-5 text-white/58">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
