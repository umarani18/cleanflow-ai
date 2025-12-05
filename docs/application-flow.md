# CleanFlowAI - Application Flow & Feature Guide

> **Purpose**: This document provides comprehensive documentation of all features, pages, dialogs, and user flows in the CleanFlowAI ERP Transform application. It is designed to be used as a knowledge base for RAG-based chatbot assistance.

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Authentication](#2-authentication)
3. [Navigation & Layout](#3-navigation--layout)
4. [Dashboard](#4-dashboard)
5. [File Manager](#5-file-manager)
6. [Dialogs & Modals](#6-dialogs--modals)
7. [Admin Settings](#7-admin-settings)
8. [QuickBooks Integration](#8-quickbooks-integration)
9. [Data Quality Processing](#9-data-quality-processing)
10. [API Reference](#10-api-reference)
11. [Status Codes & Badges](#11-status-codes--badges)
12. [Supported Formats](#12-supported-formats)
13. [FAQ & Common Tasks](#13-faq--common-tasks)

---

## 1. Application Overview

**CleanFlowAI** is a data transformation and quality management platform designed for processing, cleaning, validating, and transforming ERP data files. The application helps users:

- Upload data files (CSV, Excel) from local storage or ERP systems
- Automatically detect and fix data quality issues
- Transform data between different ERP formats
- Export cleaned data to target ERP systems
- Monitor data quality metrics and processing status

### Technology Stack
- **Frontend**: Next.js with TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **Authentication**: AWS Cognito
- **Storage**: AWS S3
- **Charts**: Recharts

### Application URL Structure
| Route | Page |
|-------|------|
| `/` | Landing/Redirect |
| `/login` | User Login |
| `/signup` | User Registration |
| `/dashboard` | Main Dashboard |
| `/files` | File Manager |
| `/admin` | Organization Settings |
| `/quickbooks/callback` | OAuth Callback |

---

## 2. Authentication

### 2.1 Login Page (`/login`)

**How to access**: Navigate to `/login` or get automatically redirected when not authenticated.

**Form Fields**:
- **Email**: Required email input field
- **Password**: Required password input with show/hide toggle button
- **Remember me**: Optional checkbox to persist session
- **Forgot password?**: Link to password recovery (if available)

**Actions**:
- Click "Login" button to submit credentials
- On success: Redirects to `/dashboard`
- On failure: Displays error message

**Error Messages**:
- "Invalid email or password" - Incorrect credentials
- "Please verify your email" - Account not verified
- "Account locked" - Too many failed attempts

---

### 2.2 Signup Page (`/signup`)

**How to access**: Navigate to `/signup` or click "Sign up" link on login page.

**Form Fields**:
- **Email**: Required, must be valid email format
- **Password**: Required, with show/hide toggle
- **Confirm Password**: Required, must match password

**Password Strength Indicator**:
The password field shows a strength meter with levels:
- Very Weak (red)
- Weak (orange)
- Fair (yellow)
- Good (light green)
- Strong (green)

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (recommended)

**Actions**:
- Click "Create Account" to register
- On success: Triggers email verification flow
- On failure: Shows validation errors

---

### 2.3 Email Verification

**When triggered**: Automatically after signup when email confirmation is required.

**Form Fields**:
- **Verification Code**: 6-digit code input sent to registered email

**Features**:
- Countdown timer (5 minutes) showing code expiration
- "Resend Code" button (enabled after timer expires)
- "Back to Signup" button to start over

**Actions**:
- Enter 6-digit code and submit
- On success: Redirects to login page
- On failure: Shows "Invalid code" error

---

### 2.4 Logout

**How to logout**:
1. Click user avatar/email in sidebar
2. Click "Logout" button
3. Or click "Logout" in dashboard header

**Behavior**:
- Clears authentication tokens
- Redirects to `/login`
- Clears session storage

---

## 3. Navigation & Layout

### 3.1 Sidebar Navigation

The sidebar appears on the left side of all authenticated pages.

**Main Navigation Items**:
| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| LayoutDashboard | Dashboard | `/dashboard` | Overview and metrics |
| FileText | File Manager | `/files` | Upload and manage files |
| Settings | Admin | `/admin` | Organization settings |

**Sidebar Features**:
- **Collapsible**: Click hamburger icon to collapse/expand
- **Mobile Responsive**: Becomes a slide-out drawer on mobile
- **User Info**: Shows current user's email at bottom
- **Help & Support**: Link to support resources
- **Logout Button**: Quick logout access

---

### 3.2 Theme Toggle

**Location**: Bottom-right corner of all pages (floating button)

**Options**:
- **Light Mode**: White background, dark text
- **Dark Mode**: Dark background, light text
- **System**: Follows OS/browser preference

**How to toggle**: Click the sun/moon icon button

---

## 4. Dashboard

**Route**: `/dashboard`

The dashboard provides an overview of data quality metrics, processing statistics, and recent activity.

### 4.1 Dashboard Header

**Elements**:
- **Page Title**: "Dashboard"
- **Live Data Badge**: Indicates real-time data status
- **Refresh Button**: Manually reload all dashboard data
- **Export Button**: Download overall DQ report as JSON file
- **Logout Button**: Quick logout

**How to refresh data**: Click the refresh icon button in the header

**How to export report**: Click "Export" button → Downloads `overall-dq-report.json`

---

### 4.2 Metrics Cards

Four metric cards displayed in a row:

#### Total Files Card
- **Metric**: Total number of uploaded files
- **Subtitle**: "X processed" showing completed files count
- **Icon**: FileText

#### Average DQ Score Card
- **Metric**: Average data quality score as percentage
- **Status Badge**: 
  - "Excellent" (green) if ≥ 90%
  - "Good" (yellow) if ≥ 70%
  - "Needs Attention" (red) if < 70%
- **Icon**: BarChart

#### Rows Processed Card
- **Metric**: Total input rows across all files
- **Subtitle**: "X clean output" showing rows after processing
- **Icon**: Database

#### Issues Fixed Card
- **Metric**: Total rows that were fixed
- **Subtitle**: "X quarantined" showing unfixable rows
- **Icon**: CheckCircle

---

### 4.3 Charts Section

#### Data Quality Distribution (Pie Chart)
Shows distribution of row outcomes:
- **Clean Rows** (Green): Rows with no issues
- **Fixed Rows** (Yellow): Rows with issues that were corrected
- **Quarantined Rows** (Red): Rows that couldn't be fixed

**Interaction**: Hover over segments to see exact counts

#### DQ Score Distribution (Bar Chart)
Groups files by their data quality scores:
- **Excellent (90%+)**: Green bars
- **Good (70-90%)**: Yellow bars
- **Needs Attention (<70%)**: Red bars

**Purpose**: Quickly see how many files fall into each quality tier

---

### 4.4 Processing Summary

Displays monthly processing statistics from the overall DQ report:
- Processing trends over time
- File counts by month
- Score averages

---

### 4.5 Activity Feed

**Location**: Right sidebar section

Shows recent activity across the application:

**Activity Types**:
- **Transform**: File transformation completed
- **Upload**: New file uploaded
- **Download**: File downloaded
- **Error**: Processing error occurred

**Information Shown**:
- Activity type icon
- Description (e.g., "Transformed invoice_data.csv")
- Status indicator (success/error/pending)
- Timestamp in IST timezone

---

## 5. File Manager

**Route**: `/files`

The File Manager handles all file operations including upload, processing, and export.

### 5.1 Section Toggle

Two main tabs at the top:

| Tab | Description |
|-----|-------------|
| **File Upload** | Upload new files from various sources |
| **File Explorer** | View and manage existing files |

**File count badge**: Shows total number of files next to File Explorer tab

---

### 5.2 File Upload Section

#### Source Selection

**Dropdown Options**:
| Source | Status | Description |
|--------|--------|-------------|
| Local File | Available | Upload from computer |
| QuickBooks Online | Available | Import from QuickBooks |
| Oracle Fusion | Coming Soon | Oracle ERP integration |
| SAP ERP | Coming Soon | SAP integration |
| Microsoft Dynamics | Coming Soon | Dynamics 365 integration |
| NetSuite | Coming Soon | NetSuite integration |
| Workday | Coming Soon | Workday integration |
| Infor M3 | Coming Soon | Infor M3 integration |
| Infor LN | Coming Soon | Infor LN integration |
| Epicor Kinetic | Coming Soon | Epicor integration |
| QAD ERP | Coming Soon | QAD integration |
| IFS Cloud | Coming Soon | IFS integration |
| Sage Intacct | Coming Soon | Sage integration |

---

#### Local File Upload

**How to upload a file**:

**Method 1 - Drag & Drop**:
1. Select "Local File" from source dropdown
2. Drag file from your computer
3. Drop into the upload zone
4. Wait for upload and processing to complete

**Method 2 - Click to Browse**:
1. Select "Local File" from source dropdown
2. Click anywhere in the upload zone
3. Select file from file browser dialog
4. Click "Open" to start upload

**Supported File Types**:
- CSV (.csv)
- Excel (.xlsx, .xls)

**File Size Limit**: Files should be reasonably sized for web upload

**AI Processing Toggle**:
- **On** (default): Automatically process file with AI after upload
- **Off**: Upload only, manual processing required

**How to toggle AI Processing**:
1. Find "AI Processing:" label above upload zone
2. Click "On" or "Off" button

**Upload Progress**:
- Shows percentage complete (0-100%)
- Spinning loader animation
- Progress bar visualization

---

#### QuickBooks Import

**Prerequisites**: QuickBooks account must be connected first

**If Not Connected**:
1. Select "QuickBooks Online" from source dropdown
2. Click "Connect QuickBooks" button
3. OAuth popup opens to QuickBooks login
4. Authorize the application
5. Popup closes and connection status updates

**If Connected** (shows green "Connected" banner):

**Import Form Fields**:

| Field | Description | Default |
|-------|-------------|---------|
| Entity | Type of data to import | Invoices |
| Max Records | Maximum records to fetch | 1000 |
| From Date | Start date filter | None |
| To Date | End date filter | None |

**Entity Options**:
- Customers
- Invoices
- Vendors
- Items

**How to import from QuickBooks**:
1. Select entity type from dropdown
2. (Optional) Set max records limit
3. (Optional) Set date range filters
4. Click "Import from QuickBooks" button
5. Wait for import to complete
6. Processing starts automatically

**Disconnect QuickBooks**:
1. Click "Disconnect" button in connection banner
2. Confirm disconnection in dialog
3. Connection removed

---

### 5.3 File Explorer Section

#### Search & Filter

**Search Bar**:
- Type filename to search
- Searches across all file names
- Real-time filtering as you type

**Status Filter Dropdown**:
| Option | Filters To |
|--------|------------|
| All | All files |
| Uploaded | UPLOADED status |
| Processed | DQ_FIXED status |
| Processing | DQ_RUNNING status |
| Queued | QUEUED status |
| Failed | FAILED status |

**Clear Filters**: Click filter icon button when filters are active

---

#### File Table

**Columns**:
| Column | Description | Visibility |
|--------|-------------|------------|
| File | Filename and size | Always |
| Score | DQ score percentage | Desktop only |
| Rows | Clean/total row count | Tablet+ |
| Status | Processing status badge | Always |
| Uploaded | Upload timestamp (IST) | Desktop only |
| Updated | Last update time (IST) | Desktop only |
| Actions | Action buttons | Always |

---

#### File Actions

**Action Buttons** (shown as icons in Actions column):

| Icon | Action | When Available |
|------|--------|----------------|
| ▶️ Play | Start Processing | UPLOADED, DQ_FAILED, FAILED |
| 👁️ Eye | View Details | Always |
| ⬇️ Download | Download File | Always |
| ☁️ Cloud | Push to ERP | DQ_FIXED, COMPLETED only |
| 🗑️ Trash | Delete File | Always |

**How to start processing**:
1. Find file with UPLOADED status
2. Click Play (▶️) button
3. Status changes to DQ_RUNNING
4. Wait for processing to complete

**How to view file details**:
1. Click Eye (👁️) button on any file
2. File Details dialog opens
3. Browse tabs: Details, Preview, DQ Report

**How to download a file**:
1. Click Download (⬇️) button
2. Select data type: Cleaned or Original
3. Select format: CSV, Excel, or JSON
4. Click Download button
5. If Cleaned selected, optionally choose ERP transformation

**How to push to ERP**:
1. Find processed file (DQ_FIXED status)
2. Click Cloud (☁️) button
3. Select target ERP from list
4. Click "Push to [ERP]" button

**How to delete a file**:
1. Click Trash (🗑️) button
2. Confirm deletion in dialog
3. File is permanently removed

---

## 6. Dialogs & Modals

### 6.1 File Details Dialog

**How to open**: Click Eye icon on any file in File Explorer

**Tabs Available**:

#### Details Tab
Shows file metadata and processing statistics:

**Stats Grid**:
- **Rows In**: Total input rows
- **Clean**: Rows without issues
- **Fixed**: Rows with corrected issues
- **Quarantined**: Unfixable rows

**DQ Score Card**: Large percentage display with visual indicator

**File Information**:
- Original filename
- File size (formatted)
- Upload timestamp
- Last updated timestamp

#### Preview Tab
Shows tabular preview of file data:
- First 20 rows displayed
- All columns shown
- Horizontal scroll for wide files

#### DQ Report Tab (Processed Files Only)
Shows detailed data quality report:
- Issue categories
- Column-level statistics
- Quality metrics

**Download DQ Report**:
1. Go to DQ Report tab
2. Click "Download Report" button
3. JSON file downloads

---

### 6.2 Download Format Modal

**How to open**: Click Download button on any file

**Step 1 - Select Data Type**:
| Option | Description |
|--------|-------------|
| Cleaned Data | Processed, quality-checked data |
| Original Data | Raw uploaded data, unmodified |

**Step 2 - Select Format**:
| Format | Extension | Use Case |
|--------|-----------|----------|
| CSV | .csv | Spreadsheets, most compatible |
| Excel | .xlsx | Microsoft Excel |
| JSON | .json | APIs, programming |

**Actions**:
- **Cancel**: Close without downloading
- **Download**: Start download with selected options

---

### 6.3 ERP Transformation Modal

**When shown**: After selecting "Cleaned Data" in Download Format Modal

**Options**:

**Option 1 - Original Format**:
- Downloads cleaned data without transformation
- Maintains source data structure

**Option 2 - Transform for ERP**:
Select target ERP system:
- Oracle Fusion
- SAP ERP
- Microsoft Dynamics
- NetSuite
- Workday
- Infor M3
- Infor LN
- Epicor Kinetic
- QAD ERP
- IFS Cloud
- Sage Intacct

**Actions**:
- **Cancel**: Go back to format selection
- **Download**: Transform and download

---

### 6.4 Push to ERP Modal

**How to open**: Click Cloud icon on processed file (DQ_FIXED status)

**Shows**:
- File name being pushed
- Row count ready to export
- List of available ERP systems

**ERP Status Indicators**:
- ✅ **Connected**: Can push data
- ⚪ **Not Connected**: Need to connect first

**Currently Supported**:
- QuickBooks Online (if connected)

**Actions**:
- **Cancel**: Close modal
- **Push to [ERP]**: Send data to selected ERP

---

### 6.5 Delete Confirmation Dialog

**How to open**: Click Trash icon on any file

**Shows**:
- Warning icon
- "Delete file?" title
- Filename being deleted
- Warning that action cannot be undone

**Actions**:
- **Cancel**: Keep file, close dialog
- **Delete**: Permanently remove file

---

## 7. Admin Settings

**Route**: `/admin`

Organization configuration and team management.

### 7.1 Organization Tab

**How to access**: Go to Admin → Organization tab (default)

**Sections**:

#### Logo Section
- Current logo display (or placeholder)
- "Upload Logo" button to change logo

**How to upload logo**:
1. Click "Upload Logo" button
2. Select image file
3. Logo updates

#### Organization Information Form

| Field | Description |
|-------|-------------|
| Organization Name | Company/team name |
| Email | Primary contact email |
| Contact Number | Phone number |
| Address | Business address |

#### Subscription & Preferences

**Subscription Plan** dropdown:
- Free
- Pro
- Enterprise

**Preferred Data Format** dropdown:
- CSV
- JSON
- XLSX
- SQL
- Parquet

**Save Changes**: Click "Save Changes" button to persist settings

---

### 7.2 Members Tab

**How to access**: Go to Admin → Members tab

**Features**:
- View all team members
- Invite new members
- Manage roles
- Remove members

#### Members Table

| Column | Description |
|--------|-------------|
| Member | Avatar, name, email, owner badge |
| Role | Owner, Admin, Editor, Viewer |
| Status | Active, Pending, Inactive |
| Joined | Join date |
| Actions | Dropdown menu |

#### Invite New Member

**How to invite**:
1. Click "Invite Member" button
2. Enter email address
3. Select role
4. Click "Send Invite"

#### Member Actions (for non-owners)

**How to change role**:
1. Click three-dot menu on member row
2. Select new role:
   - Make Admin
   - Make Editor
   - Make Viewer

**How to remove member**:
1. Click three-dot menu
2. Select "Remove Member"
3. Confirm removal

---

### 7.3 Permissions Tab

**How to access**: Go to Admin → Permissions tab

**Permissions Matrix**:

| Permission | Owner | Admin | Editor | Viewer |
|------------|:-----:|:-----:|:------:|:------:|
| File Management | ✅ | ✅ | ✅ | ❌ |
| Data Transformation | ✅ | ✅ | ✅ | ❌ |
| Export Data | ✅ | ✅ | ✅ | ✅ |
| Manage Members | ✅ | ✅ | ❌ | ❌ |
| Billing & Subscription | ✅ | ❌ | ❌ | ❌ |
| Organization Settings | ✅ | ✅ | ❌ | ❌ |
| API Access | ✅ | ✅ | ❌ | ❌ |
| Audit Logs | ✅ | ✅ | ❌ | ❌ |

**Notes**:
- Owner permissions are locked and cannot be changed
- Toggle switches to enable/disable permissions for each role
- Click "Save Permissions" to apply changes

---

### 7.4 Services Tab

**How to access**: Go to Admin → Services tab

#### ERP Configuration

**Default Input ERP**:
Select the ERP system your data typically comes from:
- QuickBooks Online
- Oracle Fusion
- SAP ERP
- Microsoft Dynamics
- NetSuite
- Workday
- Infor M3/LN
- Epicor Kinetic
- QAD ERP
- IFS Cloud
- Sage Intacct
- Custom ERP (enter name)

**Default Export ERP**:
Select the target ERP for transformed data (same options as above)

#### Service Toggles

| Service | Description | Status |
|---------|-------------|--------|
| Data Transform | Transform between ERP formats | Toggle On/Off |
| Data Quality | Validate and fix data issues | Toggle On/Off |
| CleanDataShield™ | Privacy protection layer | Premium |

**How to enable/disable services**:
1. Click toggle switch for service
2. Toggle turns blue when enabled
3. Click "Save Services" to apply

---

## 8. QuickBooks Integration

### 8.1 Connecting to QuickBooks

**Where**: File Manager → File Upload → QuickBooks Online source

**Steps**:
1. Select "QuickBooks Online" from source dropdown
2. Click "Connect QuickBooks" button
3. Login popup opens
4. Enter QuickBooks credentials
5. Click "Authorize" to grant access
6. Popup closes automatically
7. Status shows "Connected" with realm ID

### 8.2 OAuth Callback Flow

**URL**: `/quickbooks/callback`

**States**:
1. **Processing**: Spinner shown, "Connecting to QuickBooks..."
2. **Success**: Green checkmark, auto-closes popup
3. **Error**: Red alert, shows error message

### 8.3 Importing from QuickBooks

**Prerequisites**: QuickBooks must be connected

**Steps**:
1. Select entity type (Customers/Invoices/Vendors/Items)
2. Set max records (default 1000)
3. Optionally set date range
4. Click "Import from QuickBooks"
5. Wait for import to complete
6. Data quality processing starts automatically
7. File appears in File Explorer

### 8.4 Exporting to QuickBooks

**Prerequisites**: 
- QuickBooks connected
- File must be processed (DQ_FIXED status)

**Steps**:
1. Find processed file in File Explorer
2. Click Cloud icon (Push to ERP)
3. Select QuickBooks Online
4. Click "Push to QuickBooks"
5. Wait for export confirmation

### 8.5 Disconnecting QuickBooks

**Steps**:
1. Go to File Upload section
2. Select QuickBooks Online source
3. Click "Disconnect" button
4. Confirm in dialog
5. Connection removed

---

## 9. Data Quality Processing

### 9.1 Processing Flow

1. **Upload**: File uploaded to storage
2. **Queued**: Added to processing queue
3. **DQ Running**: AI analyzing data quality
4. **Normalizing**: Standardizing data formats
5. **DQ Fixed**: Processing complete, issues resolved
6. **Completed**: Ready for download/export

### 9.2 Data Quality Score

**Score Ranges**:
| Range | Rating | Color |
|-------|--------|-------|
| 90-100% | Excellent | Green |
| 70-89% | Good | Yellow |
| 0-69% | Needs Attention | Red |

### 9.3 Row Categories

| Category | Description |
|----------|-------------|
| **Clean** | Rows with no issues detected |
| **Fixed** | Rows with issues that were automatically corrected |
| **Quarantined** | Rows with unfixable issues, excluded from clean output |

### 9.4 Manual Processing

**When needed**:
- AI Processing was disabled during upload
- File failed processing and needs retry
- Reprocessing after manual edits

**How to manually start processing**:
1. Find file with UPLOADED or FAILED status
2. Click Play (▶️) button
3. Wait for processing to complete

---

## 10. API Reference

### 10.1 File Management API

**Base URL**: AWS API Gateway endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/uploads` | Initialize file upload |
| GET | `/uploads` | List all user files |
| POST | `/files/{id}/process` | Start DQ processing |
| GET | `/files/{id}/status` | Check file status |
| GET | `/files/{id}/export` | Download file |
| DELETE | `/files/{id}` | Delete file |
| GET | `/files/{id}/dq-report` | Get DQ report |
| GET | `/files/overall/dq-report` | Get overall summary |

### 10.2 Export Parameters

**Query Parameters for `/files/{id}/export`**:

| Parameter | Values | Description |
|-----------|--------|-------------|
| type | csv, excel, json | Output format |
| data | original, clean, all | Data selection |
| erp | (erp name) | Target ERP transformation |

### 10.3 QuickBooks API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/quickbooks/connect` | Get OAuth URL |
| GET | `/quickbooks/callback` | Handle OAuth callback |
| GET | `/quickbooks/connections` | Check connection status |
| DELETE | `/quickbooks/disconnect` | Remove connection |
| POST | `/quickbooks/import` | Import data |
| POST | `/quickbooks/export` | Export data |

---

## 11. Status Codes & Badges

### 11.1 File Status Codes

| Status | Description | Color | Actions Available |
|--------|-------------|-------|-------------------|
| UPLOADING | File being uploaded | Gray | Wait |
| UPLOADED | Upload complete | Yellow | Start Processing |
| VALIDATED | File validated | Blue | Wait |
| QUEUED | In processing queue | Yellow | Wait |
| DQ_DISPATCHED | Sent to DQ engine | Yellow | Wait |
| DQ_RUNNING | Processing in progress | Blue | Wait |
| NORMALIZING | Standardizing data | Blue | Wait |
| DQ_FIXED | Processing complete | Green | Download, Push to ERP |
| COMPLETED | All done | Green | Download, Push to ERP |
| FAILED | Processing failed | Red | Retry Processing |
| DQ_FAILED | DQ processing failed | Red | Retry Processing |
| UPLOAD_FAILED | Upload failed | Red | Re-upload |
| REJECTED | File rejected | Red | Check requirements |

### 11.2 Member Roles

| Role | Badge Color | Capabilities |
|------|-------------|--------------|
| Owner | Default | Full access, cannot be changed |
| Admin | Secondary | Most access except billing |
| Editor | Outline | File operations only |
| Viewer | Outline | Read-only access |

### 11.3 Member Status

| Status | Color | Meaning |
|--------|-------|---------|
| Active | Green | Full access |
| Pending | Yellow | Invite sent, not accepted |
| Inactive | Gray | Account disabled |

---

## 12. Supported Formats

### 12.1 Input Formats

| Format | Extensions | Description |
|--------|------------|-------------|
| CSV | .csv | Comma-separated values |
| Excel | .xlsx, .xls | Microsoft Excel |

### 12.2 Output Formats

| Format | Extension | Best For |
|--------|-----------|----------|
| CSV | .csv | Universal compatibility |
| Excel | .xlsx | Spreadsheet applications |
| JSON | .json | APIs, data processing |

### 12.3 Supported ERP Systems

| ERP System | Import | Export | Status |
|------------|:------:|:------:|--------|
| QuickBooks Online | ✅ | ✅ | Available |
| Oracle Fusion | ❌ | ✅ | Transform only |
| SAP ERP | ❌ | ✅ | Transform only |
| Microsoft Dynamics | ❌ | ✅ | Transform only |
| NetSuite | ❌ | ✅ | Transform only |
| Workday | ❌ | ✅ | Transform only |
| Infor M3 | ❌ | ✅ | Transform only |
| Infor LN | ❌ | ✅ | Transform only |
| Epicor Kinetic | ❌ | ✅ | Transform only |
| QAD ERP | ❌ | ✅ | Transform only |
| IFS Cloud | ❌ | ✅ | Transform only |
| Sage Intacct | ❌ | ✅ | Transform only |

---

## 13. FAQ & Common Tasks

### Q: How do I upload a file?
1. Go to File Manager (`/files`)
2. Select "File Upload" tab
3. Choose "Local File" from source dropdown
4. Drag & drop file or click to browse
5. Wait for upload and processing

### Q: How do I check if my file is processed?
1. Go to File Manager → File Explorer tab
2. Look at the Status column
3. "DQ_FIXED" or "COMPLETED" means done
4. "DQ_RUNNING" means still processing

### Q: How do I download cleaned data?
1. Find your processed file in File Explorer
2. Click Download (⬇️) button
3. Select "Cleaned Data"
4. Choose format (CSV/Excel/JSON)
5. Optionally select ERP transformation
6. Click Download

### Q: Why is my file stuck in UPLOADED status?
- AI Processing may have been turned off
- Solution: Click the Play button to start processing manually

### Q: How do I connect QuickBooks?
1. Go to File Manager → File Upload
2. Select "QuickBooks Online" from source
3. Click "Connect QuickBooks"
4. Login and authorize in popup

### Q: How do I import from QuickBooks?
1. Connect QuickBooks first (see above)
2. Select entity type (Invoices, Customers, etc.)
3. Set filters if needed
4. Click "Import from QuickBooks"

### Q: How do I push data to an ERP?
1. File must be processed (DQ_FIXED status)
2. Click Cloud icon on the file
3. Select connected ERP
4. Click "Push to [ERP]"

### Q: What does the DQ Score mean?
- **90-100%**: Excellent quality, minimal issues
- **70-89%**: Good quality, some issues fixed
- **Below 70%**: Needs attention, significant issues

### Q: How do I retry a failed file?
1. Find file with FAILED status
2. Click Play (▶️) button
3. Processing restarts

### Q: How do I invite team members?
1. Go to Admin → Members tab
2. Click "Invite Member"
3. Enter email and select role
4. Send invite

### Q: How do I change a member's role?
1. Go to Admin → Members tab
2. Click three-dot menu on member
3. Select new role

### Q: How do I view the DQ report for a file?
1. Click Eye icon on file
2. Go to "DQ Report" tab
3. Click "Download Report" for full JSON

### Q: How do I export the overall DQ report?
1. Go to Dashboard
2. Click "Export" button in header
3. JSON file downloads with all metrics

### Q: What's the difference between Clean, Fixed, and Quarantined rows?
- **Clean**: No issues found
- **Fixed**: Had issues that were automatically corrected
- **Quarantined**: Had issues that couldn't be fixed (excluded from output)

### Q: How do I filter files by status?
1. Go to File Explorer
2. Click Status dropdown
3. Select desired status
4. Table filters automatically

### Q: How do I search for a specific file?
1. Go to File Explorer
2. Type filename in search box
3. Results filter as you type

### Q: How do I change the theme?
1. Click sun/moon icon (bottom-right corner)
2. Theme toggles between light and dark

---

## Document Version

**Last Updated**: December 2024
**Application Version**: 1.0.0
**Document Purpose**: RAG Chatbot Knowledge Base
