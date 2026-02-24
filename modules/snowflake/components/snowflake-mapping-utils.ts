// ─── Snowflake entity mapping definitions & helpers ───────────────────────────

export type SnowflakeEntity =
    | 'customers'
    | 'vendors'
    | 'invoices'
    | 'bills'
    | 'chart_of_accounts'
    | 'journal_entries'
    | 'items'
    | 'general'

export interface MappingField {
    key: string
    label: string
    required: boolean
    help: string
}

export const SNOWFLAKE_ENTITY_OPTIONS = [
    { value: 'customers', label: 'Customers', table: 'CUSTOMERS' },
    { value: 'vendors', label: 'Vendors', table: 'VENDORS' },
    { value: 'invoices', label: 'Invoices', table: 'INVOICES' },
    { value: 'bills', label: 'Bills', table: 'BILLS' },
    { value: 'chart_of_accounts', label: 'Chart of Accounts', table: 'CHART_OF_ACCOUNTS' },
    { value: 'journal_entries', label: 'Journal Entries', table: 'JOURNAL_ENTRIES' },
    { value: 'items', label: 'Items / Products', table: 'ITEMS' },
    { value: 'general', label: 'General (all columns)', table: '' },
] as const

export function getSnowflakeTableName(entity: SnowflakeEntity): string {
    const option = SNOWFLAKE_ENTITY_OPTIONS.find((o) => o.value === entity)
    return option?.table || ''
}

export function getMappingFields(entity: string): MappingField[] {
    if (entity === 'customers') {
        return [
            { key: 'CUSTOMER_NAME', label: 'Customer Name', required: true, help: 'Primary customer identifier' },
            { key: 'COMPANY_NAME', label: 'Company Name', required: false, help: 'Company or organization name' },
            { key: 'EMAIL', label: 'Email', required: false, help: 'Primary email address' },
            { key: 'PHONE', label: 'Phone', required: false, help: 'Primary phone number' },
            { key: 'BILLING_ADDRESS', label: 'Billing Address', required: false, help: 'Street address' },
            { key: 'BILLING_CITY', label: 'City', required: false, help: 'City' },
            { key: 'BILLING_STATE', label: 'State', required: false, help: 'State / Province' },
            { key: 'BILLING_ZIP', label: 'Zip Code', required: false, help: 'Postal / ZIP code' },
            { key: 'BILLING_COUNTRY', label: 'Country', required: false, help: 'Country' },
            { key: 'NOTES', label: 'Notes', required: false, help: 'Additional notes' },
        ]
    }
    if (entity === 'vendors') {
        return [
            { key: 'VENDOR_NAME', label: 'Vendor Name', required: true, help: 'Primary vendor identifier' },
            { key: 'COMPANY_NAME', label: 'Company Name', required: false, help: 'Company or organization name' },
            { key: 'EMAIL', label: 'Email', required: false, help: 'Primary email address' },
            { key: 'PHONE', label: 'Phone', required: false, help: 'Primary phone number' },
            { key: 'BILLING_ADDRESS', label: 'Billing Address', required: false, help: 'Street address' },
            { key: 'BILLING_CITY', label: 'City', required: false, help: 'City' },
            { key: 'BILLING_STATE', label: 'State', required: false, help: 'State / Province' },
            { key: 'BILLING_ZIP', label: 'Zip Code', required: false, help: 'Postal / ZIP code' },
            { key: 'BILLING_COUNTRY', label: 'Country', required: false, help: 'Country' },
        ]
    }
    if (entity === 'invoices') {
        return [
            { key: 'CUSTOMER_NAME', label: 'Customer Name', required: true, help: 'Customer who received the invoice' },
            { key: 'INVOICE_NUMBER', label: 'Invoice Number', required: false, help: 'Unique invoice identifier' },
            { key: 'INVOICE_DATE', label: 'Invoice Date', required: false, help: 'Date issued (YYYY-MM-DD)' },
            { key: 'DUE_DATE', label: 'Due Date', required: false, help: 'Payment due date' },
            { key: 'TOTAL_AMOUNT', label: 'Total Amount', required: false, help: 'Invoice total' },
            { key: 'DESCRIPTION', label: 'Description', required: false, help: 'Line item description' },
            { key: 'QUANTITY', label: 'Quantity', required: false, help: 'Line item quantity' },
            { key: 'RATE', label: 'Rate', required: false, help: 'Unit price per item' },
            { key: 'LINE_AMOUNT', label: 'Line Amount', required: false, help: 'Line total (qty × rate)' },
        ]
    }
    if (entity === 'bills') {
        return [
            { key: 'VENDOR_NAME', label: 'Vendor Name', required: true, help: 'Vendor who issued the bill' },
            { key: 'BILL_NUMBER', label: 'Bill Number', required: false, help: 'Unique bill identifier' },
            { key: 'BILL_DATE', label: 'Bill Date', required: false, help: 'Date received (YYYY-MM-DD)' },
            { key: 'DUE_DATE', label: 'Due Date', required: false, help: 'Payment due date' },
            { key: 'TOTAL_AMOUNT', label: 'Total Amount', required: false, help: 'Bill total' },
            { key: 'DESCRIPTION', label: 'Description', required: false, help: 'Line item description' },
            { key: 'QUANTITY', label: 'Quantity', required: false, help: 'Line item quantity' },
            { key: 'RATE', label: 'Rate', required: false, help: 'Unit price' },
            { key: 'LINE_AMOUNT', label: 'Line Amount', required: false, help: 'Line total' },
        ]
    }
    if (entity === 'chart_of_accounts') {
        return [
            { key: 'ACCOUNT_NAME', label: 'Account Name', required: true, help: 'Name of the account' },
            { key: 'ACCOUNT_TYPE', label: 'Account Type', required: false, help: 'Asset, Liability, Revenue, Expense, etc.' },
            { key: 'ACCOUNT_NUMBER', label: 'Account Number', required: false, help: 'Account code / number' },
            { key: 'BALANCE', label: 'Balance', required: false, help: 'Current balance' },
            { key: 'CURRENCY', label: 'Currency', required: false, help: 'Currency code (e.g. USD)' },
            { key: 'DESCRIPTION', label: 'Description', required: false, help: 'Account description' },
        ]
    }
    if (entity === 'journal_entries') {
        return [
            { key: 'ENTRY_ID', label: 'Entry ID', required: false, help: 'Unique journal entry identifier' },
            { key: 'ENTRY_DATE', label: 'Date', required: true, help: 'Journal entry date (YYYY-MM-DD)' },
            { key: 'ACCOUNT_NAME', label: 'Account Name', required: true, help: 'GL account name' },
            { key: 'DEBIT', label: 'Debit', required: false, help: 'Debit amount' },
            { key: 'CREDIT', label: 'Credit', required: false, help: 'Credit amount' },
            { key: 'DESCRIPTION', label: 'Description', required: false, help: 'Entry memo / description' },
            { key: 'REFERENCE', label: 'Reference', required: false, help: 'External reference number' },
        ]
    }
    if (entity === 'items') {
        return [
            { key: 'ITEM_NAME', label: 'Item Name', required: true, help: 'Product / item name' },
            { key: 'DESCRIPTION', label: 'Description', required: false, help: 'Item description' },
            { key: 'SKU', label: 'SKU', required: false, help: 'Stock keeping unit' },
            { key: 'UNIT_PRICE', label: 'Unit Price', required: false, help: 'Sales price' },
            { key: 'COST', label: 'Cost', required: false, help: 'Purchase cost' },
            { key: 'QUANTITY_ON_HAND', label: 'Qty On Hand', required: false, help: 'Stock quantity' },
            { key: 'CATEGORY', label: 'Category', required: false, help: 'Item category' },
        ]
    }
    // 'general' — no predefined fields, all columns passed as-is
    return []
}

// ─── Auto-mapping ────────────────────────────────────────────────────────────

function normalizeKey(value: string) {
    return value.toLowerCase().replace(/[\s_\-]+/g, '')
}

const ALIAS_MAP: Record<string, string[]> = {
    CUSTOMER_NAME: ['customername', 'displayname', 'name', 'customer', 'clientname'],
    VENDOR_NAME: ['vendorname', 'displayname', 'name', 'vendor', 'suppliername', 'supplier'],
    COMPANY_NAME: ['companyname', 'company', 'organization', 'orgname'],
    EMAIL: ['email', 'emailaddress', 'primaryemail', 'mail'],
    PHONE: ['phone', 'phonenumber', 'primaryphone', 'telephone', 'tel'],
    INVOICE_NUMBER: ['invoicenumber', 'invoiceno', 'docnumber', 'invno', 'invoiceid'],
    BILL_NUMBER: ['billnumber', 'billno', 'billid'],
    ITEM_NAME: ['itemname', 'productname', 'name', 'item', 'product'],
    ACCOUNT_NAME: ['accountname', 'account', 'glname', 'glaccount'],
    SKU: ['sku', 'stockcode', 'barcode', 'productcode', 'itemcode'],
    TOTAL_AMOUNT: ['totalamount', 'total', 'amount', 'grandtotal'],
    DESCRIPTION: ['description', 'desc', 'memo', 'notes', 'details'],
    QUANTITY: ['quantity', 'qty'],
    RATE: ['rate', 'unitprice', 'price'],
    LINE_AMOUNT: ['lineamount', 'linetotal', 'subtotal'],
    BALANCE: ['balance', 'currentbalance', 'amount'],
    DEBIT: ['debit', 'debitamount', 'dr'],
    CREDIT: ['credit', 'creditamount', 'cr'],
    ENTRY_DATE: ['entrydate', 'date', 'journaldate', 'txndate', 'transactiondate'],
    INVOICE_DATE: ['invoicedate', 'date', 'txndate', 'transactiondate'],
    BILL_DATE: ['billdate', 'date', 'txndate'],
    DUE_DATE: ['duedate', 'paymentdue', 'due'],
    BILLING_ADDRESS: ['billingaddress', 'address', 'streetaddress', 'street', 'address1'],
    BILLING_CITY: ['billingcity', 'city'],
    BILLING_STATE: ['billingstate', 'state', 'province', 'region'],
    BILLING_ZIP: ['billingzip', 'zip', 'zipcode', 'postalcode', 'postcode'],
    BILLING_COUNTRY: ['billingcountry', 'country'],
}

export function autoMapColumns(entity: string, columns: string[]): Record<string, string> {
    const fields = getMappingFields(entity)
    const mapping: Record<string, string> = {}
    const normalized = new Map(columns.map((c) => [normalizeKey(c), c]))
    const used = new Set<string>()

    for (const field of fields) {
        // Direct match
        const direct = normalized.get(normalizeKey(field.key))
        if (direct && !used.has(direct)) {
            mapping[field.key] = direct
            used.add(direct)
            continue
        }

        // Alias match
        const aliases = ALIAS_MAP[field.key] || []
        for (const alias of aliases) {
            const found = normalized.get(alias)
            if (found && !used.has(found)) {
                mapping[field.key] = found
                used.add(found)
                break
            }
        }
    }

    return mapping
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateMapping(
    entity: string,
    mapping: Record<string, string>,
    columns: string[]
): { valid: boolean; message: string } {
    if (entity === 'general') {
        return { valid: true, message: '' }
    }

    const fields = getMappingFields(entity)
    const available = new Set(columns)

    for (const field of fields) {
        if (field.required) {
            const source = mapping[field.key]
            if (!source || !available.has(source)) {
                return { valid: false, message: `Missing required mapping for "${field.label}".` }
            }
        }
    }
    return { valid: true, message: '' }
}
