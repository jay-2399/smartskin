"use client";
import type { OptionDef } from "@/features/funnel/types";
import { CHECK_ICON } from "@/features/funnel/questions";

export function OptionList({
  options, selected, onToggle, dimmed = [], gate = false, baseDelay,
}: {
  options: OptionDef[];
  selected: string[];
  onToggle: (value: string) => void;
  /** valeurs grisées et non cliquables (q1 : max atteint / exclusivité, cf. maquette) */
  dimmed?: string[];
  /** pastille carrée (q5 oui/non, cf. maquette) */
  gate?: boolean;
  /** délai de départ de l'animation rise en secondes (maquette : .16 puis +.04 par option) */
  baseDelay?: number;
}) {
  return (
    <>
      {options.map((o, i) => {
        const isSel = selected.includes(o.value);
        const isDim = dimmed.includes(o.value);
        return (
          <button
            type="button"
            key={o.value}
            className={`opt${gate ? " gate" : ""}${isSel ? " sel" : ""}${isDim ? " dim" : ""}`}
            aria-pressed={isSel}
            onClick={() => onToggle(o.value)}
            style={baseDelay !== undefined ? { animationDelay: `${baseDelay + i * 0.04}s` } : undefined}
          >
            {o.icon && (
              <span className="opt-ic" aria-hidden dangerouslySetInnerHTML={{ __html: o.icon }} />
            )}
            <span className="opt-tx">
              <span className="opt-l">{o.label}</span>
              {o.sub && <span className="opt-s">{o.sub}</span>}
            </span>
            <span className="opt-radio" aria-hidden dangerouslySetInnerHTML={{ __html: CHECK_ICON }} />
          </button>
        );
      })}
    </>
  );
}
