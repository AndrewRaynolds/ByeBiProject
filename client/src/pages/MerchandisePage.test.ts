import { describe, expect, it } from "vitest";
import {
  BRAND_PRODUCT_IDS,
  filterProductsForBrand,
  toCheckoutItems,
} from "./MerchandisePage";

describe("brand merchandise filtering", () => {
  const products = [
    ...BRAND_PRODUCT_IDS.byebro.map((id) => ({ id, brand: "bro" })),
    ...BRAND_PRODUCT_IDS.byebride.map((id) => ({ id, brand: "bride" })),
    { id: 999999999, brand: "unknown" },
  ];

  it("shows only ByeBro products for the ByeBro brand", () => {
    expect(filterProductsForBrand(products, "byebro")).toEqual(
      products.filter((product) => product.brand === "bro"),
    );
  });

  it("shows only ByeBride products for the ByeBride brand", () => {
    expect(filterProductsForBrand(products, "byebride")).toEqual(
      products.filter((product) => product.brand === "bride"),
    );
  });
});

describe("merchandise checkout payload", () => {
  it("sends only the fields accepted by the checkout API", () => {
    expect(toCheckoutItems([{
      productId: 420156126,
      variantId: 5200740039,
      quantity: 1,
      variantName: "ByeBro Cap / Black",
      productName: "ByeBro Cap",
      price: "15.00",
      currency: "EUR",
      imageUrl: "https://example.com/cap.png",
    }])).toEqual([{
      productId: 420156126,
      variantId: 5200740039,
      quantity: 1,
    }]);
  });
});
