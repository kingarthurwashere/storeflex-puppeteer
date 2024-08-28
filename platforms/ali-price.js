const puppeteer = require("puppeteer");
const fs = require('fs');
const path = require('path');
const { AliexpressListing } = require("../models/AliexpressListing");

async function scrapAliprice(url) {
    let browser;
    try {
        console.log("Starting the scraping process...");
        const startTime = Date.now();

        // Launch browser
        const launchStartTime = Date.now();
        browser = await puppeteer.launch({
            headless: true,
            args: ['--proxy-server=ae-pr.oxylabs.io:40000', '--no-sandbox']
        });
        console.log(`****Browser launched in ${Date.now() - launchStartTime}ms`);

        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Proxy authentication
        const authStartTime = Date.now();
        await page.authenticate({ username: 'Dxbrunners', password: 'Mikhman_2024' });
        console.log(`****Proxy authentication setup in ${Date.now() - authStartTime}ms`);

        await page.setCacheEnabled(false);
        await page.setDefaultNavigationTimeout(120000);

        // Page navigation
        const navigationStartTime = Date.now();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        console.log(`****Page navigated to URL in ${Date.now() - navigationStartTime}ms`);

        // Page scroll
        const scrollStartTime = Date.now();
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        console.log(`****Page scrolled in ${Date.now() - scrollStartTime}ms`);

        const htmlContent = await page.content();  // This captures the full HTML content of the page

        // Specify the path where the file will be saved
        const filePath = path.join(__dirname, 'pageHTML.html');

        // Write the HTML content to a file
        fs.writeFileSync(filePath, htmlContent); // Synchronously write the file to avoid Node.js process exit before async completion

        console.log(`The HTML content has been saved to ${filePath}`);

        let product = new AliexpressListing();
        product.url = url;

        // Extract the data object from window.runParams
        const extractedData = await page.evaluate(() => {
            // Access the global variable directly
            const runParams = window.runParams;
            if (runParams && runParams.data) {
                return runParams.data; // Return the data object
            }
            return {}; // Return an empty object if not found
        });

        //console.log('Extracted Data:', extractedData);
        //price
        product.priceWithShipping = null
        if (extractedData.priceComponent.discountPrice !== undefined) {
            if (extractedData.priceComponent.discountPrice.minActMultiCurrencyPrice !== undefined) {
                const price = extractedData.priceComponent.discountPrice.minActMultiCurrencyPrice
                console.log('Extracted PRICE:', price);
                product.price = price
            } else {
                const price = extractedData.priceComponent.origPrice.minMultiCurrencyPrice;
                console.log('Extracted PRICE_:', price);
                product.price = price
            }
        } else {
            const price = extractedData.priceComponent.origPrice.minMultiCurrencyPrice;
            console.log('Extracted PRICE_:', price);
            product.price = price
        }

        product.priceWithShipping = parseFloat(product.price)

        //discount
        if (extractedData.priceComponent.skuPriceList !== undefined) {
            const priceList = extractedData.priceComponent.skuPriceList

            if (priceList.length > 0) {
                if (priceList[0].skuVal.discount !== undefined) {
                    product.discount = priceList[0].skuVal.discount
                }
            }
        }

        //SKU Price List
        if (extractedData.priceComponent.skuPriceList !== undefined) {
            product.priceList = extractedData.priceComponent.skuPriceList

            try {
                const maxVal = findHighestSkuActivityAmount(product.priceList)
                product.maxPrice = maxVal.skuVal.skuActivityAmount.value

            } catch (e) {

            }

        }

        function findHighestSkuActivityAmount(data) {
            return data.reduce((max, current) => {
                return current.skuVal.skuActivityAmount.value > max.skuVal.skuActivityAmount.value ? current : max;
            });
        }

        //shipping price
        if (extractedData.webGeneralFreightCalculateComponent.originalLayoutResultList.length > 0) {
            const bizData = extractedData.webGeneralFreightCalculateComponent.originalLayoutResultList[0].bizData;
            if (bizData !== undefined) {
                console.log('bizData', bizData)
                const shippingPrice = bizData.displayAmount

                if (shippingPrice !== undefined) {
                    console.log('SHIPPING PRICE:', shippingPrice);
                    product.shipping_price = parseFloat(shippingPrice)
                    product.priceWithShipping += parseFloat(shippingPrice)
                }
            }
        } else {
            console.log('SHIPPING PRICE:_:', 0);
        }

        console.log(`****Total scraping duration: ${Date.now() - startTime}ms`);
        return product;
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = scrapAliprice;
