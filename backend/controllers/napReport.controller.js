const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');

// In-memory store for parsed reports by month
const napReports = {};

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/nap-reports/';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'nap-report-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowed = /pdf/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF files are allowed'));
  }
});

exports.uploadPdf = upload.single('file');

// Parse PDF and extract nap report data
async function parseNapPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  const lines = data.text.split(/\r?\n/);
  const results = [];
  lines.forEach(line => {
    const match = line.match(/^(?<name>[A-Za-z ,.'-]+)\s+API[: ]?(?<api>\d+(?:\.\d+)?)\s+CC[: ]?(?<cc>\d+(?:\.\d+)?)\s+Credit[: ]?(?<credit>\d+(?:\.\d+)?)(\s+(?<lapsed>Lapsed))?/i);
    if (match && match.groups) {
      results.push({
        name: match.groups.name.trim(),
        api: parseFloat(match.groups.api),
        cc: parseFloat(match.groups.cc),
        credit: parseFloat(match.groups.credit),
        lapsed: !!match.groups.lapsed
      });
    }
  });
  return results;
}
exports.parseNapPdf = parseNapPdf;

exports.uploadNapReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const month = req.body.month || new Date().toISOString().slice(0, 7);
    const parsed = await parseNapPdf(req.file.path);
    napReports[month] = parsed;
    res.json({ month, data: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportNapReport = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !napReports[month]) {
      return res.status(404).json({ error: 'No data for specified month' });
    }
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NAP Report');

    worksheet.columns = [
      { header: 'Agent Name', key: 'name', width: 30 },
      { header: 'Month', key: 'month', width: 15 },
      { header: 'CC', key: 'cc', width: 10 },
      { header: 'SALE', key: 'credit', width: 10 },
      { header: 'LAPSED', key: 'lapsed', width: 10 },
    ];

    napReports[month].forEach(row => {
      worksheet.addRow({
        name: row.name,
        month,
        cc: row.cc,
        credit: row.credit,
        lapsed: row.lapsed ? 'YES' : 'NO'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Disposition', `attachment; filename=nap-report-${month}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
