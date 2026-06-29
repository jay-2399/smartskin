"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { QUESTIONS, STEP_ORDER } from "@/features/funnel/questions";
import { useFunnel } from "@/features/funnel/store";
import { isStepValid } from "@/features/funnel/validation";
import { OptionList } from "@/components/ui/OptionList";
import { TopBar } from "@/components/ui/TopBar";
import type { StepId } from "@/features/funnel/types";

/* Icône « i » du helper et flèche du CTA — repris des maquettes. */
const HelperIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="7" cy="7" r="5.5" /><path d="M7 9.5V6.5M7 4.6v.05" strokeLinecap="round" /></svg>
);
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h9M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export function QuestionScreen({ step }: { step: StepId }) {
  const router = useRouter();
  const q = QUESTIONS[step];
  const answers = useFunnel((s) => s.answers);
  const { setAge, setSingle, toggleMulti, setGate, toggleSymptom } = useFunnel.getState();

  const valid = isStepValid(step, answers);
  const i = (STEP_ORDER as readonly StepId[]).indexOf(step);

  // Flux : landing → age → q1 → capture → q2 … q7 → /analyse
  // (le mur d'inscription /compte sera intercalé ici au Plan 4)
  const next = () => {
    if (step === "q1") router.push("/capture");
    else if (step === "q7") router.push("/analyse");
    else router.push(`/questions/${STEP_ORDER[i + 1]}`);
  };
  const back = () => {
    if (step === "age") router.push("/");          // 1ʳᵉ étape → landing
    else if (step === "q2") router.push("/capture"); // q2 vient après la capture
    else router.push(`/questions/${STEP_ORDER[i - 1]}`); // q1 → age, q3 → q2, etc.
  };

  // q1 : options grisées (maquette) — exclusive posée, ou max atteint
  const multiSelected = q.mode === "multi" ? answers[step as "q1" | "q2" | "q3" | "q7"] : [];
  const dimmed =
    q.mode === "multi" && q.maxSelect !== undefined
      ? q.options
          .filter((o) => {
            const isSel = multiSelected.includes(o.value);
            const exclusivePosed = q.options.some(
              (e) => e.exclusive && multiSelected.includes(e.value)
            );
            if (exclusivePosed && !o.exclusive) return true;
            if (!exclusivePosed && o.exclusive && multiSelected.length > 0) return true;
            if (!exclusivePosed && !isSel && multiSelected.length >= q.maxSelect!) return true;
            return false;
          })
          .map((o) => o.value)
      : [];

  return (
    <div className="screen">
      <div className="brand">
        <Image src="/logo-smartskin.png" alt="SmartSkin AI" width={133} height={26} priority />
      </div>

      <TopBar index={q.index} onBack={back} />

      <div className="qhead">
        <h1 className="question">{q.title}</h1>
        <p className="helper">
          <HelperIcon />
          <span dangerouslySetInnerHTML={{ __html: q.helperHtml }} />
        </p>
      </div>

      <div className={`list${q.grid ? " grid2" : ""}${q.mode === "age" ? " list-age" : ""}`}>
        {q.mode === "age" && (
          <div className="age-field">
            <div className="age-stepper">
              <button type="button" className="age-step" aria-label="Decrease age"
                onClick={() => setAge(Math.max(13, (answers.age ?? 26) - 1))}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={13}
                max={99}
                className="age-input"
                value={answers.age ?? ""}
                onChange={(e) => setAge(e.target.value === "" ? null : Math.floor(Number(e.target.value)))}
                placeholder="25"
                aria-label="Your age"
                autoFocus
              />
              <button type="button" className="age-step" aria-label="Increase age"
                onClick={() => setAge(Math.min(99, (answers.age ?? 24) + 1))}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
            <span className="age-unit">years old</span>
          </div>
        )}

        {q.mode === "single" && (
          <OptionList
            options={q.options}
            selected={answers[step as "q4" | "q6"] ? [answers[step as "q4" | "q6"] as string] : []}
            onToggle={(v) => setSingle(step as "q4" | "q6", v)}
            baseDelay={0.16}
          />
        )}

        {q.mode === "multi" && (
          <OptionList
            options={q.options}
            selected={multiSelected}
            onToggle={(v) =>
              toggleMulti(
                step as "q1" | "q2" | "q3" | "q7",
                v,
                !!q.options.find((o) => o.value === v)?.exclusive
              )
            }
            dimmed={dimmed}
            baseDelay={0.16}
          />
        )}

        {q.mode === "gate" && (
          <>
            <OptionList
              gate
              options={q.options}
              selected={answers.q5.changed === true ? ["yes"] : answers.q5.changed === false ? ["no"] : []}
              onToggle={(v) => setGate(v === "yes")}
              baseDelay={0.16}
            />
            <div className={`reveal${answers.q5.changed === true ? " open" : ""}`}>
              <div className="sub">{q.revealTitle}</div>
              <OptionList
                options={q.revealOptions ?? []}
                selected={answers.q5.symptoms}
                onToggle={toggleSymptom}
              />
            </div>
          </>
        )}
      </div>

      <div className="footer">
        <div className="foot-row">
          {q.maxSelect !== undefined && (
            <span className="counter">
              <b>{multiSelected.length}</b>/{q.maxSelect} choisies
            </span>
          )}
          <button type="button" className="cta-btn" disabled={!valid} onClick={next}>
            {q.ctaLabel ?? "Continuer"}
            <ArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
