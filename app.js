const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const scrapeAliexpressData = require("./scrapeAliexpressData");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

const allowedPlatforms = ["aliexpress"];

// Rate limiter middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later",
});
app.use(limiter);

app.post(
    "/",
    [
        body("url").isURL().withMessage("URL is required and must be valid"),
        body("platform")
            .isIn(allowedPlatforms)
            .withMessage("Platform not allowed"),
    ],
    async (req, res) => {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { url, platform } = req.body;

        // Call the platform function
        if (platform === "aliexpress") {
            try {
                const combinedResult = await scrapeAliexpressData(url);
                return res.json(combinedResult);
            } catch (error) {
                console.error("Error occurred:", error);
                return res.status(500).json({ message: "Internal server error" });
            }
        } else {
            return res.status(400).json({ message: "Platform not found" });
        }
    }
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
