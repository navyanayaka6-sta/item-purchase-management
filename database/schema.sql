-- ============================================================
-- ITEM & PURCHASE MANAGEMENT SYSTEM
-- Database: MySQL
-- ============================================================

-- Create database
CREATE DATABASE IF NOT EXISTS item_purchase_db;

USE item_purchase_db;


-- ============================================================
-- 1. ITEM TYPES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS item_types (
    id INT AUTO_INCREMENT PRIMARY KEY,

    type_name VARCHAR(100) NOT NULL UNIQUE
);


-- ============================================================
-- 2. ITEMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    purchase_date DATE NOT NULL,

    stock_available INT NOT NULL DEFAULT 0,

    item_type_id INT NOT NULL,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- Stock cannot be negative
    CONSTRAINT chk_item_stock
        CHECK (stock_available >= 0),

    -- Item type relationship
    CONSTRAINT fk_items_item_type
        FOREIGN KEY (item_type_id)
        REFERENCES item_types(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


-- ============================================================
-- 3. PURCHASES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,

    order_id VARCHAR(50) NOT NULL UNIQUE,

    purchase_date DATE NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- ============================================================
-- 4. PURCHASE ITEMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_items (
    id INT AUTO_INCREMENT PRIMARY KEY,

    purchase_id INT NOT NULL,

    item_id INT NOT NULL,

    quantity INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Quantity must always be greater than zero
    CONSTRAINT chk_purchase_quantity
        CHECK (quantity > 0),

    -- Purchase relationship
    CONSTRAINT fk_purchase_items_purchase
        FOREIGN KEY (purchase_id)
        REFERENCES purchases(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Item relationship
    CONSTRAINT fk_purchase_items_item
        FOREIGN KEY (item_id)
        REFERENCES items(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- One item can appear only once in one purchase
    CONSTRAINT uq_purchase_item
        UNIQUE (purchase_id, item_id)
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_items_item_type
ON items(item_type_id);

CREATE INDEX idx_items_active
ON items(active);

CREATE INDEX idx_purchase_items_purchase
ON purchase_items(purchase_id);

CREATE INDEX idx_purchase_items_item
ON purchase_items(item_id);

CREATE INDEX idx_purchases_order_id
ON purchases(order_id);


-- ============================================================
-- SAMPLE ITEM TYPES
-- ============================================================

INSERT INTO item_types (type_name)
VALUES
    ('Electronics'),
    ('Furniture'),
    ('Clothing'),
    ('Grocery'),
    ('Stationery')
ON DUPLICATE KEY UPDATE
    type_name = VALUES(type_name);


-- ============================================================
-- SAMPLE ITEMS
-- ============================================================

INSERT INTO items
(
    name,
    purchase_date,
    stock_available,
    item_type_id,
    active
)
SELECT
    'Laptop',
    '2026-08-20',
    10,
    id,
    TRUE
FROM item_types
WHERE type_name = 'Electronics'
AND NOT EXISTS (
    SELECT 1
    FROM items
    WHERE name = 'Laptop'
);


INSERT INTO items
(
    name,
    purchase_date,
    stock_available,
    item_type_id,
    active
)
SELECT
    'Mouse',
    '2026-08-20',
    20,
    id,
    TRUE
FROM item_types
WHERE type_name = 'Electronics'
AND NOT EXISTS (
    SELECT 1
    FROM items
    WHERE name = 'Mouse'
);


INSERT INTO items
(
    name,
    purchase_date,
    stock_available,
    item_type_id,
    active
)
SELECT
    'Chair',
    '2026-08-20',
    15,
    id,
    TRUE
FROM item_types
WHERE type_name = 'Furniture'
AND NOT EXISTS (
    SELECT 1
    FROM items
    WHERE name = 'Chair'
);


-- ============================================================
-- CHECK DATA
-- ============================================================

SELECT
    i.id,
    i.name,
    it.type_name,
    i.purchase_date,
    i.stock_available,
    CASE
        WHEN i.stock_available > 0 THEN 'In Stock'
        ELSE 'Out of Stock'
    END AS availability,
    CASE
        WHEN i.active = TRUE THEN 'Active'
        ELSE 'Inactive'
    END AS status
FROM items i
JOIN item_types it
    ON i.item_type_id = it.id
ORDER BY i.id;