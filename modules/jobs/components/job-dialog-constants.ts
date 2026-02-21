// ─── Job dialog constants & types ─────────────────────────────────────────────

export const ENTITY_OPTIONS = [
    { label: "Invoices", value: "invoices" },
    { label: "Customers", value: "customers" },
    { label: "Vendors", value: "vendors" },
    { label: "Items", value: "items" },
    { label: "Payments", value: "payments" },
    { label: "Bills", value: "bills" },
    { label: "Journal Entries", value: "journal_entries" },
    { label: "Estimates", value: "estimates" },
    { label: "Credit Memos", value: "credit_memos" },
    { label: "Purchase Orders", value: "purchase_orders" },
]

export const ERP_OPTIONS = [
    { label: "QUICKBOOKS ONLINE", value: "quickbooks" },
    { label: "ZOHO BOOKS", value: "zoho-books" },
    { label: "ORACLE FUSION", value: "oracle" },
    { label: "SAP", value: "sap" },
    { label: "MICROSOFT DYNAMICS", value: "dynamics" },
    { label: "NETSUITE", value: "netsuite" },
    { label: "WORKDAY", value: "workday" },
    { label: "INFOR M3", value: "infor-m3" },
    { label: "INFOR LN", value: "infor-ln" },
    { label: "EPICOR KINETIC", value: "epicor" },
    { label: "QAD", value: "qad" },
    { label: "IFS CLOUD", value: "ifs" },
    { label: "SAGE INTACCT", value: "sage" },
    { label: "CUSTOM SOURCE", value: "custom-source" },
]

export const SOURCE_ERP_OPTIONS = ERP_OPTIONS

export const DEFAULT_GLOBAL_RULES = [
    { rule_id: "R4", rule_name: "Whitespace Cleanup", selected: true, description: "Trim leading/trailing whitespace" },
    { rule_id: "R5", rule_name: "Case Normalization", selected: true, description: "Standardize text casing" },
    { rule_id: "R6", rule_name: "Special Characters", selected: false, description: "Remove special characters" },
]

export const ENTITY_COLUMNS: Record<string, string[]> = {
    invoices: ["InvoiceNumber", "CustomerName", "Date", "DueDate", "Amount", "Currency", "Status", "LineItems", "TaxAmount", "Balance"],
    customers: ["DisplayName", "CompanyName", "Email", "Phone", "Address", "City", "State", "Country", "PostalCode", "Status"],
    vendors: ["DisplayName", "CompanyName", "Email", "Phone", "Address", "City", "State", "Country", "AccountNumber", "Status"],
    items: ["Name", "Description", "Type", "UnitPrice", "PurchaseCost", "QtyOnHand", "SKU", "Category", "Taxable", "Status"],
    payments: ["PaymentNumber", "CustomerName", "Date", "Amount", "Currency", "Method", "ReferenceNumber", "Status", "AppliedTo", "UnappliedAmount"],
    bills: ["BillNumber", "VendorName", "Date", "DueDate", "Amount", "Currency", "Status", "LineItems", "TaxAmount", "Balance"],
    journal_entries: ["EntryNumber", "Date", "Account", "Debit", "Credit", "Description", "Currency", "Status"],
    estimates: ["EstimateNumber", "CustomerName", "Date", "ExpirationDate", "Amount", "Currency", "Status", "LineItems"],
    credit_memos: ["CreditMemoNumber", "CustomerName", "Date", "Amount", "Currency", "Status", "LineItems", "Balance"],
    purchase_orders: ["PONumber", "VendorName", "Date", "ShipDate", "Amount", "Currency", "Status", "LineItems"],
}

export function normalizeErpForUi(value?: string): string {
    if (!value) return "quickbooks"
    if (value === "zoho_books" || value === "zohobooks" || value === "zoho-books") {
        return "zoho-books"
    }
    return value
}

export function normalizeErpForApi(value: string): string {
    if (value === "zoho-books" || value === "zoho_books") {
        return "zohobooks"
    }
    return value
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SettingsPreset {
    preset_id: string
    preset_name: string
    is_default?: boolean
    config?: Record<string, any>
}

export interface RuleState {
    rule_id: string
    rule_name: string
    selected: boolean
    description?: string
}

export interface ColumnProfile {
    column_name: string
    data_type?: string
    null_count?: number
    unique_count?: number
    sample_values?: string[]
    quality_score?: number
    rules?: Array<{ rule_id: string; rule_name: string; severity?: string }>
}

export type AdvancedStep = "import" | "columns" | "profiling" | "settings" | "rules" | "process"

export const ADVANCED_STEPS: AdvancedStep[] = ["import", "columns", "profiling", "settings", "rules", "process"]
