const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const app = express();
require("dotenv").config();

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(cors());

// Enable CORS for all origins
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allow specific HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
  })
);

// Serve static files from the 'downloads' directory
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

// Include routes
app.use(require("./routes/downloadRoutes"));

// Start the server
app.listen(8080, () => {
  console.log(`Server is running at http://localhost:${8080}`);
});
