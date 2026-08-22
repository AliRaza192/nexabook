import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import fs from "fs";
import path from "path";

const schemaSql = fs.readFileSync(
  path.join(__dirname, "schema.sql"),
  "utf8"
);
const triggerSql = fs.readFileSync(
  path.join(__dirname, "../../drizzle/0001_journal_entry_balance_constraint.sql"),
  "utf8"
);
const deferredTriggerSql = fs.readFileSync(
  path.join(__dirname, "../../drizzle/0002_deferred_journal_balance_trigger.sql"),
  "utf8"
);

export async function createTestDb() {
  const client = await PGlite.create();
  await client.exec(schemaSql);
  await client.exec(triggerSql);
  await client.exec(deferredTriggerSql);

  const db = drizzle(client, { schema });

  const orgId = "00000000-0000-0000-0000-000000000001";
  const cogsAccId = "00000000-0000-0000-0000-000000000010";
  const invAccId = "00000000-0000-0000-0000-000000000011";
  const cashAccId = "00000000-0000-0000-0000-000000000012";
  const revAccId = "00000000-0000-0000-0000-000000000013";
  const arAccId = "00000000-0000-0000-0000-000000000014";
  const apAccId = "00000000-0000-0000-0000-000000000015";
  const taxAccId = "00000000-0000-0000-0000-000000000016";
  const custId = "00000000-0000-0000-0000-000000000020";
  const vendId = "00000000-0000-0000-0000-000000000021";
  const prodId = "00000000-0000-0000-0000-000000000030";
  const profileId = "00000000-0000-0000-0000-000000000040";

  await client.query(`INSERT INTO organizations (id, name, slug) VALUES ('${orgId}','Test Co','test-co')`);

  await client.query(`INSERT INTO chart_of_accounts (id, org_id, code, name, type, sub_type) VALUES
    ('${cogsAccId}','${orgId}','5000','Cost of Goods Sold','expense','cogs'),
    ('${invAccId}','${orgId}','1200','Inventory','asset','inventory'),
    ('${cashAccId}','${orgId}','1010','Cash','asset','cash'),
    ('${revAccId}','${orgId}','4000','Sales Revenue','income','sales_revenue'),
    ('${arAccId}','${orgId}','1100','Accounts Receivable','asset','accounts_receivable'),
    ('${apAccId}','${orgId}','2000','Accounts Payable','liability','accounts_payable'),
    ('${taxAccId}','${orgId}','2100','Tax Payable','liability','tax_payable')
  `);

  await client.query(`INSERT INTO customers (id, org_id, name) VALUES ('${custId}','${orgId}','Walk-in Customer')`);
  await client.query(`INSERT INTO vendors (id, org_id, name) VALUES ('${vendId}','${orgId}','Test Vendor')`);
  await client.query(`INSERT INTO products (id, org_id, name, type, sku, current_stock, cost_price) VALUES ('${prodId}','${orgId}','Widget','product','WID-001','100','60')`);

  await client.query(`INSERT INTO profiles (id, user_id, org_id, full_name, email, role) VALUES ('${profileId}','user_123','${orgId}','Test User','test@example.com','admin')`);

  return {
    db,
    client,
    ids: {
      orgId, cogsAccId, invAccId, cashAccId, revAccId, arAccId, apAccId, taxAccId,
      custId, vendId, prodId, profileId,
    },
    async close() {
      await client.close();
    },
  };
}
