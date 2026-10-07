const express = require("express");
const router = express.Router();

const db = require("../db");
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        i.id,
        i.name,
        i.purchase_date,
        i.stock_available,
        i.active,
        i.item_type_id,
        it.type_name
      FROM items i
      JOIN item_types it
        ON i.item_type_id = it.id
      ORDER BY i.id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch items"
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid item ID"
      });
    }

    const [rows] = await db.query(`
      SELECT
        i.id,
        i.name,
        i.purchase_date,
        i.stock_available,
        i.active,
        i.item_type_id,
        it.type_name
      FROM items i
      JOIN item_types it
        ON i.item_type_id = it.id
      WHERE i.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Item not found"
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch item"
    });
  }
});
router.post("/", async (req, res) => {
  try {
    const {
      name,
      item_type_id,
      purchase_date,
      stock_available,
      active
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        message: "Item name is required"
      });
    }

    if (
      item_type_id === undefined ||
      item_type_id === null ||
      !Number.isInteger(Number(item_type_id)) ||
      Number(item_type_id) <= 0
    ) {
      return res.status(400).json({
        message: "Valid item type is required"
      });
    }

    if (!purchase_date) {
      return res.status(400).json({
        message: "Purchase date is required"
      });
    }

    const date = new Date(purchase_date);

    if (isNaN(date.getTime())) {
      return res.status(400).json({
        message: "Invalid purchase date"
      });
    }

    const stock = Number(stock_available);

    if (
      stock_available === undefined ||
      stock_available === null ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      return res.status(400).json({
        message: "Stock cannot be negative and must be a whole number"
      });
    }

    if (
      active !== true &&
      active !== false &&
      active !== 0 &&
      active !== 1
    ) {
      return res.status(400).json({
        message: "Active status is required"
      });
    }


    const typeId = Number(item_type_id);

    const [typeRows] = await db.query(
      "SELECT id FROM item_types WHERE id = ?",
      [typeId]
    );

    if (typeRows.length === 0) {
      return res.status(400).json({
        message: "Invalid item type"
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO items
      (
        name,
        purchase_date,
        stock_available,
        item_type_id,
        active
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        name.trim(),
        purchase_date,
        stock,
        typeId,
        active ? 1 : 0
      ]
    );

    res.status(201).json({
      message: "Item created successfully",
      id: result.insertId
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create item"
    });
  }
});


router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      name,
      item_type_id,
      purchase_date,
      stock_available,
      active
    } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid item ID"
      });
    }

    const [existing] = await db.query(
      "SELECT * FROM items WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Item not found"
      });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({
        message: "Item name is required"
      });
    }

    const typeId = Number(item_type_id);

    if (!Number.isInteger(typeId) || typeId <= 0) {
      return res.status(400).json({
        message: "Valid item type is required"
      });
    }

    const [typeRows] = await db.query(
      "SELECT id FROM item_types WHERE id = ?",
      [typeId]
    );

    if (typeRows.length === 0) {
      return res.status(400).json({
        message: "Invalid item type"
      });
    }

    if (!purchase_date) {
      return res.status(400).json({
        message: "Purchase date is required"
      });
    }

    const date = new Date(purchase_date);

    if (isNaN(date.getTime())) {
      return res.status(400).json({
        message: "Invalid purchase date"
      });
    }

    const stock = Number(stock_available);

    if (
      stock_available === undefined ||
      stock_available === null ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      return res.status(400).json({
        message: "Stock cannot be negative"
      });
    }

    if (
      active !== true &&
      active !== false &&
      active !== 0 &&
      active !== 1
    ) {
      return res.status(400).json({
        message: "Active status is required"
      });
    }
    const [purchaseHistory] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM purchase_items
      WHERE item_id = ?
      `,
      [id]
    );


    await db.query(
      `
      UPDATE items
      SET
        name = ?,
        purchase_date = ?,
        stock_available = ?,
        item_type_id = ?,
        active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        name.trim(),
        purchase_date,
        stock,
        typeId,
        active ? 1 : 0,
        id
      ]
    );

    res.json({
      message: "Item updated successfully"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update item"
    });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid item ID"
      });
    }

    // Check item
    const [existing] = await db.query(
      "SELECT id FROM items WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Item not found"
      });
    }

    const [history] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM purchase_items
      WHERE item_id = ?
      `,
      [id]
    );

    if (history[0].count > 0) {
      return res.status(409).json({
        message:
          "Item cannot be deleted because it exists in purchase history. Deactivate it instead."
      });
    }

    await db.query(
      "DELETE FROM items WHERE id = ?",
      [id]
    );

    res.json({
      message: "Item deleted successfully"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete item"
    });
  }
});

module.exports = router;