const puppeteer = require("puppeteer");
const { Product } = require("../models/product");
const generateJobId = require("../utils");

async function fetchImagesAndCleanUrls(url) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
        ],
        executablePath: process.env.NODE_ENV === "production" ?
            process.env.PUPPETEER_EXECUTABLE_PATH
            : puppeteer.executablePath(),
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Extracting all image src attributes and cleaning them up
    const imageUrls = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('.slider--img--D7MJNPZ img'));
        return images.map(img => img.src.replace('_80x80', ''));
    });

    await browser.close();
    return imageUrls;
}

async function scrapWithAliexpress(url) {
    let browser;
    try {
        const launchStartTime = Date.now();
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox']
        });
        console.log('Browser launch duration:', Date.now() - launchStartTime, 'ms');

        const page = await browser.newPage();

        await page.setCacheEnabled(false);
        await page.setDefaultNavigationTimeout(120000);

        const gotoStartTime = Date.now();
        await page.goto(url, { waitUntil: 'networkidle2' });
        console.log('Page goto duration:', Date.now() - gotoStartTime, 'ms');

        let product = new Product();
        product.jobId = generateJobId();
        product.url = url;

        // Function to measure and log the duration of a page.evaluate call
        async function evaluateWithTiming(evaluateFunction, actionName) {
            const evalStartTime = Date.now();
            const result = await page.evaluate(evaluateFunction);
            console.log(`${actionName} duration:`, Date.now() - evalStartTime, 'ms');
            return result;
        }

        // Extract the data object from window.runParams
        const extractedData = await page.evaluate(() => {
            // Access the global variable directly
            const runParams = window.runParams;
            if (runParams && runParams.data) {
                return runParams.data; // Return the data object
            }
            return {}; // Return an empty object if not found
        });

        //specifications
        if (extractedData.productPropComponent.props !== undefined) {
            const specifications = extractedData.productPropComponent.props.reduce((obj, item) => {
                obj[item.attrName] = item.attrValue; // Set each attrName as a key and attrValue as the value in the object
                return obj;
            }, {});

            product.specifications = specifications
        }

        //Weight
        if (extractedData.packageComponent.weight !== undefined) {
            product.originalWeight = extractedData.packageComponent.weight
            product.weight = product.originalWeight * 1 //Altered upwards by 0%
        }
        //Variants
        if (extractedData.skuComponent.productSKUPropertyList !== undefined) {
            product.variants = extractedData.skuComponent.productSKUPropertyList
        }


        // Extract title
        try {
            product.title = await evaluateWithTiming(() => {
                const titleElement = document.querySelector('h1[data-pl="product-title"]');
                return titleElement ? titleElement.textContent.trim() : null;
            }, 'Extract title');
        } catch (error) {
            console.error("Error occurred while extracting title:", error);
        }

        // Extract image
        try {
            product.images = await page.evaluate(() => {
                const images = Array.from(document.querySelectorAll('.slider--box--TJYmEtw img'));
                return images.map(img => img.src.replace('_80x80', ''));
            });

        } catch (error) {
            console.error("Error occurred while extracting image:", error);
        }

        // Extract description
        try {
            product.description = await evaluateWithTiming(() => {
                const descriptionElement = document.querySelector('.specification--list--fiWsSyv');
                return descriptionElement ? descriptionElement.textContent.trim() : 'Not found';
            }, 'Extract description');
        } catch (error) {
            console.error("Error occurred while extracting description:", error);
        }

        // Extract description images
        try {
            product.description_images = await evaluateWithTiming(() => {
                const imageElements = document.querySelectorAll('#product-description img');
                const result = Array.from(imageElements).map(img => img.getAttribute('src'));
                return result;
            }, 'Extract description images');
        } catch (error) {
            console.error("Error occurred while extracting description images:", error);
        }
        return product;
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        if (browser) {
            const closeStartTime = Date.now();
            await browser.close();
            console.log('Browser close duration:', Date.now() - closeStartTime, 'ms');
        }
    }
}

module.exports = scrapWithAliexpress;
