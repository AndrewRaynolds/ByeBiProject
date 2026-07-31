import { describe, expect, it } from "vitest";
import { buildPublicBlogPost, blogSubmissionSchema } from "./blog";

const validSubmission = {
  title: "Una notte memorabile",
  content:
    "Una storia sufficientemente lunga per descrivere ciò che è successo durante il viaggio del gruppo.",
  location: "Roma",
  category: "drink" as const,
};

describe("public Secret Blog submissions", () => {
  it("builds a safe, non-premium post", () => {
    const post = buildPublicBlogPost({
      ...validSubmission,
      image: "https://attacker.example/tracker.png",
      isPremium: true,
    });

    expect(post).toMatchObject({
      ...validSubmission,
      isPremium: false,
    });
    expect(post.image).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(post.image).not.toContain("attacker.example");
  });

  it("trims user-provided text", () => {
    const post = buildPublicBlogPost({
      ...validSubmission,
      title: `  ${validSubmission.title}  `,
      location: "  Roma  ",
    });

    expect(post.title).toBe(validSubmission.title);
    expect(post.location).toBe("Roma");
  });

  it("rejects short stories and unknown categories", () => {
    expect(() =>
      blogSubmissionSchema.parse({
        ...validSubmission,
        content: "Troppo breve",
      }),
    ).toThrow();

    expect(() =>
      blogSubmissionSchema.parse({
        ...validSubmission,
        category: "spam",
      }),
    ).toThrow();
  });
});
