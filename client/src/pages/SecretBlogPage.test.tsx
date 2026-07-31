/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoryForm } from "./SecretBlogPage";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/components/SecretBlog", () => ({
  BroCard: () => null,
  BrideCard: () => null,
  getAnonymousAlias: () => "Anonimo",
  getAvatarEmoji: () => "🕶️",
}));

const t = (key: string) => key;

function renderStoryForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <StoryForm isAuthenticated brand="bro" t={t} />
    </QueryClientProvider>,
  );
}

describe("StoryForm", () => {
  it("associa le etichette ai campi e comunica le opzioni selezionate", () => {
    renderStoryForm();

    const roma = screen.getByRole("button", { name: /Roma/ });
    expect(roma).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(roma);
    expect(roma).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "common.continue" }));

    const story = screen.getByLabelText(/secretBlog\.storyQuestionPrefix.*Roma/);
    const title = screen.getByLabelText(/secretBlog\.customTitle/);
    expect(story).toHaveAttribute("id", "secret-blog-story");
    expect(title).toHaveAccessibleDescription("secretBlog.autoTitleHint");

    fireEvent.change(story, {
      target: { value: "Una storia abbastanza lunga per continuare." },
    });
    fireEvent.click(screen.getByRole("button", { name: "common.continue" }));

    const drink = screen.getByRole("button", {
      name: /secretBlog\.category\.drink/,
    });
    expect(drink).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(drink);
    expect(drink).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "common.continue" }));

    const tag = screen.getByRole("button", { name: "#epico" });
    expect(tag).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(tag);
    expect(tag).toHaveAttribute("aria-pressed", "true");

    const preview = screen.getByRole("button", {
      name: "secretBlog.showPreview",
    });
    expect(preview).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(preview);
    expect(
      screen.getByRole("button", { name: "secretBlog.hidePreview" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("secret-blog-preview")).toBeInTheDocument();
  });
});
