# OJT CRM

## NAP Report API

### Upload PDF

`POST /api/nap-report/upload`

Headers: `Authorization: Bearer <token>`

Body form-data: `file` (PDF)

Returns parsed data grouped by month.

### Export Excel

`GET /api/nap-report/export?month=<month>`

Headers: `Authorization: Bearer <token>`

Responds with an Excel file summarizing the parsed report.
