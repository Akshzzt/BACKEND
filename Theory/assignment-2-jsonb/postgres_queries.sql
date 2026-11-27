-- Assignment 2: PostgreSQL as SQL + NoSQL (JSONB)
-- Student: Akshat Purohit | SAP ID: 590014647

-- Task 1: Schema
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(120)  NOT NULL,
    category   VARCHAR(50)   NOT NULL,
    price      NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    attributes JSONB         NOT NULL
);

-- Task 2: Insert Data
INSERT INTO products (name, category, price, attributes) VALUES
('Nothing Phone (2a)', 'smartphone', 23999.00,
    '{"brand": "Nothing", "ram_gb": 8, "storage_gb": 128, "5g": true}'),
('Samsung Galaxy S24', 'smartphone', 74999.00,
    '{"brand": "Samsung", "ram_gb": 8, "storage_gb": 256, "5g": true}'),
('Nike Pegasus 41', 'footwear', 11895.00,
    '{"brand": "Nike", "size_uk": 9, "waterproof": false, "sport": "running"}'),
('Salomon XT-6', 'footwear', 16499.00,
    '{"brand": "Salomon", "size_uk": 10, "waterproof": true, "sport": "trail"}'),
('Sony WH-1000XM5', 'audio', 29990.00,
    '{"brand": "Sony", "anc": true, "wireless": true, "battery_hrs": 30}');

SELECT id, name, category, price, attributes FROM products ORDER BY id;

-- Task 3: Category-Specific Queries
SELECT name, attributes ->> 'brand' AS brand, (attributes ->> 'storage_gb')::int AS storage_gb
FROM products
WHERE category = 'smartphone'
  AND (attributes ->> 'storage_gb')::int >= 256;

SELECT name, attributes ->> 'brand' AS brand, (attributes ->> 'size_uk')::int AS size_uk
FROM products
WHERE category = 'footwear'
  AND (attributes ->> 'waterproof')::boolean = true;

SELECT name, attributes ->> 'brand' AS brand, (attributes ->> 'battery_hrs')::int AS battery_hrs
FROM products
WHERE category = 'audio'
  AND (attributes ->> 'battery_hrs')::int > 20;

-- Task 4: Containment Query
SELECT name, category, price
FROM products
WHERE attributes @> '{"5g": true}';

-- Task 5: Update JSONB without ALTER TABLE
UPDATE products
SET attributes = attributes || '{"warranty_months": 24}'::jsonb
WHERE name = 'Sony WH-1000XM5';

SELECT name, attributes FROM products WHERE name = 'Sony WH-1000XM5';

-- Task 6: Index and Compare (small table)
EXPLAIN ANALYZE SELECT name FROM products WHERE attributes @> '{"5g": true}';

CREATE INDEX idx_products_attributes_gin ON products USING GIN (attributes);
ANALYZE products;

EXPLAIN ANALYZE SELECT name FROM products WHERE attributes @> '{"5g": true}';

-- Task 6.2: Large-table benchmark (150,000 rows)
DROP TABLE IF EXISTS products_scale;
CREATE TABLE products_scale (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(120)  NOT NULL,
    category   VARCHAR(50)   NOT NULL,
    price      NUMERIC(10,2) NOT NULL,
    attributes JSONB         NOT NULL
);

INSERT INTO products_scale (name, category, price, attributes)
SELECT
    'Item-' || g,
    CASE WHEN g % 3 = 0 THEN 'smartphone'
         WHEN g % 3 = 1 THEN 'footwear'
         ELSE 'audio' END,
    1000 + (g % 50000),
    CASE WHEN g % 3 = 0 THEN jsonb_build_object('brand', 'BrandA', 'storage_gb', CASE WHEN g % 2 = 0 THEN 256 ELSE 128 END, '5g', (g % 20 = 0))
         WHEN g % 3 = 1 THEN jsonb_build_object('brand', 'BrandB', 'size_uk', 8 + (g % 4), 'waterproof', (g % 5 = 0))
         ELSE jsonb_build_object('brand', 'BrandC', 'wireless', true, 'battery_hrs', 15 + (g % 25))
    END
FROM generate_series(1, 150000) AS g;

ANALYZE products_scale;

EXPLAIN ANALYZE SELECT name FROM products_scale WHERE attributes @> '{"5g": true}';
EXPLAIN ANALYZE SELECT name FROM products_scale WHERE category = 'smartphone' AND (attributes ->> 'storage_gb')::int >= 256;

CREATE INDEX idx_scale_attr_gin ON products_scale USING GIN (attributes);
ANALYZE products_scale;

EXPLAIN ANALYZE SELECT name FROM products_scale WHERE attributes @> '{"5g": true}';
EXPLAIN ANALYZE SELECT name FROM products_scale WHERE category = 'smartphone' AND (attributes ->> 'storage_gb')::int >= 256;

CREATE INDEX idx_scale_storage_btree ON products_scale (((attributes ->> 'storage_gb')::int));
ANALYZE products_scale;

EXPLAIN ANALYZE SELECT name FROM products_scale WHERE (attributes ->> 'storage_gb')::int >= 256;
