---
title: "Assignment 2: PostgreSQL as SQL + NoSQL: Working with JSONB"
layout: default
---

# Assignment 2: PostgreSQL as SQL + NoSQL: Working with JSONB

**Course:** Backend Development  
**Student:** Akshat Purohit  
**SAP ID:** 590014647  

**Learning Objective:** Understand how PostgreSQL's `jsonb` data type enables a single relational database to handle both structured SQL data and semi-structured NoSQL (document-style) data, and evaluate when PostgreSQL + `jsonb` can substitute for MongoDB.

> **Note on Environment:** Queries in Part B are written for **PostgreSQL 16** (`psql`) and **MongoDB 8.2** (`mongosh`). Because PostgreSQL was not installed on this local machine, the PostgreSQL outputs shown below are the deterministic expected outputs for the SQL queries, and `EXPLAIN ANALYZE` plans illustrate the planner behavior (`Seq Scan` vs `Bitmap Index Scan`); exact millisecond timings will vary depending on hardware and dataset size when executed locally (see accompanying `postgres_queries.sql` and `mongo_queries.js`).

---

## Part A: Conceptual Questions

### Q1. What is `jsonb` in PostgreSQL, and how does it differ from the plain `json` type?

Both `json` and `jsonb` validate that incoming data conforms to the JSON specification and reject malformed JSON, but their internal storage representations and runtime characteristics differ significantly.

- **`json` (Textual Storage):** Saves the raw JSON string verbatim—including whitespace, original key ordering, and duplicate keys. Because PostgreSQL stores it as plain text, every query that inspects keys or values must re-parse the JSON string at read time.
- **`jsonb` (Decomposed Binary Storage):** Parses the JSON once during `INSERT` or `UPDATE` and stores it in a structured binary tree. Insignificant whitespace is stripped, keys are rearranged for binary lookup (shorter keys first, then lexicographical order), and duplicate keys are collapsed so that only the last value is retained.

```sql
SELECT '{"z": 10, "a": 20, "a": 99}'::json  AS raw_json,
       '{"z": 10, "a": 20, "a": 99}'::jsonb AS binary_jsonb;
--         raw_json          |   binary_jsonb
-- --------------------------+------------------
--  {"z": 10, "a": 20, "a": 99} | {"a": 99, "z": 10}
```

#### Key Trade-offs

| Aspect | `json` | `jsonb` |
|---|---|---|
| **Write speed** | Faster on insert (only syntax validation, no binary conversion) | Slightly slower on insert due to upfront parsing and binary encoding |
| **Read / Query speed** | Slower (must re-parse JSON text on every access) | Much faster (pre-parsed binary representation supports direct key lookup) |
| **Indexing** | No GIN index support on JSON contents | Supports **GIN** (and `jsonb_path_ops`) indexes for `@>`, `?`, `?\|`, `?&` |
| **Storage size** | Often slightly smaller for short strings because there is no binary metadata overhead | Slightly larger on disk due to binary header/offset metadata, though whitespace is removed |
| **Formatting fidelity** | Preserves exact whitespace, key order, and duplicate keys | Normalizes key order and deduplicates keys |

**Practical recommendation:** Use `jsonb` by default for almost all application workloads. Reserve `json` strictly for audit logs or archival cases where preserving the exact original character formatting and key order is mandatory.

---

### Q2. How can PostgreSQL work as both a SQL and a NoSQL database in the same table?

PostgreSQL supports a **hybrid relational + document** design within a single table by combining strongly typed relational columns with a flexible `jsonb` column:

1. **The SQL (Relational) Layer:** Core fields shared across every record—such as `id`, `name`, `category`, and `price`—are stored as standard typed columns. These benefit from strict data types, `NOT NULL`, `UNIQUE`, `CHECK` constraints, and foreign-key relationships.
2. **The NoSQL (Document) Layer:** Variable, category-dependent properties are stored inside a single `JSONB` column (e.g., `attributes`). In a multi-category store, a smartphone has `ram_gb` and `5g`, running shoes have `size_uk` and `waterproof`, and headphones have `anc` and `battery_hrs`. Modeling all of these as individual SQL columns would create sparse tables filled with `NULL` values and require `ALTER TABLE` migrations for every new product type. With `jsonb`, each row carries only the keys relevant to its category.

```sql
CREATE TABLE products (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(120)  NOT NULL,
    category   VARCHAR(50)   NOT NULL,
    price      NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    attributes JSONB         NOT NULL DEFAULT '{}'::jsonb
);
```

A single SQL statement can filter across both models seamlessly, inside one ACID transaction:

```sql
SELECT name, price, attributes ->> 'brand' AS brand
FROM products
WHERE category = 'smartphone'                  -- relational predicate
  AND (attributes ->> 'storage_gb')::int >= 256; -- document predicate
```

This keeps business-critical invariants strictly enforced while allowing product specifications to evolve without schema migrations.

---

### Q3. Examples of `jsonb` queries using `->`, `->>`, `@>` and `?`

All examples reference the `products` table defined in Part B.

| Operator | Purpose | Example Query | Result |
|---|---|---|---|
| `->` | Extract key/element as **`jsonb`** | `SELECT attributes -> 'brand' FROM products WHERE name = 'Sony WH-1000XM5';` | `"Sony"` (type `jsonb`, includes JSON quotes) |
| `->>` | Extract key/element as **`text`** | `SELECT attributes ->> 'brand' FROM products WHERE name = 'Sony WH-1000XM5';` | `Sony` (type `text`, plain string) |
| `@>` | Check **JSON containment** (left contains right) | `SELECT name FROM products WHERE attributes @> '{"5g": true}';` | `Nothing Phone (2a)`, `Samsung Galaxy S24` |
| `?` | Check **top-level key existence** | `SELECT name FROM products WHERE attributes ? 'anc';` | `Sony WH-1000XM5` |

#### `->` vs `->>` in Practice

Although both extract a field by key (or array index), they return different PostgreSQL types:

```sql
SELECT pg_typeof(attributes -> 'battery_hrs')  AS arrow_type,
       pg_typeof(attributes ->> 'battery_hrs') AS double_arrow_type
FROM products
WHERE name = 'Sony WH-1000XM5';
--  arrow_type | double_arrow_type
-- ------------+-------------------
--  jsonb      | text
```

- **Use `->`** when traversing nested objects/arrays, because the output remains `jsonb` and can be chained further (e.g., `attributes -> 'warranty' ->> 'region'`).
- **Use `->>`** at the final step when displaying a plain string or casting to another SQL type for comparisons or arithmetic (e.g., `(attributes ->> 'battery_hrs')::int >= 20`). Comparing raw text without casting would apply alphabetical ordering rather than numeric ordering (where `'9' > '20'`).

---

### Q4. How can a GIN index on a `jsonb` column change query performance?

A **GIN (Generalized Inverted Index)** indexes the internal components of `jsonb` documents rather than indexing each row as a single opaque value. Conceptually, it builds an inverted lookup map from every key, value, or key-value path inside the JSON documents to the list of table rows containing it:

```sql
CREATE INDEX idx_products_attributes_gin
ON products USING GIN (attributes);
```

*(Note: For workloads that only use `@>`, PostgreSQL also offers the smaller and faster `jsonb_path_ops` operator class: `USING GIN (attributes jsonb_path_ops)`.)*

#### Impact on Queries

1. **Containment and Key-Existence Operators (`@>`, `?`, `?|`, `?&`):**  
   On a large table (e.g., 100,000+ rows), without a GIN index PostgreSQL must perform a full `Seq Scan`, reading and inspecting every row's JSONB document. With a GIN index, PostgreSQL jumps straight to matching row IDs using a `Bitmap Index Scan` + `Bitmap Heap Scan`, turning tens of milliseconds of full-table scanning into sub-millisecond lookups.
2. **Extracted Text / Range Comparisons (`->>` with `>`, `>=`, `<`, `BETWEEN`):**  
   A GIN index does **not** accelerate queries written with `->>` and numeric/range comparisons such as:
   ```sql
   SELECT name FROM products
   WHERE category = 'smartphone'
     AND (attributes ->> 'storage_gb')::int >= 256;
   ```
   GIN indexes track membership/containment, not sorted scalar ranges. To speed up `->>` range or equality filters on a specific key, create a **B-tree expression index**:
   ```sql
   CREATE INDEX idx_products_storage_gb
   ON products (((attributes ->> 'storage_gb')::int));
   ```
3. **Table Size & Write Trade-offs:**  
   - **Small tables:** On tiny tables (such as our 5-row table), PostgreSQL's query planner intentionally ignores the GIN index and chooses a `Seq Scan`, because reading a single 8 KB heap page directly is faster than traversing an index.
   - **Write & storage cost:** Maintaining a GIN index consumes extra disk space and adds overhead to `INSERT` and `UPDATE` operations, since multiple index entries must be updated per document.

---

### Q5. Where could PostgreSQL + `jsonb` replace MongoDB, and where would MongoDB still be the better fit?

| Criteria | PostgreSQL + `jsonb` | MongoDB | Stronger Fit |
|---|---|---|---|
| **ACID Transactions** | Native multi-row, multi-table ACID transactions by default | Multi-document transactions supported (since v4.0), but optimized primarily around single-document atomicity with higher overhead | **PostgreSQL** |
| **Joins & Relationships** | Standard SQL `JOIN`s between relational tables and `jsonb` columns | Uses `$lookup` in aggregation pipelines; less ergonomic and generally slower for complex relational joins | **PostgreSQL** |
| **Schema Enforcement** | Strict schema on fixed columns (`NOT NULL`, FKs, `CHECK`), plus optional constraints on `jsonb` fields | Schema-less by default; optional `$jsonSchema` validation at collection level | **PostgreSQL** for strict integrity; **MongoDB** for rapid schema iteration |
| **Horizontal Scaling** | Primarily vertical scaling; multi-node write sharding requires partitioning or extensions like Citus | Built-in auto-sharding, shard keys, and replica-set clustering out of the box | **MongoDB** |

#### Verdict
- **Choose PostgreSQL + `jsonb`** when the application is predominantly relational (e.g., e-commerce catalogs tied to orders, payments, inventory, and users) and only certain entities have flexible or category-specific metadata. You avoid maintaining two separate database engines while retaining joins and full ACID guarantees.
- **Choose MongoDB** for massive, write-heavy, document-centric workloads with minimal relational joins that demand out-of-the-box horizontal sharding across distributed clusters—such as high-throughput IoT telemetry, event/log ingestion, or content feeds.

---

## Part B: Hands-on Exercise: Product Catalog

### Task 1: Schema

Create a `products` table combining fixed relational columns (`id`, `name`, `category`, `price`) with a flexible `attributes` `JSONB` column:

```sql
CREATE TABLE products (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(120)  NOT NULL,
    category   VARCHAR(50)   NOT NULL,
    price      NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    attributes JSONB         NOT NULL
);
```

---

### Task 2: Insert Data

Insert 5 products across 3 distinct categories (`smartphone`, `footwear`, `audio`), where each category stores different attribute keys inside `attributes`:

```sql
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

SELECT id, name, category, price, attributes
FROM products
ORDER BY id;
```

**Expected Output:**

```text
 id |        name        |  category  |  price   |                              attributes
----+--------------------+------------+----------+----------------------------------------------------------------------
  1 | Nothing Phone (2a) | smartphone | 23999.00 | {"5g": true, "brand": "Nothing", "ram_gb": 8, "storage_gb": 128}
  2 | Samsung Galaxy S24 | smartphone | 74999.00 | {"5g": true, "brand": "Samsung", "ram_gb": 8, "storage_gb": 256}
  3 | Nike Pegasus 41    | footwear   | 11895.00 | {"brand": "Nike", "sport": "running", "size_uk": 9, "waterproof": false}
  4 | Salomon XT-6       | footwear   | 16499.00 | {"brand": "Salomon", "sport": "trail", "size_uk": 10, "waterproof": true}
  5 | Sony WH-1000XM5    | audio      | 29990.00 | {"anc": true, "brand": "Sony", "wireless": true, "battery_hrs": 30}
(5 rows)
```

Notice that PostgreSQL automatically reordered the keys inside `attributes` (for instance, `"5g"` moved ahead of `"brand"`), confirming that `jsonb` converts the input into its internal binary representation.

---

### Task 3: Query by Category-Specific Attribute

Write one query per category filtering on a key unique to that category:

#### 1. Smartphones with at least 256 GB storage

```sql
SELECT name,
       attributes ->> 'brand' AS brand,
       (attributes ->> 'storage_gb')::int AS storage_gb
FROM products
WHERE category = 'smartphone'
  AND (attributes ->> 'storage_gb')::int >= 256;
```

```text
        name        |  brand  | storage_gb
--------------------+---------+------------
 Samsung Galaxy S24 | Samsung |        256
(1 row)
```

#### 2. Footwear that is waterproof

```sql
SELECT name,
       attributes ->> 'brand' AS brand,
       (attributes ->> 'size_uk')::int AS size_uk
FROM products
WHERE category = 'footwear'
  AND (attributes ->> 'waterproof')::boolean = true;
```

```text
     name     |  brand  | size_uk
--------------+---------+---------
 Salomon XT-6 | Salomon |      10
(1 row)
```

#### 3. Audio devices with more than 20 hours of battery life

```sql
SELECT name,
       attributes ->> 'brand' AS brand,
       (attributes ->> 'battery_hrs')::int AS battery_hrs
FROM products
WHERE category = 'audio'
  AND (attributes ->> 'battery_hrs')::int > 20;
```

```text
      name       | brand | battery_hrs
-----------------+-------+-------------
 Sony WH-1000XM5 | Sony  |          30
(1 row)
```

> **Why casting matters:** `->>` always returns `text`. Casting numeric/boolean fields with `::int` or `::boolean` ensures PostgreSQL evaluates numeric inequalities (`100 > 20`) instead of string comparisons (`'100' > '20'` evaluates to `false`).

---

### Task 4: Containment Query

Find all products whose `attributes` JSONB document contains `"5g": true`:

```sql
SELECT name, category, price
FROM products
WHERE attributes @> '{"5g": true}';
```

**Expected Output:**

```text
        name        |  category  |  price
--------------------+------------+----------
 Nothing Phone (2a) | smartphone | 23999.00
 Samsung Galaxy S24 | smartphone | 74999.00
(2 rows)
```

Rows in `footwear` and `audio` do not contain a `5g` key at all, yet PostgreSQL evaluates `@>` safely without throwing missing-column errors.

---

### Task 5: Update JSONB Without Altering the Table

Add a new `"warranty_months": 24` attribute to `'Sony WH-1000XM5'` using the `||` concatenation operator without modifying the table schema:

```sql
UPDATE products
SET attributes = attributes || '{"warranty_months": 24}'::jsonb
WHERE name = 'Sony WH-1000XM5';

SELECT name, attributes
FROM products
WHERE name = 'Sony WH-1000XM5';
```

**Expected Output:**

```text
      name       |                                       attributes
-----------------+-----------------------------------------------------------------------------------------
 Sony WH-1000XM5 | {"anc": true, "brand": "Sony", "wireless": true, "battery_hrs": 30, "warranty_months": 24}
(1 row)
```

Only `'Sony WH-1000XM5'` gained the `warranty_months` property; the other 4 rows remain untouched and no `ALTER TABLE` was needed.

#### Additional JSONB Mutation Examples

```sql
-- Update an existing nested key using jsonb_set
UPDATE products
SET attributes = jsonb_set(attributes, '{ram_gb}', '12')
WHERE name = 'Samsung Galaxy S24';

-- Remove a key using the - operator
UPDATE products
SET attributes = attributes - 'warranty_months'
WHERE name = 'Sony WH-1000XM5';
```

---

### Task 6: Index and Compare

#### 6.1 Creating the GIN Index and Checking the 5-Row Table

```sql
-- Query plan BEFORE adding the GIN index
EXPLAIN ANALYZE
SELECT name FROM products WHERE attributes @> '{"5g": true}';

-- Create GIN index on the jsonb column
CREATE INDEX idx_products_attributes_gin
ON products USING GIN (attributes);

ANALYZE products;

-- Query plan AFTER adding the GIN index
EXPLAIN ANALYZE
SELECT name FROM products WHERE attributes @> '{"5g": true}';
```

**Expected Planner Behavior on 5 Rows:**
On a 5-row table, PostgreSQL fits the entire table into a single 8 KB disk page. Both before and after creating `idx_products_attributes_gin`, `EXPLAIN ANALYZE` chooses a **`Seq Scan on products`** because scanning one page sequentially is cheaper than reading the index plus the heap page.

#### 6.2 Observing the Real Index Difference on a Larger Dataset (`products_scale`)

To see the GIN index take effect, populate a larger benchmark table (e.g., 150,000 rows via `generate_series` in `postgres_queries.sql`) and compare both query types:

```sql
CREATE TABLE products_scale (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(120) NOT NULL,
    category   VARCHAR(50)  NOT NULL,
    price      NUMERIC(10,2) NOT NULL,
    attributes JSONB NOT NULL
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
```

1. **Containment Query (`attributes @> '{"5g": true}'`):**
   - **Before GIN index:** Uses **`Seq Scan on products_scale`**, scanning all 150,000 rows in memory/disk.
   - **After GIN index (`CREATE INDEX idx_scale_attr_gin ON products_scale USING GIN (attributes);`):** Switches to **`Bitmap Heap Scan`** backed by **`Bitmap Index Scan on idx_scale_attr_gin`**, checking only matching row pointers and significantly reducing execution time.

2. **Range Query (`category = 'smartphone' AND (attributes ->> 'storage_gb')::int >= 256`):**
   - **Before and After GIN index:** Remains a **`Seq Scan on products_scale`** because GIN indexes do not index extracted `->>` expressions or support numeric ordering (`>=`).
   - **Solution — B-tree Expression Index:**
     ```sql
     CREATE INDEX idx_scale_storage_btree
     ON products_scale (((attributes ->> 'storage_gb')::int));
     ```
     Once created, queries filtering on `(attributes ->> 'storage_gb')::int` can use `Bitmap Index Scan on idx_scale_storage_btree` / `Index Scan`.

---

### Task 7: MongoDB Comparison

The exact same 5-product catalog and operations from Tasks 2–6 can be executed in `mongosh`:

```javascript
// Switch to a dedicated database
use catalog_db;
db.products.drop();

// Task 2: Insert 5 products
db.products.insertMany([
  {
    name: "Nothing Phone (2a)",
    category: "smartphone",
    price: 23999.00,
    attributes: { brand: "Nothing", ram_gb: 8, storage_gb: 128, "5g": true }
  },
  {
    name: "Samsung Galaxy S24",
    category: "smartphone",
    price: 74999.00,
    attributes: { brand: "Samsung", ram_gb: 8, storage_gb: 256, "5g": true }
  },
  {
    name: "Nike Pegasus 41",
    category: "footwear",
    price: 11895.00,
    attributes: { brand: "Nike", size_uk: 9, waterproof: false, sport: "running" }
  },
  {
    name: "Salomon XT-6",
    category: "footwear",
    price: 16499.00,
    attributes: { brand: "Salomon", size_uk: 10, waterproof: true, sport: "trail" }
  },
  {
    name: "Sony WH-1000XM5",
    category: "audio",
    price: 29990.00,
    attributes: { brand: "Sony", anc: true, wireless: true, battery_hrs: 30 }
  }
]);

// Task 3 equivalents: category-specific queries
db.products.find(
  { category: "smartphone", "attributes.storage_gb": { $gte: 256 } },
  { _id: 0, name: 1, "attributes.brand": 1, "attributes.storage_gb": 1 }
);

db.products.find(
  { category: "footwear", "attributes.waterproof": true },
  { _id: 0, name: 1, "attributes.brand": 1, "attributes.size_uk": 1 }
);

db.products.find(
  { category: "audio", "attributes.battery_hrs": { $gt: 20 } },
  { _id: 0, name: 1, "attributes.brand": 1, "attributes.battery_hrs": 1 }
);

// Task 4 equivalent: containment (@>) and key existence (?)
db.products.find({ "attributes.5g": true }, { _id: 0, name: 1, category: 1 });
db.products.find({ "attributes.anc": { $exists: true } }, { _id: 0, name: 1 });

// Task 5 equivalent: add field without schema change
db.products.updateOne(
  { name: "Sony WH-1000XM5" },
  { $set: { "attributes.warranty_months": 24 } }
);
db.products.findOne({ name: "Sony WH-1000XM5" }, { _id: 0 });

// Task 6 equivalent: index on nested numeric attribute
db.products.createIndex({ "attributes.storage_gb": 1 });
```

**Expected `mongosh` Output:**

```text
// Smartphone query
[ { name: 'Samsung Galaxy S24', attributes: { brand: 'Samsung', storage_gb: 256 } } ]

// Footwear query
[ { name: 'Salomon XT-6', attributes: { brand: 'Salomon', size_uk: 10 } } ]

// Audio query
[ { name: 'Sony WH-1000XM5', attributes: { brand: 'Sony', battery_hrs: 30 } } ]

// 5g: true
[
  { name: 'Nothing Phone (2a)', category: 'smartphone' },
  { name: 'Samsung Galaxy S24', category: 'smartphone' }
]

// anc exists
[ { name: 'Sony WH-1000XM5' } ]

// After $set
{
  name: 'Sony WH-1000XM5',
  category: 'audio',
  price: 29990,
  attributes: {
    brand: 'Sony',
    anc: true,
    wireless: true,
    battery_hrs: 30,
    warranty_months: 24
  }
}

// createIndex
attributes.storage_gb_1
```

#### Key Differences Observed

| Dimension | PostgreSQL + `jsonb` | MongoDB (`mongosh`) |
|---|---|---|
| **Query Language** | SQL + JSONB operators (`->`, `->>`, `@>`, `?`, `\|\|`) | JavaScript/BSON objects + dot notation (`"attributes.storage_gb"`) and `$` operators (`$gte`, `$exists`, `$set`) |
| **Type Handling** | `->>` returns `text`, requiring explicit casts like `(attributes ->> 'storage_gb')::int` | Native BSON types preserved; `{ $gte: 256 }` works directly without casting |
| **Table/Schema Setup** | Explicit `CREATE TABLE` with enforced constraints on fixed columns | Schemaless collection created implicitly on first `insertMany` |
| **Document Updates** | `attributes \|\| '{"warranty_months": 24}'::jsonb` or `jsonb_set(...)` | `$set: { "attributes.warranty_months": 24 }` |
| **Indexing Model** | One GIN index accelerates containment/existence across **all** keys, while range queries need B-tree expression indexes | Standard B-tree indexes are created per nested field path (`"attributes.storage_gb": 1`) and handle both equality and range scans |
| **Relational Integration** | Native `JOIN`s and ACID transactions with other tables (`orders`, `customers`, `inventory`) | Requires `$lookup` aggregation stages for joins across collections |

---

## Summary

| Task | Objective | Key Outcome |
|---|---|---|
| **1** | Hybrid product table schema | Fixed relational columns (`id`, `name`, `category`, `price`) paired with `attributes JSONB` |
| **2** | Insert 5 varied products | 3 categories (`smartphone`, `footwear`, `audio`) stored in one table with distinct JSON shapes |
| **3** | Category-specific queries | Filtered per category using `->>` with explicit `::int` / `::boolean` casts |
| **4** | Containment query (`@>`) | Matched `5g: true` products cleanly without errors on rows lacking that key |
| **5** | Dynamic attribute update | Added `warranty_months` to one row using `\|\|` without `ALTER TABLE` |
| **6** | Indexing & `EXPLAIN ANALYZE` | Small tables use `Seq Scan`; large tables show GIN accelerating `@>` and B-tree expression indexes accelerating `->>` ranges |
| **7** | MongoDB comparison | Equivalent results with simpler nested syntax/typing in MongoDB vs stronger relational guarantees in PostgreSQL |
