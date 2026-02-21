// ─── QuickBooks field mapping definitions & helpers ───────────────────────────

export interface MappingField {
    key: string
    label: string
    required: boolean
    help: string
}

export function getMappingFields(entity: string): MappingField[] {
    if (entity === 'customers') {
        return [
            { key: 'customer_name', label: 'Customer Name', required: true, help: 'Display name in QuickBooks (required)' },
            { key: 'company_name', label: 'Company Name', required: false, help: 'Company name' },
            { key: 'email', label: 'Email', required: false, help: 'Primary email address' },
            { key: 'phone', label: 'Phone', required: false, help: 'Primary phone number' },
            { key: 'billing_address', label: 'Billing Address', required: false, help: 'Street address line 1' },
            { key: 'billing_city', label: 'Billing City', required: false, help: 'City' },
            { key: 'billing_state', label: 'Billing State', required: false, help: 'State/Province' },
            { key: 'billing_zip', label: 'Billing Zip', required: false, help: 'Postal/ZIP code' },
            { key: 'billing_country', label: 'Billing Country', required: false, help: 'Country' },
            { key: 'notes', label: 'Notes', required: false, help: 'Customer notes' },
        ]
    }
    if (entity === 'invoices') {
        return [
            { key: 'customer_name', label: 'Customer Name', required: true, help: 'Customer display name (required)' },
            { key: 'invoice_number', label: 'Invoice Number', required: false, help: 'DocNumber in QuickBooks' },
            { key: 'invoice_date', label: 'Invoice Date', required: false, help: 'Transaction date (YYYY-MM-DD)' },
            { key: 'due_date', label: 'Due Date', required: false, help: 'Payment due date' },
            { key: 'total_amount', label: 'Total Amount', required: false, help: 'Invoice total' },
            { key: 'description', label: 'Description', required: false, help: 'Line item description' },
            { key: 'quantity', label: 'Quantity', required: false, help: 'Line item quantity' },
            { key: 'rate', label: 'Rate', required: false, help: 'Unit price per item' },
            { key: 'line_amount', label: 'Line Amount', required: false, help: 'Line total (qty × rate)' },
        ]
    }
    if (entity === 'vendors') {
        return [
            { key: 'vendor_name', label: 'Vendor Name', required: true, help: 'Display name in QuickBooks (required)' },
            { key: 'company_name', label: 'Company Name', required: false, help: 'Company name' },
            { key: 'email', label: 'Email', required: false, help: 'Primary email address' },
            { key: 'phone', label: 'Phone', required: false, help: 'Primary phone number' },
            { key: 'billing_address', label: 'Billing Address', required: false, help: 'Street address' },
            { key: 'billing_city', label: 'Billing City', required: false, help: 'City' },
            { key: 'billing_state', label: 'Billing State', required: false, help: 'State/Province' },
            { key: 'billing_zip', label: 'Billing Zip', required: false, help: 'Postal/ZIP code' },
            { key: 'billing_country', label: 'Billing Country', required: false, help: 'Country' },
        ]
    }
    if (entity === 'items') {
        return [
            { key: 'item_name', label: 'Item Name', required: true, help: 'Item name in QuickBooks (required)' },
            { key: 'description', label: 'Description', required: false, help: 'Item description' },
            { key: 'unit_price', label: 'Unit Price', required: false, help: 'Sales price' },
            { key: 'cost', label: 'Cost', required: false, help: 'Purchase cost' },
            { key: 'quantity_on_hand', label: 'Qty On Hand', required: false, help: 'Stock quantity' },
            { key: 'sku', label: 'SKU', required: false, help: 'Stock keeping unit' },
        ]
    }
    return []
}

export function normalizeKey(value: string) {
    return value.toLowerCase().replace(/[\s_-]+/g, '')
}

export function autoMapColumns(entity: string, columns: string[]) {
    const fields = getMappingFields(entity)
    const mapping: Record<string, string> = {}
    const normalized = new Map(columns.map((c) => [normalizeKey(c), c]))

    for (const field of fields) {
        const match = normalized.get(normalizeKey(field.key))
        if (match) {
            mapping[field.key] = match
            continue
        }

        if (field.key === 'customer_name') {
            const alts = ['customername', 'displayname', 'name', 'customer', 'clientname']
            for (const a of alts) {
                const found = normalized.get(a)
                if (found) { mapping[field.key] = found; break }
            }
        }
        if (field.key === 'vendor_name') {
            const alts = ['vendorname', 'displayname', 'name', 'vendor', 'suppliername']
            for (const a of alts) {
                const found = normalized.get(a)
                if (found) { mapping[field.key] = found; break }
            }
        }
        if (field.key === 'item_name') {
            const alts = ['itemname', 'productname', 'name', 'item', 'product']
            for (const a of alts) {
                const found = normalized.get(a)
                if (found) { mapping[field.key] = found; break }
            }
        }
        if (field.key === 'invoice_number') {
            const alts = ['invoicenumber', 'invoiceno', 'docnumber', 'invno', 'invoiceid']
            for (const a of alts) {
                const found = normalized.get(a)
                if (found) { mapping[field.key] = found; break }
            }
        }
        if (field.key === 'email') {
            const alts = ['email', 'emailaddress', 'primaryemail']
            for (const a of alts) {
                const found = normalized.get(a)
                if (found) { mapping[field.key] = found; break }
            }
        }
        if (field.key === 'phone') {
            const alts = ['phone', 'phonenumber', 'primaryphone', 'telephone']
            for (const a of alts) {
                const found = normalized.get(a)
                if (found) { mapping[field.key] = found; break }
            }
        }
    }
    return mapping
}

export function validateMapping(entity: string, mapping: Record<string, string>, columns: string[]) {
    const fields = getMappingFields(entity)
    const available = new Set(columns)

    for (const field of fields) {
        if (field.required) {
            const source = mapping[field.key]
            if (!source || !available.has(source)) {
                return { valid: false, message: `Missing required mapping for ${field.label}.` }
            }
        }
    }
    return { valid: true, message: '' }
}
