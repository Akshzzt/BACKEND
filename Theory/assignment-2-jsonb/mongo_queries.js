// Assignment 2 - Task 7: MongoDB Comparison
// Student: Akshat Purohit | SAP ID: 590014647

const catalog = db.getSiblingDB("catalog_db");
catalog.products.drop();

// Task 2: Insert 5 products
catalog.products.insertMany([
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

// Task 3 equivalents
print("Smartphone >= 256GB:");
printjson(
  catalog.products.find(
    { category: "smartphone", "attributes.storage_gb": { $gte: 256 } },
    { _id: 0, name: 1, "attributes.brand": 1, "attributes.storage_gb": 1 }
  ).toArray()
);

print("Waterproof footwear:");
printjson(
  catalog.products.find(
    { category: "footwear", "attributes.waterproof": true },
    { _id: 0, name: 1, "attributes.brand": 1, "attributes.size_uk": 1 }
  ).toArray()
);

print("Audio battery > 20 hrs:");
printjson(
  catalog.products.find(
    { category: "audio", "attributes.battery_hrs": { $gt: 20 } },
    { _id: 0, name: 1, "attributes.brand": 1, "attributes.battery_hrs": 1 }
  ).toArray()
);

// Task 4 equivalents
print("5g: true:");
printjson(
  catalog.products.find({ "attributes.5g": true }, { _id: 0, name: 1, category: 1 }).toArray()
);

print("anc exists:");
printjson(
  catalog.products.find({ "attributes.anc": { $exists: true } }, { _id: 0, name: 1 }).toArray()
);

// Task 5 equivalent
catalog.products.updateOne(
  { name: "Sony WH-1000XM5" },
  { $set: { "attributes.warranty_months": 24 } }
);
print("After $set:");
printjson(catalog.products.findOne({ name: "Sony WH-1000XM5" }, { _id: 0 }));

// Task 6 equivalent
print("Create index:");
print(catalog.products.createIndex({ "attributes.storage_gb": 1 }));
