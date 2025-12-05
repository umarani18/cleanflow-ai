# Frontend Integration – Overall Per‑User DQ Report

This guide explains how the frontend downloads the **overall per‑user DQ summary** (`overall_dq_results.json`) that aggregates monthly metrics across all processed files.

---

## 1. What the backend exposes

### 1.1 S3 location & JSON shape

For each authenticated user (`user_id` from Cognito), the AI DQ Lambda maintains a single JSON file:

- S3 key: `data/{user_id}/overall_dq_results.json`

Example:

```json
{
  "user_id": "71a34dfa-c0e1-7099-de85-ecab528ae58d",
  "generated_at_utc": "2025-12-05T06:10:12.345678",
  "months": {
    "12/2025": {
      "files_processed": 3,
      "files_deleted": 1,
      "total_processing_time_seconds": 1.234,
      "rows_in": 150,
      "rows_out": 150,
      "rows_fixed": 10,
      "rows_quarantined": 40
    }
  }
}
```

Semantics per month (`"MM/YYYY"`):

- `files_processed`: successful DQ runs.
- `files_deleted`: delete actions for that month.
- `total_processing_time_seconds`: sum of per‑file processing times.
- `rows_in`: total input rows processed.
- `rows_out`: total output rows.
- `rows_fixed`: total fixed rows.
- `rows_quarantined`: total quarantined rows.

### 1.2 HTTP endpoint

Defined in the file‑processing API (API Gateway → `lambda/file_processor/app.py`):

- Endpoint: `GET /files/overall/dq-report`
- Auth: Cognito (same as other `/files` routes).
- Response (success):

  - `statusCode: 200`
  - Headers (includes CORS):

    ```http
    Content-Type: application/json
    Content-Disposition: attachment; filename="overall_dq_results.json"
    Access-Control-Allow-Origin: *
    ...
    ```

  - Body: base64‑encoded JSON
  - `isBase64Encoded: true`

The same Lambda handles `OPTIONS /files/overall/dq-report` for preflight (CORS).

---

## 2. Frontend API usage

### 2.1 apiService method

File: `test-reactui/src/services/apiService.js`

```js
async downloadOverallDqReport() {
  // Demo mode: return a small dummy report
  if (authService.isDemoMode()) {
    const dummy = JSON.stringify(
      {
        user_id: "demo-user",
        generated_at_utc: new Date().toISOString(),
        months: {
          "12/2025": {
            files_processed: 3,
            files_deleted: 1,
            total_processing_time_seconds: 1.23,
            rows_in: 150,
            rows_out: 150,
            rows_fixed: 10,
            rows_quarantined: 40
          }
        }
      },
      null,
      2
    );
    return new Blob([dummy], { type: "application/json" });
  }

  const token = authService.getAuthToken();
  const url = `${this.baseURL}/files/overall/dq-report`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Overall DQ report download failed: ${response.statusText}`
    );
  }

  // Normalize proxy envelope / base64 / plain JSON to a Blob
  const text = await response.text();

  const tryDecodeBase64 = (s) => {
    try {
      const trimmed = (s || "").trim();
      if (!trimmed) return null;
      const binary = atob(trimmed);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: "application/json" });
    } catch (e) {
      return null;
    }
  };

  // Case 1: JSON envelope { body: <base64>, ... }
  try {
    const payload = JSON.parse(text);
    const base64Body = payload.body || payload.data || "";
    if (base64Body) {
      const decodedBlob = tryDecodeBase64(base64Body);
      if (decodedBlob) return decodedBlob;
    }
    // If no body field, treat payload itself as the report
    return new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
  } catch {
    // Not JSON – continue
  }

  // Case 2: plain base64 string
  const decoded = tryDecodeBase64(text);
  if (decoded) return decoded;

  // Case 3: already plain JSON
  return new Blob([text], { type: "application/json" });
}
```

This method always returns a `Blob` containing valid JSON for download.

---

## 3. UI integration – “Overall DQ report” button

File: `test-reactui/src/components/FilesSection.jsx`

### 3.1 Handler

```js
const [downloading, setDownloading] = useState(null);

const handleDownloadOverallReport = async () => {
  try {
    setDownloading("overall-dq-report");
    const blob = await apiService.downloadOverallDqReport();
    const filename = "overall_dq_results.json";
    downloadFile(blob, filename); // existing helper that creates a blob URL
    showNotification("Overall DQ report downloaded successfully!", "success");
  } catch (error) {
    showNotification(
      `Overall DQ report download failed: ${error.message}`,
      "error"
    );
  } finally {
    setDownloading(null);
  }
};
```

`downloadFile` is the existing helper used by other downloads:

```js
const downloadFile = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
```

### 3.2 Button in File Management header

Within the File Management header (next to **Refresh**):

```jsx
<div className="flex items-center gap-3">
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onRefresh}
    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600/20 to-green-600/20 hover:from-emerald-600/30 hover:to-green-600/30 text-emerald-100 rounded-xl font-semibold transition-all duration-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/20"
  >
    <RefreshCw className="w-4 h-4" />
    <span>Refresh</span>
  </motion.button>

  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={handleDownloadOverallReport}
    disabled={downloading === "overall-dq-report"}
    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 hover:from-blue-600/30 hover:to-cyan-600/30 text-blue-100 rounded-xl font-semibold transition-all duration-300 border border-blue-500/40 shadow-lg shadow-blue-500/20 disabled:opacity-50"
  >
    {downloading === "overall-dq-report" ? (
      <Loader2 className="w-4 h-4 animate-spin" />
    ) : (
      <FileJson className="w-4 h-4" />
    )}
    <span>Overall DQ report</span>
  </motion.button>
</div>
```

Clicking this button:

1. Calls `downloadOverallDqReport()` on the API service.
2. Normalizes the backend response to a JSON blob.
3. Saves the file as `overall_dq_results.json` on the user’s machine.

---

## 4. Using `overall_dq_results.json` in the frontend

Once downloaded, you can:

- Parse it in the browser (if instead of downloading you want to visualize it in a DQ Analytics view):

  ```js
  const text = await blob.text();
  const report = JSON.parse(text);
  const months = report.months || {};
  // Example: Object.entries(months).map(([month, stats]) => ...)
  ```

- Build charts / analytics:

  - Monthly files processed vs deleted.
  - Total and average processing time per month.
  - Total rows fixed vs quarantined per month.

If you later want a **DQ Analytics** page, the easiest path is:

- Use `downloadOverallDqReport` to get the JSON.
- Parse it instead of downloading.
- Render the monthly stats directly in React (cards, charts, tables).

---

## 5. Summary

- Backend keeps an aggregated, per‑user `overall_dq_results.json` in S3.
- `GET /files/overall/dq-report` exposes it via API Gateway.
- `apiService.downloadOverallDqReport()` retrieves and normalizes the response.
- `FilesSection`’s **Overall DQ report** button lets users download the JSON in one click.

This gives the frontend a single, consistent source of truth for monthly DQ health per user, while keeping aggregation logic entirely on the backend.

