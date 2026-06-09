"use client";

import { FormEvent, useMemo, useState } from "react";
import { type Variant } from "@/shared";
import { requestGeneration } from "@/lib/project-api";
import ProjectTabs from "../project/project-tabs";

export default function GenerationPlayground() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    return (
      variants.find((variant) => variant.id === selectedVariantId) ??
      variants[0]
    );
  }, [variants, selectedVariantId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!prompt.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await requestGeneration({ prompt });

      if (response.mode !== "generate") {
        throw new Error("Generate response was expected");
      }

      setVariants(response.variants);
      setSelectedVariantId(response.variants[0]?.id ?? null);
    } catch (err) {
      console.error(err);
      setError("시안 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white p-8 text-background">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-3xl font-bold">Zeno MVP</h1>
          <p className="mt-2 text-sm text-gray-600">
            Prompt 입력 → fixture generation → variant 선택 → preview 렌더링
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-gray-200 p-5"
        >
          <label className="text-sm font-medium">프롬프트 입력</label>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예: 모던한 SaaS 랜딩페이지 만들어줘"
            className="mt-3 min-h-[140px] w-full rounded-xl border border-gray-300 p-4 text-sm outline-none focus:border-black"
          />

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "생성 중..." : "시안 생성"}
            </button>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}
          </div>
        </form>

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Variants</h2>
              <span className="text-sm text-gray-500">
                {variants.length ? `${variants.length}개 생성됨` : "아직 없음"}
              </span>
            </div>

            <div className="space-y-3">
              {variants.map((variant) => {
                const isSelected = selectedVariant?.id === variant.id;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white hover:border-gray-400"
                    }`}
                  >
                    <p className="text-sm font-semibold">{variant.name}</p>
                    <p
                      className={`mt-2 text-sm ${
                        isSelected ? "text-white/80" : "text-gray-600"
                      }`}
                    >
                      {variant.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">Workspace</h2>
              <p className="mt-1 text-sm text-gray-500">
                선택한 variant의 generated project
              </p>
            </div>

            {selectedVariant ? (
              <ProjectTabs project={selectedVariant.project} />
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                아직 생성된 시안이 없습니다.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
