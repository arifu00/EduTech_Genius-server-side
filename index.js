const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

//  middle-ware
app.use(express.json());

app.get("/", (req, res) => {
  res.send("EduTech Genius Server is Running");
});
app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
