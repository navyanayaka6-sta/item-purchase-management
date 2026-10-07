const express = require("express");
const router = express.Router();

const db = require("../db");
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, type_name FROM item_types ORDER BY id DESC"
    );

    res.json(rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch item types"
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid item type ID"
      });
    }

    const [rows] = await db.query(
      "SELECT id, type_name FROM item_types WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Item type not found"
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch item type"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { type_name } = req.body;

    if (!type_name || type_name.trim() === "") {
      return res.status(400).json({
        message: "Item type name is required"
      });
    }

    const cleanName = type_name.trim();

    const [existing] = await db.query(
      "SELECT id FROM item_types WHERE LOWER(type_name) = LOWER(?)",
      [cleanName]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Item type already exists"
      });
    }

    const [result] = await db.query(
      "INSERT INTO item_types (type_name) VALUES (?)",
      [cleanName]
    );

    res.status(201).json({
      message: "Item type created successfully",
      id: result.insertId,
      type_name: cleanName
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create item type"
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { type_name } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid item type ID"
      });
    }

    if (!type_name || type_name.trim() === "") {
      return res.status(400).json({
        message: "Item type name is required"
      });
    }

    const cleanName = type_name.trim();

    const [existing] = await db.query(
      "SELECT id FROM item_types WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Item type not found"
      });
    }

    const [duplicate] = await db.query(
      "SELECT id FROM item_types WHERE LOWER(type_name) = LOWER(?) AND id != ?",
      [cleanName, id]
    );

    if (duplicate.length > 0) {
      return res.status(409).json({
        message: "Another item type with this name already exists"
      });
    }

    await db.query(
      "UPDATE item_types SET type_name = ? WHERE id = ?",
      [cleanName, id]
    );

    res.json({
      message: "Item type updated successfully"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update item type"
    });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid item type ID"
      });
    }

    const [existing] = await db.query(
      "SELECT id FROM item_types WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Item type not found"
      });
    }

    const [items] = await db.query(
      "SELECT COUNT(*) AS count FROM items WHERE item_type_id = ?",
      [id]
    );

    if (items[0].count > 0) {
      return res.status(409).json({
        message: "Cannot delete item type because items are using it"
      });
    }

    await db.query(
      "DELETE FROM item_types WHERE id = ?",
      [id]
    );

    res.json({
      message: "Item type deleted successfully"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete item type"
    });
  }
});

module.exports = router;