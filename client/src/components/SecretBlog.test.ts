import { describe, expect, it } from "vitest";
import { localizeHomepagePost } from "./SecretBlog";

const seedPost = {
  title: "Roma: The Night We Can't Remember",
  content: "From Trastevere's wine bars to Testaccio's underground clubs, Rome offers an incredible nightlife scene. We started at a rooftop aperitivo with views of the Colosseum, then ended up in a basement club at 5am. The bachelor had no idea what hit him.",
};

describe("SecretBlog localized seed copy", () => {
  it("localizes a recognized seed post in Italian and Spanish", () => {
    expect(localizeHomepagePost(seedPost, "it").title).toBe("Roma: la notte che non ricordiamo");
    expect(localizeHomepagePost(seedPost, "es").title).toBe("Roma: la noche que no recordamos");
  });

  it("keeps English and dynamic posts unchanged", () => {
    const dynamicPost = { ...seedPost, content: "User-authored content" };

    expect(localizeHomepagePost(seedPost, "en")).toBe(seedPost);
    expect(localizeHomepagePost(dynamicPost, "it")).toBe(dynamicPost);
  });
});
