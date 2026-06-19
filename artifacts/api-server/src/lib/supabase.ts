import { db } from "@workspace/db";
import {
  patientsTable,
  usersTable,
  appointmentsTable,
  clinicalNotesTable,
  diagnosesTable,
  prescriptionsTable,
  labOrdersTable,
  radiologyOrdersTable,
  invoicesTable,
  drugsTable,
  vaccinationsTable,
  growthRecordsTable,
  activityLogTable,
  alertsTable,
  admissionAssessmentsTable,
} from "@workspace/db";
import {
  eq,
  ilike,
  or,
  gte,
  lte,
  inArray,
  desc,
  asc,
  and,
  sql,
} from "drizzle-orm";
import type { PgTableWithColumns, PgColumn } from "drizzle-orm/pg-core";
import type { Response } from "express";

const TABLE_MAP: Record<string, PgTableWithColumns<any>> = {
  patients: patientsTable,
  users: usersTable,
  appointments: appointmentsTable,
  clinical_notes: clinicalNotesTable,
  diagnoses: diagnosesTable,
  prescriptions: prescriptionsTable,
  lab_orders: labOrdersTable,
  radiology_orders: radiologyOrdersTable,
  invoices: invoicesTable,
  drugs: drugsTable,
  vaccinations: vaccinationsTable,
  growth_records: growthRecordsTable,
  activity_log: activityLogTable,
  alerts: alertsTable,
  admission_assessments: admissionAssessmentsTable,
};

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function mapRow<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [snakeToCamel(k), v])
  ) as T;
}

export function mapRows<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => mapRow<T>(r));
}

export function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [camelToSnake(k), v])
  );
}

export function dbError(
  error: { message: string } | null | undefined,
  res: Response,
  status = 500
): boolean {
  if (error) {
    res.status(status).json({ error: error.message });
    return true;
  }
  return false;
}

function getTable(name: string): PgTableWithColumns<any> {
  const t = TABLE_MAP[name];
  if (!t) throw new Error(`Unknown table: ${name}`);
  return t;
}

function getCol(table: PgTableWithColumns<any>, snakeKey: string): PgColumn {
  const col = (table as any)[snakeToCamel(snakeKey)];
  if (!col) throw new Error(`Unknown column: ${snakeKey} on table`);
  return col;
}

interface QueryBuilder {
  _table: PgTableWithColumns<any>;
  _conditions: any[];
  _orderBy: any[];
  _limit?: number;
  _offset?: number;
  _selectFields?: string[];
  _countOnly: boolean;
  _single: boolean;
  _maybeSingle: boolean;

  select(fields?: string, opts?: { count?: string; head?: boolean }): QueryBuilder;
  eq(col: string, val: unknown): QueryBuilder;
  neq(col: string, val: unknown): QueryBuilder;
  gte(col: string, val: unknown): QueryBuilder;
  lte(col: string, val: unknown): QueryBuilder;
  ilike(col: string, pattern: string): QueryBuilder;
  or(expr: string): QueryBuilder;
  in(col: string, vals: unknown[]): QueryBuilder;
  order(col: string, opts?: { ascending?: boolean }): QueryBuilder;
  range(from: number, to: number): QueryBuilder;
  limit(n: number): QueryBuilder;
  single(): Promise<{ data: any; error: any }>;
  maybeSingle(): Promise<{ data: any; error: any }>;
  insert(values: Record<string, unknown> | Record<string, unknown>[]): QueryBuilder;
  update(values: Record<string, unknown>): QueryBuilder;
  then(resolve: (result: { data: any; error: any; count?: number | null }) => void, reject?: (err: any) => void): Promise<void>;
}

function rowToSnake(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [camelToSnake(k), v])
  );
}

function makeBuilder(tableName: string): QueryBuilder {
  const table = getTable(tableName);

  const state: {
    conditions: any[];
    orderBy: { col: string; asc: boolean }[];
    limitN?: number;
    offsetN?: number;
    countOnly: boolean;
    single: boolean;
    maybeSingle: boolean;
    insertValues?: Record<string, unknown>[];
    updateValues?: Record<string, unknown>;
    selectAfterMutation: boolean;
  } = {
    conditions: [],
    orderBy: [],
    countOnly: false,
    single: false,
    maybeSingle: false,
    selectAfterMutation: false,
  };

  async function execute(): Promise<{ data: any; error: any; count?: number | null }> {
    try {
      const whereClause = state.conditions.length > 0 ? and(...state.conditions) : undefined;

      if (state.insertValues) {
        const inserted = await db.insert(table).values(state.insertValues as any).returning();
        const rows = inserted.map(rowToSnake);
        return { data: state.single || state.maybeSingle ? rows[0] ?? null : rows, error: null };
      }

      if (state.updateValues) {
        const updated = await db.update(table).set(state.updateValues as any).where(whereClause).returning();
        const rows = updated.map(rowToSnake);
        return { data: state.single || state.maybeSingle ? rows[0] ?? null : rows, error: null };
      }

      if (state.countOnly) {
        const result = await db.select({ count: sql<number>`count(*)` }).from(table).where(whereClause);
        return { data: null, error: null, count: Number(result[0]?.count ?? 0) };
      }

      let query = db.select().from(table).where(whereClause) as any;

      if (state.orderBy.length > 0) {
        const orderClauses = state.orderBy.map(({ col, asc: ascending }) => {
          const c = getCol(table, col);
          return ascending ? asc(c) : desc(c);
        });
        query = query.orderBy(...orderClauses);
      }

      if (state.limitN !== undefined) {
        query = query.limit(state.limitN);
      }

      if (state.offsetN !== undefined) {
        query = query.offset(state.offsetN);
      }

      const rows = await query;
      const snaked = rows.map(rowToSnake);

      if (state.single) return { data: snaked[0] ?? null, error: null };
      if (state.maybeSingle) return { data: snaked[0] ?? null, error: null };
      return { data: snaked, error: null, count: null };
    } catch (err: any) {
      return { data: null, error: { message: err?.message ?? String(err) } };
    }
  }

  const builder: QueryBuilder = {
    _table: table,
    _conditions: state.conditions,
    _orderBy: [],
    _countOnly: false,
    _single: false,
    _maybeSingle: false,

    select(fields?: string, opts?: { count?: string; head?: boolean }) {
      if (opts?.count === "exact" && opts?.head === true) {
        state.countOnly = true;
      }
      return builder;
    },

    eq(col: string, val: unknown) {
      state.conditions.push(eq(getCol(table, col), val as any));
      return builder;
    },

    neq(col: string, val: unknown) {
      state.conditions.push(sql`${getCol(table, col)} != ${val}`);
      return builder;
    },

    gte(col: string, val: unknown) {
      state.conditions.push(gte(getCol(table, col), val as any));
      return builder;
    },

    lte(col: string, val: unknown) {
      state.conditions.push(lte(getCol(table, col), val as any));
      return builder;
    },

    ilike(col: string, pattern: string) {
      state.conditions.push(ilike(getCol(table, col), pattern));
      return builder;
    },

    or(expr: string) {
      const parts = expr.split(",").map((part) => part.trim());
      const orConditions = parts.map((part) => {
        const ilikeMatch = part.match(/^(\w+)\.ilike\.(.+)$/);
        if (ilikeMatch) {
          return ilike(getCol(table, ilikeMatch[1]), ilikeMatch[2]);
        }
        const eqMatch = part.match(/^(\w+)\.eq\.(.+)$/);
        if (eqMatch) {
          return eq(getCol(table, eqMatch[1]), eqMatch[2]);
        }
        throw new Error(`Unsupported or() expression: ${part}`);
      });
      if (orConditions.length === 1) {
        state.conditions.push(orConditions[0]);
      } else {
        state.conditions.push(or(...orConditions));
      }
      return builder;
    },

    in(col: string, vals: unknown[]) {
      state.conditions.push(inArray(getCol(table, col), vals as any[]));
      return builder;
    },

    order(col: string, opts?: { ascending?: boolean }) {
      state.orderBy.push({ col, asc: opts?.ascending !== false });
      return builder;
    },

    range(from: number, to: number) {
      state.offsetN = from;
      state.limitN = to - from + 1;
      return builder;
    },

    limit(n: number) {
      state.limitN = n;
      return builder;
    },

    async single() {
      state.single = true;
      return execute();
    },

    async maybeSingle() {
      state.maybeSingle = true;
      return execute();
    },

    insert(values: Record<string, unknown> | Record<string, unknown>[]) {
      state.insertValues = Array.isArray(values) ? values : [values];
      return builder;
    },

    update(values: Record<string, unknown>) {
      state.updateValues = values;
      return builder;
    },

    then(
      resolve: (result: { data: any; error: any; count?: number | null }) => void,
      reject?: (err: any) => void
    ) {
      return execute().then(resolve, reject);
    },
  };

  return builder;
}

export const supabase = {
  from(tableName: string) {
    return makeBuilder(tableName);
  },
};
