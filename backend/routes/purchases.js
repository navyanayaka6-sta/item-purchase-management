const express = require("express");
const router = express.Router();

const db = require("../db");


async function generateOrderId(connection) {
  const [rows] = await connection.query(`
    SELECT order_id
    FROM purchases
    ORDER BY id DESC
    LIMIT 1
  `);

  let nextNumber = 1;

  if (rows.length > 0) {
    const lastOrderId = rows[0].order_id;

    const number = parseInt(
      lastOrderId.replace("PO-", ""),
      10
    );

    if (!isNaN(number)) {
      nextNumber = number + 1;
    }
  }

  return `PO-${String(nextNumber).padStart(5, "0")}`;
}


router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        p.id,
        p.order_id,
        p.purchase_date,
        p.created_at,
        p.updated_at,
        COUNT(pi.id) AS total_items
      FROM purchases p
      LEFT JOIN purchase_items pi
        ON p.id = pi.purchase_id
      GROUP BY
        p.id,
        p.order_id,
        p.purchase_date,
        p.created_at,
        p.updated_at
      ORDER BY p.id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch purchases"
    });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const purchaseId = Number(req.params.id);

    if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
      return res.status(400).json({
        message: "Invalid purchase ID"
      });
    }


    const [rows] = await db.query(
      `
      SELECT
        p.id AS purchase_id,
        p.order_id,
        p.purchase_date,

        i.id AS item_id,
        i.name AS item_name,

        it.id AS item_type_id,
        it.type_name,

        pi.quantity,

        i.stock_available AS current_stock,
        i.active

      FROM purchases p

      JOIN purchase_items pi
        ON p.id = pi.purchase_id

      JOIN items i
        ON pi.item_id = i.id

      JOIN item_types it
        ON i.item_type_id = it.id

      WHERE p.id = ?

      ORDER BY pi.id
      `,
      [purchaseId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Purchase not found"
      });
    }

    res.json({
      purchase_id: rows[0].purchase_id,
      order_id: rows[0].order_id,
      purchase_date: rows[0].purchase_date,
      items: rows.map(row => ({
        item_id: row.item_id,
        item_name: row.item_name,
        item_type_id: row.item_type_id,
        type_name: row.type_name,
        quantity: row.quantity,
        current_stock: row.current_stock,
        active: row.active
      }))
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch purchase details"
    });
  }
});

router.post("/", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      purchase_date,
      items
    } = req.body;
    if (!purchase_date) {
      return res.status(400).json({
        message: "Purchase date is required"
      });
    }

    const purchaseDate = new Date(purchase_date);

    if (isNaN(purchaseDate.getTime())) {
      return res.status(400).json({
        message: "Invalid purchase date"
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Purchase must contain at least one item"
      });
    }

    const itemIds = items.map(item => Number(item.item_id));

    const uniqueIds = new Set(itemIds);

    if (uniqueIds.size !== itemIds.length) {
      return res.status(400).json({
        message: "Duplicate items are not allowed in one purchase"
      });
    }
    for (const item of items) {
      const itemId = Number(item.item_id);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(itemId) ||
        itemId <= 0
      ) {
        return res.status(400).json({
          message: "Invalid item ID"
        });
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          message: "Quantity must be greater than zero"
        });
      }
    }


    await connection.beginTransaction();


    const validatedItems = [];

    for (const item of items) {
      const itemId = Number(item.item_id);
      const quantity = Number(item.quantity);

      const [rows] = await connection.query(
        `
        SELECT
          id,
          name,
          stock_available,
          active
        FROM items
        WHERE id = ?
        FOR UPDATE
        `,
        [itemId]
      );

      if (rows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message: `Item ${itemId} not found`
        });
      }

      const selectedItem = rows[0];

      if (!selectedItem.active) {
        await connection.rollback();

        return res.status(409).json({
          message:
            `${selectedItem.name} is inactive and cannot be purchased`
        });
      }

    
      if (quantity > selectedItem.stock_available) {
        await connection.rollback();

        return res.status(409).json({
          message:
            `Insufficient stock for ${selectedItem.name}. Available: ${selectedItem.stock_available}`
        });
      }

      validatedItems.push({
        item_id: itemId,
        quantity,
        current_stock: selectedItem.stock_available
      });
    }

    const orderId = await generateOrderId(connection);

    const [purchaseResult] = await connection.query(
      `
      INSERT INTO purchases
      (
        order_id,
        purchase_date
      )
      VALUES (?, ?)
      `,
      [
        orderId,
        purchase_date
      ]
    );

    const purchaseId = purchaseResult.insertId;

    for (const item of validatedItems) {

      await connection.query(
        `
        INSERT INTO purchase_items
        (
          purchase_id,
          item_id,
          quantity
        )
        VALUES (?, ?, ?)
        `,
        [
          purchaseId,
          item.item_id,
          item.quantity
        ]
      );

      await connection.query(
        `
        UPDATE items
        SET
          stock_available = stock_available - ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          item.quantity,
          item.item_id
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: "Purchase created successfully",
      purchase_id: purchaseId,
      order_id: orderId
    });

  } catch (error) {

    await connection.rollback();

    console.error(error);

    res.status(500).json({
      message: "Purchase failed. No changes were saved."
    });

  } finally {
    connection.release();
  }
});


router.put("/:id", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const purchaseId = Number(req.params.id);

    const {
      purchase_date,
      items
    } = req.body;


    if (
      !Number.isInteger(purchaseId) ||
      purchaseId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid purchase ID"
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

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Purchase must contain at least one item"
      });
    }

    const itemIds = items.map(
      item => Number(item.item_id)
    );

    if (
      new Set(itemIds).size !== itemIds.length
    ) {
      return res.status(400).json({
        message: "Duplicate items are not allowed"
      });
    }

    for (const item of items) {
      const itemId = Number(item.item_id);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(itemId) ||
        itemId <= 0
      ) {
        return res.status(400).json({
          message: "Invalid item ID"
        });
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          message: "Quantity must be greater than zero"
        });
      }
    }
    await connection.beginTransaction();


    const [purchaseRows] = await connection.query(
      `
      SELECT *
      FROM purchases
      WHERE id = ?
      FOR UPDATE
      `,
      [purchaseId]
    );

    if (purchaseRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Purchase not found"
      });
    }


    const [oldItems] = await connection.query(
      `
      SELECT
        item_id,
        quantity
      FROM purchase_items
      WHERE purchase_id = ?
      FOR UPDATE
      `,
      [purchaseId]
    );

    const oldItemMap = {};

    for (const oldItem of oldItems) {
      oldItemMap[oldItem.item_id] = oldItem.quantity;
    }
    const newItemMap = {};

    for (const item of items) {
      newItemMap[Number(item.item_id)] =
        Number(item.quantity);
    }


    const allItemIds = new Set([
      ...Object.keys(oldItemMap).map(Number),
      ...Object.keys(newItemMap).map(Number)
    ]);



    const itemRows = {};

    for (const itemId of allItemIds) {

      const [rows] = await connection.query(
        `
        SELECT
          id,
          name,
          stock_available,
          active
        FROM items
        WHERE id = ?
        FOR UPDATE
        `,
        [itemId]
      );

      if (rows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message: `Item ${itemId} not found`
        });
      }

      itemRows[itemId] = rows[0];
    }


    for (const itemId of allItemIds) {

      const oldQuantity =
        oldItemMap[itemId] || 0;

      const newQuantity =
        newItemMap[itemId] || 0;

      

      const difference =
        newQuantity - oldQuantity;

      const item = itemRows[itemId];

      if (newQuantity > 0 && !item.active) {
        await connection.rollback();

        return res.status(409).json({
          message:
            `${item.name} is inactive and cannot be purchased`
        });
      }

      if (difference > 0) {

        if (
          difference >
          item.stock_available
        ) {
          await connection.rollback();

          return res.status(409).json({
            message:
              `Insufficient stock for ${item.name}. Available: ${item.stock_available}`
          });
        }
      }
    }


    await connection.query(
      `
      UPDATE purchases
      SET
        purchase_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        purchase_date,
        purchaseId
      ]
    );


    await connection.query(
      `
      DELETE FROM purchase_items
      WHERE purchase_id = ?
      `,
      [purchaseId]
    );


    for (const item of items) {

      const itemId = Number(item.item_id);
      const quantity = Number(item.quantity);

      await connection.query(
        `
        INSERT INTO purchase_items
        (
          purchase_id,
          item_id,
          quantity
        )
        VALUES (?, ?, ?)
        `,
        [
          purchaseId,
          itemId,
          quantity
        ]
      );
    }

    for (const itemId of allItemIds) {

      const oldQuantity =
        oldItemMap[itemId] || 0;

      const newQuantity =
        newItemMap[itemId] || 0;

      const difference =
        newQuantity - oldQuantity;

      if (difference !== 0) {

        await connection.query(
          `
          UPDATE items
          SET
            stock_available =
              stock_available - ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            difference,
            itemId
          ]
        );
      }
    }

    await connection.commit();

    res.json({
      message: "Purchase updated successfully"
    });

  } catch (error) {

    await connection.rollback();

    console.error(error);

    res.status(500).json({
      message: "Purchase update failed. No changes were saved."
    });

  } finally {
    connection.release();
  }
});


module.exports = router;