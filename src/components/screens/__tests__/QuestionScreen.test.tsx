import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionScreen } from "@/components/screens/QuestionScreen";
import { useFunnel } from "@/features/funnel/store";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("QuestionScreen q1", () => {
  beforeEach(() => {
    useFunnel.getState().reset();
    push.mockClear();
  });

  it("affiche le titre et désactive Continuer tant que rien n'est choisi", () => {
    render(<QuestionScreen step="q1" />);
    expect(screen.getByText(/improve on your skin/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();
  });

  it("active Continuer après une sélection et compte les choix (maquette : n/3)", async () => {
    render(<QuestionScreen step="q1" />);
    await userEvent.click(screen.getByText("Pores"));
    expect(screen.getByRole("button", { name: /Continue/ })).toBeEnabled();
    expect(screen.getByText(/\/3 selected/)).toBeInTheDocument();
  });

  it("q1 continue vers /capture (flux maquette q1 → capture)", async () => {
    render(<QuestionScreen step="q1" />);
    await userEvent.click(screen.getByText("Pores"));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(push).toHaveBeenCalledWith("/capture");
  });
});

describe("QuestionScreen q5 (gate)", () => {
  beforeEach(() => {
    useFunnel.getState().reset();
    push.mockClear();
  });

  it("révèle les symptômes après « Oui » et exige ≥1 symptôme", async () => {
    render(<QuestionScreen step="q5" />);
    const cta = screen.getByRole("button", { name: /Continue/ });
    expect(cta).toBeDisabled();
    await userEvent.click(screen.getByText(/Yes, something changed/));
    expect(cta).toBeDisabled();
    await userEvent.click(screen.getByText("Drier"));
    expect(cta).toBeEnabled();
  });
});

describe("QuestionScreen q7", () => {
  beforeEach(() => {
    useFunnel.getState().reset();
    push.mockClear();
  });

  it("affiche « Lancer mon analyse » et route vers /analyse", async () => {
    render(<QuestionScreen step="q7" />);
    await userEvent.click(screen.getByText("Nothing to report"));
    await userEvent.click(screen.getByRole("button", { name: /Start my analysis/ }));
    expect(push).toHaveBeenCalledWith("/analyse");
  });
});
