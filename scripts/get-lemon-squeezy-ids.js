const API_KEY = process.env.LEMON_SQUEEZY_API_KEY;

if (!API_KEY) {
    console.error("Please provide LEMON_SQUEEZY_API_KEY environment variable.");
    process.exit(1);
}

async function fetchLS(endpoint) {
    const res = await fetch(`https://api.lemonsqueezy.com/v1/${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/vnd.api+json'
        }
    });
    if (!res.ok) {
        throw new Error(`API Error ${res.status}: ${res.statusText}`);
    }
    return res.json();
}

async function main() {
    try {
        console.log("Fetching Store...");
        const stores = await fetchLS('stores');
        const store = stores.data[0];
        if (!store) {
            console.error("No store found.");
            return;
        }
        console.log(`Store ID: ${store.id} (${store.attributes.name})`);

        console.log("\nFetching Products...");
        const products = await fetchLS('products?include=variants');

        const variants = [];
        const foundProducts = products.data || [];

        console.log(`Found ${foundProducts.length} products.`);

        const envLines = [
            `LEMON_SQUEEZY_API_KEY=${API_KEY}`,
            `LEMON_SQUEEZY_STORE_ID=${store.id}`
        ];

        // Helper to find variant
        // The API returns included variants in `included` array usually, but ?include=variants might nest them?
        // Lemon Squeezy API structure: data: [...], included: [...]
        // I need to fetch variants separately or parse `included`.
        // Let's fetch variants endpoint directly to be safe, or map product relationships.

        // Actually, fetching variants is easier.
        const variantsRes = await fetchLS('variants');
        const allVariants = variantsRes.data;

        for (const p of foundProducts) {
            const pName = p.attributes.name;
            const pId = p.id;
            // Find variant for this product
            // relationships.variants.data is array of {type, id}

            // Just filter allVariants where attributes.product_id == p.id (as number or string?)
            // Lemon Squeezy IDs are strings in JSON:API usually.
            const productVariants = allVariants.filter(v => v.attributes.product_id == pId);

            console.log(`- ${pName} (ID: ${pId})`);

            for (const v of productVariants) {
                console.log(`  - Variant: ${v.attributes.name} (ID: ${v.id}) - $${v.attributes.price / 100}`);

                if (pName.includes('Pro')) {
                    if (v.attributes.interval === 'month') {
                        envLines.push(`NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID_PRO_MONTHLY=${v.id}`);
                        envLines.push(`LEMON_SQUEEZY_PRO_VARIANT_ID=${v.id}`);
                    } else if (v.attributes.interval === 'year') {
                        envLines.push(`NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID_PRO_YEARLY=${v.id}`);
                        envLines.push(`LEMON_SQUEEZY_PRO_YEARLY_VARIANT_ID=${v.id}`);
                    }
                }
                if (pName.includes('Ultra')) {
                    if (v.attributes.interval === 'month') {
                        envLines.push(`NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID_ULTRA_MONTHLY=${v.id}`);
                        envLines.push(`LEMON_SQUEEZY_ULTRA_VARIANT_ID=${v.id}`);
                    } else if (v.attributes.interval === 'year') {
                        envLines.push(`NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID_ULTRA_YEARLY=${v.id}`);
                        envLines.push(`LEMON_SQUEEZY_ULTRA_YEARLY_VARIANT_ID=${v.id}`);
                    }
                }
            }
        }

        console.log("\n------------------------------------------------");
        console.log("Add these to your .env.local file:");
        console.log("------------------------------------------------");
        console.log(envLines.join('\n'));
        console.log("------------------------------------------------");

        if (foundProducts.length === 0) {
            console.log("\nCheck: You haven't created any products yet.");
            console.log("Please go to https://app.lemonsqueezy.com/products and create 'ZeroDraft Pro' and 'ZeroDraft Ultra'.");
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

main();
