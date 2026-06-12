import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptionList } from "@/components/ui/OptionList";

const opts = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
];

describe("OptionList", () => {
  it("rend les libellés et notifie au clic", async () => {
    const onToggle = vi.fn();
    render(<OptionList options={opts} selected={["a"]} onToggle={onToggle} />);
    expect(screen.getByText("Option A")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Option B"));
    expect(onToggle).toHaveBeenCalledWith("b");
  });

  it("marque les options sélectionnées (aria-pressed)", () => {
    render(<OptionList options={opts} selected={["a"]} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /Option A/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Option B/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("grise les options listées dans dimmed (classe dim, comme la maquette q1)", () => {
    render(<OptionList options={opts} selected={["a"]} onToggle={() => {}} dimmed={["b"]} />);
    expect(screen.getByRole("button", { name: /Option B/ }).className).toContain("dim");
  });
});
