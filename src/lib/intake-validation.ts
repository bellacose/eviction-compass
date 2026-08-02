import { z } from "zod";

/** Shared field-error map used by every intake step. */
export type FieldErrors = Record<string, string>;

export function validate<T extends z.ZodTypeAny>(
  schema: T,
  values: unknown,
): { ok: boolean; errors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, errors: {} };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

const today = () => new Date().toISOString().slice(0, 10);

/** Human-readable names for every field the intake steps validate. */
export const FIELD_LABELS: Record<string, string> = {
  address_line1: "Street address",
  address_line2: "Address line 2",
  city: "City",
  state: "State",
  zip: "ZIP code",
  county: "County",
  unit_number: "Unit number",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  monthly_rent: "Monthly rent",
  description: "Description",
  first_name: "First name",
  last_name: "Last name",
  phone: "Phone",
  email: "Email",
  ssn_last4: "SSN (last 4)",
  date_of_birth: "Date of birth",
  lease_type: "Lease type",
  lease_start: "Lease start",
  lease_end: "Lease end",
  security_deposit: "Security deposit",
  occupancy_status: "Occupancy status",
  notes: "Notes",
  matter_type: "Matter type",
  current_balance: "Current balance",
  first_unpaid_month: "First unpaid month",
  last_payment_date: "Last payment date",
  eviction_reason: "Eviction reason",
  eviction_reason_other: "Other reason",
  entry_date: "Date",
  charge_type: "Type",
  amount: "Charge amount",
  payment_amount: "Payment amount",
  credit_amount: "Credit amount",
  _form: "Form",
};

/** Resolves a label for a field key, including ledger keys like `2.amount`. */
export function fieldLabel(name: string): string {
  const rowMatch = /^(\d+)\.(.+)$/.exec(name);
  if (rowMatch) {
    const [, index, field] = rowMatch;
    return `Line ${Number(index) + 1} · ${FIELD_LABELS[field] ?? field}`;
  }
  return FIELD_LABELS[name] ?? name.replace(/_/g, " ");
}

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use a valid date" })
  .or(z.literal(""));

const money = (label: string, max = 10_000_000) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || !Number.isNaN(Number(v)), { message: `${label} must be a number` })
    .refine((v) => v === "" || Number(v) >= 0, { message: `${label} cannot be negative` })
    .refine((v) => v === "" || Number(v) <= max, { message: `${label} looks too large` });

const requiredMoney = (label: string, max = 10_000_000) =>
  money(label, max).refine((v) => v !== "", { message: `${label} is required` });

/* ---------------------------------------------------------------- Property */

export const propertySchema = z.object({
  address_line1: z
    .string()
    .trim()
    .min(3, { message: "Street address is required" })
    .max(200, { message: "Address must be under 200 characters" }),
  address_line2: z.string().trim().max(100, { message: "Too long" }).or(z.literal("")),
  city: z.string().trim().min(2, { message: "City is required" }).max(100, { message: "Too long" }),
  state: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, { message: "Use the 2-letter state code" }),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, { message: "Use a 5-digit ZIP" })
    .or(z.literal("")),
  county: z.string().trim().max(100, { message: "Too long" }).or(z.literal("")),
});

/* -------------------------------------------------------------------- Unit */

export const unitSchema = z.object({
  unit_number: z
    .string()
    .trim()
    .min(1, { message: "Unit number is required" })
    .max(20, { message: "Unit number must be under 20 characters" }),
  description: z.string().trim().max(300, { message: "Too long" }).or(z.literal("")),
  bedrooms: money("Bedrooms", 50),
  bathrooms: money("Bathrooms", 50),
  monthly_rent: money("Monthly rent", 100_000),
});

/* ------------------------------------------------------------------ Tenant */

export const tenantSchema = z
  .object({
    first_name: z
      .string()
      .trim()
      .min(1, { message: "First name is required" })
      .max(100, { message: "Too long" }),
    last_name: z
      .string()
      .trim()
      .min(1, { message: "Last name is required" })
      .max(100, { message: "Too long" }),
    phone: z
      .string()
      .trim()
      .regex(/^[\d\s()+.-]{7,20}$/, { message: "Enter a valid phone number" })
      .or(z.literal("")),
    email: z
      .string()
      .trim()
      .email({ message: "Enter a valid email" })
      .max(255, { message: "Too long" })
      .or(z.literal("")),
    mailing_address: z.string().trim().max(300, { message: "Too long" }).or(z.literal("")),
    ssn_last4: z
      .string()
      .trim()
      .regex(/^\d{4}$/, { message: "Enter exactly the last 4 digits" })
      .or(z.literal("")),
    date_of_birth: optionalDate,
  })
  .superRefine((v, ctx) => {
    if (v.date_of_birth && v.date_of_birth > today()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date_of_birth"],
        message: "Date of birth cannot be in the future",
      });
    }
  });

/* ----------------------------------------------------------------- Tenancy */

export const tenancySchema = z
  .object({
    lease_start: optionalDate,
    lease_end: optionalDate,
    lease_type: z.string().trim().min(1, { message: "Lease type is required" }),
    occupancy_status: z.string().trim().min(1, { message: "Occupancy status is required" }),
    monthly_rent: requiredMoney("Monthly rent", 100_000),
    security_deposit: money("Security deposit", 100_000),
    notes: z.string().trim().max(2000, { message: "Notes must be under 2000 characters" }).or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.lease_start && v.lease_end && v.lease_end < v.lease_start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lease_end"],
        message: "Lease end must be on or after lease start",
      });
    }
    if (v.lease_type !== "none" && !v.lease_start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lease_start"],
        message: "Lease start is required unless there is no lease",
      });
    }
    if (v.monthly_rent && Number(v.monthly_rent) === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["monthly_rent"],
        message: "Monthly rent must be greater than zero",
      });
    }
  });

/* ------------------------------------------------------------ Matter info */

export const matterInfoSchema = z
  .object({
    matter_type: z.string().trim().min(1, { message: "Matter type is required" }),
    first_unpaid_month: optionalDate,
    last_payment_date: optionalDate,
    current_balance: money("Balance", 10_000_000),
    eviction_reason_other: z
      .string()
      .trim()
      .max(2000, { message: "Reason detail must be under 2000 characters" })
      .or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    const t = today();
    if (v.first_unpaid_month && v.first_unpaid_month > t) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["first_unpaid_month"],
        message: "First unpaid month cannot be in the future",
      });
    }
    if (v.last_payment_date && v.last_payment_date > t) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["last_payment_date"],
        message: "Last payment date cannot be in the future",
      });
    }
    if (
      v.first_unpaid_month &&
      v.last_payment_date &&
      v.last_payment_date > v.first_unpaid_month
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["last_payment_date"],
        message: "Last payment should be before the first unpaid month",
      });
    }
    if (v.matter_type === "non_payment") {
      if (!v.first_unpaid_month) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["first_unpaid_month"],
          message: "Required for a non-payment matter",
        });
      }
      if (!v.current_balance || Number(v.current_balance) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["current_balance"],
          message: "A non-payment matter needs a balance greater than zero",
        });
      }
    }
    if (v.matter_type === "other" && !v.eviction_reason_other.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eviction_reason_other"],
        message: "Describe the circumstances for an 'Other' matter",
      });
    }
  });

/* ------------------------------------------------------------------ Ledger */

export type LedgerRowInput = {
  entry_date: string;
  charge_type: string;
  description: string;
  amount: string;
  payment_amount: string;
  credit_amount: string;
};

const toNumber = (v: string) => (v ? Number(v) || 0 : 0);

/** Ledger line types accepted by the database check constraint. */
export const LEDGER_CHARGE_TYPES = [
  { value: "rent", label: "Rent" },
  { value: "late_fee", label: "Late fee" },
  { value: "legal_fee", label: "Legal fee" },
  { value: "court_cost", label: "Court cost" },
  { value: "damages", label: "Damages" },
  { value: "cleaning", label: "Cleaning" },
  { value: "utilities", label: "Utilities" },
  { value: "nsf_fee", label: "NSF fee" },
  { value: "other", label: "Other charge" },
  { value: "payment", label: "Payment" },
  { value: "credit", label: "Credit / deposit" },
] as const;

const LEDGER_TYPE_VALUES = LEDGER_CHARGE_TYPES.map((t) => t.value) as readonly string[];

export function ledgerTotals(rows: LedgerRowInput[]) {
  const charges = rows.reduce((s, r) => s + toNumber(r.amount), 0);
  const payments = rows.reduce((s, r) => s + toNumber(r.payment_amount) + toNumber(r.credit_amount), 0);
  return { charges, payments, balance: Math.round((charges - payments) * 100) / 100 };
}

/** Row-level ledger guardrails keyed by `${index}.${field}`. */
export function validateLedgerRows(rows: LedgerRowInput[]): FieldErrors {
  const errors: FieldErrors = {};
  const t = today();
  rows.forEach((r, i) => {
    if (!r.entry_date) errors[`${i}.entry_date`] = "Date is required";
    else if (r.entry_date > t) errors[`${i}.entry_date`] = "Date cannot be in the future";
    else if (r.entry_date < "2000-01-01") errors[`${i}.entry_date`] = "Date is out of range";
    if (!r.charge_type.trim()) errors[`${i}.charge_type`] = "Type is required";
    else if (!LEDGER_TYPE_VALUES.includes(r.charge_type)) errors[`${i}.charge_type`] = "Pick a valid line type";
    (["amount", "payment_amount", "credit_amount"] as const).forEach((k) => {
      const raw = r[k];
      if (raw !== "" && Number.isNaN(Number(raw))) errors[`${i}.${k}`] = "Must be a number";
      else if (raw !== "" && Number(raw) < 0) errors[`${i}.${k}`] = "Cannot be negative";
    });
    const total = toNumber(r.amount) + toNumber(r.payment_amount) + toNumber(r.credit_amount);
    if (total === 0) errors[`${i}.amount`] = "Enter a charge, payment, or credit";
  });
  return errors;
}

/** Guards against a ledger that nets out to a negative amount owed. */
export function ledgerBalanceIssue(rows: LedgerRowInput[]): string | null {
  if (!rows.length) return null;
  const { balance } = ledgerTotals(rows);
  if (balance < 0) return "Payments and credits exceed charges — the ledger balance cannot be negative.";
  return null;
}

const CENT = 0.01;

/** True when the stated matter balance matches the ledger balance. */
export function balancesMatch(matterBalance: number | null | undefined, ledgerBalance: number) {
  return Math.abs((matterBalance ?? 0) - ledgerBalance) <= CENT;
}
