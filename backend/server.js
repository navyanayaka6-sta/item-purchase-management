const express = require("express");
const cors = require("cors");

const itemRoutes = require("./routes/items");
const itemTypeRoutes = require("./routes/itemTypes");
const purchaseRoutes = require("./routes/purchases");

const app = express();

const PORT = 5000;
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Item & Purchase Management API is running"
  });
});
app.use("/api/items", itemRoutes);
app.use("/api/item-types", itemTypeRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      message: "Invalid JSON request"
    });
  }

  next(err);
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    message: "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});