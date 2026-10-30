import products from "../src/products.json" with { type: "json" };
import stores from "../src/stores.json" with { type: "json" };
export default {
  async fetch(request) {
    if (request.method !== "GET")
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    const id = new URL(request.url).searchParams.get("product");
    const product = id ? products.find((product) => product.id === id) : null;
    if (id && !product)
      return Response.json({ error: "Product not found" }, { status: 404 });
    return Response.json(
      product
        ? { product }
        : {
            products: products.map(({ variants, ...product }) => ({
              ...product,
              configurations: variants.length,
            })),
            stores,
            verifiedAt: products[0]?.verifiedAt,
          },
      { headers: { "cache-control": "public, max-age=3600" } },
    );
  },
};
