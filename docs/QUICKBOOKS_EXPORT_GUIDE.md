# QuickBooks Export - How to Verify Data Push

## Where to Check if Data Was Pushed to QuickBooks

### 1. **In the Application (Immediate Feedback)**

#### Success Notification
- After clicking **"Push to QuickBooks"** button, you'll see a **success dialog** showing:
  - ✅ "Successfully exported X records to QuickBooks"
  - Number of records exported
  - Confirmation message

#### In the Files Table
- Look at the **status and activity** in the files explorer:
  - File status shows `DQ_FIXED` (data is cleaned and ready)
  - Toast notification appears in top-right corner with confirmation

### 2. **In QuickBooks Online**

#### Step-by-Step to Verify:
1. **Log in to your QuickBooks Online account** at www.quickbooks.intuit.com
2. **Navigate to the entity that was exported**:
   - For **Bills**: Accounting → Bills
   - For **Invoices**: Invoicing → Invoices
   - For **Customers**: Accounting → Customers
   - For **Vendors**: Accounting → Vendors
   - For **Accounts**: Accounting → Accounts
   - For **Items**: Accounting → Items

3. **Look for recently imported records**:
   - Check **created date** for today's date
   - Look for records matching your exported data
   - Filter by **recent first** or **created date descending**

#### Search in QuickBooks:
- Use the search box (Ctrl+F in most browsers)
- Search by:
  - Customer/Vendor name
  - Account number
  - Invoice number
  - Email address
  - Any identifying field from your data

### 3. **Activity History in Application**

#### Recent Activity Feed:
- If available, check your file explorer for:
  - Last export date/time
  - Number of records pushed
  - Status indicator showing "Exported"

#### Browser Console (Developer Mode)
- Press **F12** → Console tab
- Look for success messages:
  ```
  "Successfully exported X records to QuickBooks"
  ```

### 4. **Check QuickBooks Audit Trail**

1. **In QuickBooks Online**:
   - Go to **Gear Icon (⚙️)** → **Audit Trail**
   - Filter by:
     - Date: Today or recent dates
     - User: Your account/API integration
     - Type: Created records

2. **Look for entries showing**:
   - Record type (Invoice, Bill, Customer, etc.)
   - "Created" action
   - Timestamp matching your export time

### 5. **Via QuickBooks API (Advanced)**

If you have API access, you can:
1. Query the QuickBooks API directly
2. Check for records created in the timeframe of export
3. Verify record count matches exported count

---

## Troubleshooting: Data Not Appearing

### If data doesn't appear in QuickBooks:

1. **Check Export Notification**
   - ❌ Did you see "export failed" message? → File data may be missing
   - ✅ Did you see success message? → Check QB account permissions

2. **Verify File Status**
   - Ensure file shows `DQ_FIXED` status
   - Check that data quality score is acceptable
   - Verify rows_out > 0

3. **Check QuickBooks Connection**
   - Verify account is still connected
   - Check token hasn't expired
   - Try reconnecting via OAuth

4. **Verify Permissions**
   - Check QuickBooks API permissions
   - Ensure read/write access for entity type
   - Verify OAuth scope permissions

5. **Check Duplicate Prevention**
   - QuickBooks may reject duplicates
   - Search for records with similar data
   - Check if custom fields are preventing matches

### Common Issues:

| Issue | Solution |
|-------|----------|
| "Connection Failed" | Reconnect your QuickBooks account |
| "No columns selected" | Select at least one column to export |
| "Data file not found" | Reprocess the file first |
| Records appear but with different values | Check field mapping and transformations |
| Quota exceeded | Check your QuickBooks API plan limits |

---

## Best Practices

✅ **Do:**
- Verify data in source file before exporting
- Start with small test exports
- Check QuickBooks immediately after export
- Keep record of export timestamps
- Test with sample data first

❌ **Don't:**
- Export large files without testing smaller portions first
- Export to production without verification
- Assume success without checking QuickBooks
- Modify exported data in QuickBooks if you plan to sync back

---

## FAQ

**Q: How long does it take for data to appear in QuickBooks?**
A: Usually 10-30 seconds. If longer than 2 minutes, refresh QuickBooks or check notifications.

**Q: Can I export the same file twice?**
A: Yes, but QuickBooks may detect duplicates based on matching fields.

**Q: What entities can I export?**
A: Bills, Invoices, Customers, Vendors, Accounts, Items, and more (depends on your QB subscription).

**Q: Is there an audit trail of exports?**
A: Yes - check QuickBooks Audit Trail and application notifications.

**Q: What if export says success but data isn't there?**
A: Check QB account permissions, API scope, and field validation rules in QB.
