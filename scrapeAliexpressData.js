const scrapWithAliexpress = require("./platforms/aliexpress");
const scrapAliprice = require("./platforms/ali-price");

async function scrapeAliexpressData(url) {
    try {
        // Scraping Aliexpress and Ali-price concurrently
        const [aliexpressData, priceData] = await Promise.all([scrapWithAliexpress(url), scrapAliprice(url)]);

        // Constructing combined result
        const combinedResult = {
            url,
            title: aliexpressData.title,
            images: aliexpressData.images,
            model: aliexpressData.model,
            highlights: aliexpressData.highlights,
            description_images: aliexpressData.description_images,
            description: aliexpressData.description,
            originalWeight: aliexpressData.originalWeight,
            weight: aliexpressData.weight,
            variants: aliexpressData.variants,
            specifications: aliexpressData.specifications,
            measurements: aliexpressData.measurements,
            estimator: aliexpressData.estimator,
            priceList: priceData.priceList,
            calculatedPrice: priceData.calculatedPrice,
            scrapeCurrency: priceData.scrapeCurrency,
            currency: priceData.currency,
            discount: priceData.discount,
            price: priceData.price,
            maxPrice: priceData.maxPrice,
            shipping_price: priceData.shipping_price,
            priceWithShipping: priceData.priceWithShipping,
            freeAbovePrice: priceData.freeAbovePrice,

        };

        return combinedResult;
    } catch (error) {
        throw error;
    }
}

module.exports = scrapeAliexpressData;
