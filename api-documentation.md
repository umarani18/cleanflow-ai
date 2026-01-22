# CleanFlowAI API Documentation

> **Base URL**: `https://xxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod`
>
> **Authentication**: All endpoints (except QuickBooks callback) require Cognito JWT Bearer token

---

## 📁 Files API

### GET /files
List all files for the authenticated user.

**Response:**
```json
{
  "items": [
    {
      "upload_id": "abc123",
      "original_filename": "sales_data.csv",
      "status": "DQ_FIXED",
      "dq_score": 85.5,
      "rows_in": 10000,
      "rows_out": 9500,
      "rows_quarantined": 500,
      "created_at": "2024-01-20T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

### GET /files/{id}/status
Get processing status of a specific file.

**Path Parameters:**
- `id` (required): Upload ID

**Response:**
```json
{
  "upload_id": "abc123",
  "status": "DQ_FIXED",
  "dq_score": 85.5,
  "rows_in": 10000,
  "rows_out": 9500,
  "rows_quarantined": 500
}
```

---

### POST /files/{id}/process
Start DQ processing for a file.

**Path Parameters:**
- `id` (required): Upload ID

**Request Body (optional):**
```json
{
  "use_custom_rules": true,
  "custom_rule_prompt": "Check for invalid email formats",
  "selected_columns": ["name", "email", "phone"]
}
```

**Response:**
```json
{
  "message": "Processing started",
  "upload_id": "abc123",
  "execution_arn": "arn:aws:states:..."
}
```

---

### GET /files/{id}/columns
Get column names from the processed file.

**Path Parameters:**
- `id` (required): Upload ID

**Response:**
```json
{
  "columns": ["name", "email", "phone", "dq_status", "dq_violations"]
}
```

---

### GET /files/{id}/preview
Get presigned URLs for downloading clean/quarantine data (legacy).

**Path Parameters:**
- `id` (required): Upload ID

**Response:**
```json
{
  "upload_id": "abc123",
  "status": "DQ_FIXED",
  "dq_score": 85.5,
  "download_urls": {
    "clean_data": "https://s3.amazonaws.com/...",
    "quarantine_data": "https://s3.amazonaws.com/...",
    "dq_report": "https://s3.amazonaws.com/..."
  }
}
```

---

### GET /files/{id}/preview-data ⭐ NEW
Get first N rows as JSON for preview display.

**Path Parameters:**
- `id` (required): Upload ID

**Query Parameters:**
- `limit` (optional): Max rows to return (default: 50, max: 100)
- `data` (optional): Filter by `all`, `clean`, or `quarantine` (default: `all`)

**Response:**
```json
{
  "headers": ["name", "email", "phone", "dq_status"],
  "sample_data": [
    {"name": "John", "email": "john@example.com", "phone": "123456", "dq_status": "clean"},
    {"name": "Jane", "email": "invalid", "phone": "789012", "dq_status": "quarantined"}
  ],
  "total_rows": 10000,
  "returned_rows": 50
}
```

---

### GET /files/{id}/export
Download file in specified format.

**Path Parameters:**
- `id` (required): Upload ID

**Query Parameters:**
- `type` (optional): `csv`, `excel`, `json` (default: `csv`)
- `data` (optional): `all`, `clean`, `quarantine`, `raw` (default: `all`)
- `erp` (optional): Target ERP for column transformation

**Response:**
```json
{
  "presigned_url": "https://s3.amazonaws.com/...",
  "filename": "data_clean.csv"
}
```

> **Frontend Handling:** Open `presigned_url` in new browser window for download

---

### POST /files/{id}/export
Export with column selection and renaming.

**Path Parameters:**
- `id` (required): Upload ID

**Request Body:**
```json
{
  "format": "csv",
  "data": "all",
  "columns": ["name", "email"],
  "column_mapping": {
    "name": "Customer Name",
    "email": "Email Address"
  },
  "erp": "SAP ERP"
}
```

**Response:**
```json
{
  "presigned_url": "https://s3.amazonaws.com/...",
  "filename": "data_all.csv"
}
```

---

### GET /files/{id}/issues
Get paginated list of DQ issues for a file.

**Path Parameters:**
- `id` (required): Upload ID

**Query Parameters:**
- `offset` (optional): Start index (default: 0)
- `limit` (optional): Max items (default: 50)
- `violations` (optional): Filter by violation type

**Response:**
```json
{
  "issues": [
    {
      "row_index": 5,
      "column": "email",
      "value": "invalid-email",
      "violation": "invalid_email_format",
      "message": "Invalid email format"
    }
  ],
  "total": 500,
  "offset": 0,
  "limit": 50
}
```

---

### GET /files/overall/dq-report
Get overall DQ statistics for the user.

**Response:**
```json
{
  "total_files": 10,
  "total_rows_processed": 100000,
  "average_dq_score": 87.5,
  "common_violations": ["missing_value", "invalid_format"]
}
```

---

## 📤 Uploads API

### POST /uploads
Initialize a new file upload.

**Request Body:**
```json
{
  "filename": "sales_data.csv",
  "contentType": "text/csv"
}
```

**Response:**
```json
{
  "upload_id": "abc123",
  "original_filename": "sales_data.csv",
  "key": "data/user123/abc123/temp/sales_data.csv",
  "presignedPost": {
    "url": "https://bucket.s3.amazonaws.com/",
    "fields": {
      "key": "data/user123/abc123/temp/sales_data.csv",
      "policy": "...",
      "x-amz-signature": "..."
    }
  }
}
```

> **Upload Steps:**
> 1. Call POST /uploads to get presigned post URL
> 2. POST file to `presignedPost.url` with form fields + file

---

### GET /uploads
List all uploads (alias for GET /files).

---

### DELETE /uploads/{upload_id}
Delete an upload and all associated files.

**Path Parameters:**
- `upload_id` (required): Upload ID

**Response:**
```json
{
  "message": "Upload deleted successfully"
}
```

---

## 🔗 ERP Integration API

### GET /erp/connections
List user's ERP connections.

**Response:**
```json
{
  "connections": [
    {
      "erp_type": "SAP",
      "connected": true,
      "last_sync": "2024-01-20T10:30:00Z"
    }
  ]
}
```

---

### POST /erp/test
Test ERP connection.

**Request Body:**
```json
{
  "erp_type": "SAP",
  "config": {
    "host": "sap.example.com",
    "client": "100"
  }
}
```

---

### POST /erp/import
Import data from connected ERP.

**Request Body:**
```json
{
  "erp_type": "SAP",
  "entity": "sales_orders",
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

---

### POST /erp/push
Push cleaned data back to ERP.

**Request Body:**
```json
{
  "erp_type": "SAP",
  "upload_id": "abc123",
  "entity": "sales_orders"
}
```

---

## 📒 QuickBooks API

### POST /quickbooks/connect
Generate OAuth authorization URL.

**Response:**
```json
{
  "auth_url": "https://appcenter.intuit.com/connect/oauth2?..."
}
```

---

### GET /quickbooks/callback
OAuth callback handler (NO AUTH - called by QuickBooks popup).

**Query Parameters:**
- `code`: OAuth authorization code
- `state`: Contains user_id
- `realmId`: QuickBooks company ID

---

### GET /quickbooks/connections
Check QuickBooks connection status.

**Response:**
```json
{
  "connected": true,
  "company_name": "Example Corp",
  "realm_id": "123456789"
}
```

---

### DELETE /quickbooks/disconnect
Disconnect QuickBooks integration.

---

### POST /quickbooks/import
Import data from QuickBooks.

**Request Body:**
```json
{
  "entity": "Invoice",
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

---

### POST /quickbooks/export
Export data to QuickBooks.

**Request Body:**
```json
{
  "upload_id": "abc123",
  "entity": "Invoice"
}
```

---

## 🌉 Unified Bridge API

### POST /unified-bridge/ftp/ingest
Ingest data from FTP/SFTP server.

**Request Body:**
```json
{
  "host": "ftp.example.com",
  "port": 21,
  "username": "user",
  "password": "pass",
  "path": "/data/sales.csv",
  "use_sftp": false
}
```

---

### POST /unified-bridge/tcp/ingest
Ingest data from TCP endpoint.

**Request Body:**
```json
{
  "host": "192.168.1.100",
  "port": 8080,
  "protocol": "raw"
}
```

---

### POST /unified-bridge/http/ingest
Ingest data from HTTP endpoint.

**Request Body:**
```json
{
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

---

### POST /unified-bridge/binary/upload
Upload binary file via API.

**Request Body:** Multipart form data with `file` field

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or expired token |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error |

---

## File Status Values

| Status | Description |
|--------|-------------|
| `UPLOADING` | File upload in progress |
| `UPLOADED` | Upload complete, pending validation |
| `VALIDATED` | File validated, ready for processing |
| `DQ_DISPATCHED` | DQ processing queued |
| `DQ_RUNNING` | DQ processing in progress |
| `DQ_FIXED` | DQ complete, ready for download |
| `DQ_FAILED` | DQ processing failed |
| `REJECTED` | File validation failed |
