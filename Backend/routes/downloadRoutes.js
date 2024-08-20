const express = require("express");
const router = express.Router();
const {
  downloadController,
} = require("../controller/downloadController");

router.post("/download/video", downloadController);

module.exports = router;
