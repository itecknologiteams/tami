import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "./page";

describe("Admin home page", () => {
  it("renders command center title", () => {
    render(<Page />);

    expect(screen.getByText("Tami Command Center")).toBeTruthy();
  });
});
