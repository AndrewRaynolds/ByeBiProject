/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";
import { Card } from "./card";

describe("foundation primitives", () => {
  it("adds card states without changing the default API", () => {
    const { rerender } = render(<Card>Standard</Card>);
    expect(screen.getByText("Standard")).toHaveClass("shadow-soft");

    rerender(<Card variant="interactive">Interactive</Card>);
    expect(screen.getByText("Interactive")).toHaveClass("hover:shadow-raised");

    rerender(<Card variant="selected">Selected</Card>);
    expect(screen.getByText("Selected")).toHaveClass("border-primary");
  });

  it.each(["neutral", "brand", "success", "warning", "destructive"] as const)(
    "supports the %s badge meaning",
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
    },
  );
});
