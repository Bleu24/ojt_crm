const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { napReportUpload, uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/cloudinary');
const axios = require('axios');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory store for parsed reports by month
const napReports = {};

// Configure multer for PDF uploads using Cloudinary
exports.uploadPdf = [
  napReportUpload.single('pdfFile'),
  uploadToCloudinary('crm/nap-reports', 'raw')
];

/**
 * Send text to Gemini API for intelligent parsing of NAP reports
 * @param {string} text - Raw text extracted from PDF
 * @returns {Promise<Array>} - Parsed agent data
 */
async function sendTextToGeminiForParsing(text) {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in your .env file.');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
You are a data extraction specialist. Parse this NAP (New Business) insurance report and extract agent performance data.

CRITICAL PARSING RULES:
1. Look for agent sections starting with "AG: <code> - <name>" (e.g., "AG: 70032845 - JAMERLAN, MARY BABE CIRILOS")
2. For each agent, examine ALL their transaction rows in the table
3. IMPORTANT: Use ONLY the "Transaction Date" column to determine the month grouping
   - Transaction Date: "03 JUN 2025" → "JUN"
   - Transaction Date: "07 JUN 2025" → "JUN" 
   - Transaction Date: "16 JUN 2025" → "JUN"
   - DO NOT use "Temp Receipt Date" or any other date columns
4. Calculate for each agent per month based on Transaction Date:
   - cc: COUNT of rows where CCCredit = 1 (successful sales)
   - sale: SUM of API amounts where CCCredit = 1 (positive sales total)
   - lapsed: SUM of API amounts where CCCredit = -1 (negative sales/lapses as ABSOLUTE VALUE)

DATA EXTRACTION REQUIREMENTS:
- Group ALL transactions by the "Transaction Date" month ONLY
- Include ALL agents that appear in the report, even if they only have lapses
- Process ALL transaction rows for each agent
- For lapsed: if CCCredit = -1 and API = -33623.04, then lapsed = 33623.04 (absolute value)
- Include months only where the agent has actual transactions (cc > 0 OR lapsed > 0)

EXAMPLE FROM YOUR DATA:
Row with Transaction Date "03 JUN 2025", CCCredit = -1, API = -33623.04
→ This should be grouped under "JUN" month with lapsed = 33623.04

OUTPUT FORMAT: Return ONLY valid JSON:
[
  {
    "agentName": "JAMERLAN, MARY BABE CIRILOS",
    "monthly": {
      "JUN": { "cc": 2, "sale": 181200.00, "lapsed": 33623.04 }
    }
  }
]

VALIDATION CHECKLIST:
- Agent names in "LASTNAME, FIRSTNAME MIDDLENAME" format
- Month codes: JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC
- All monetary values rounded to 2 decimal places
- lapsed values are POSITIVE (absolute value of negative sales)
- Include ALL agents with any activity
- Group by Transaction Date month ONLY, ignore other date columns

TEXT TO PARSE:
${text}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    console.log('Gemini raw response:', generatedText);

    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in Gemini response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(parsedData)) {
      throw new Error('Gemini response is not a valid array');
    }

    // Validate the structure of each agent record
    const validatedData = parsedData.filter(agent => {
      // Check if agent has required fields
      if (!agent.agentName || !agent.monthly || typeof agent.monthly !== 'object') {
        console.warn(`Invalid agent structure: ${JSON.stringify(agent)}`);
        return false;
      }

      // Check if monthly data has valid months with proper structure
      const months = Object.keys(agent.monthly);
      const hasValidMonth = months.some(month => {
        const monthData = agent.monthly[month];
        const isValidStructure = monthData && 
               typeof monthData.cc === 'number' && 
               typeof monthData.sale === 'number' && 
               typeof monthData.lapsed === 'number';
        
        const hasActivity = monthData.cc > 0 || monthData.lapsed > 0 || monthData.sale > 0;
        
        if (isValidStructure && hasActivity) {
          console.log(`Valid month ${month} for ${agent.agentName}: cc=${monthData.cc}, sale=${monthData.sale}, lapsed=${monthData.lapsed}`);
        }
        
        return isValidStructure && hasActivity;
      });

      if (!hasValidMonth) {
        console.warn(`Agent ${agent.agentName} has no valid monthly data. Monthly structure:`, JSON.stringify(agent.monthly));
        return false;
      }

      return true;
    });

    console.log(`Gemini parsing successful: ${validatedData.length} agents processed`);
    console.log('Validated agents:', validatedData.map(a => a.agentName));
    return validatedData;

  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Gemini parsing failed: ${error.message}`);
  }
}

/**
 * Parse PDF and extract nap report data using Gemini AI
 * Now relies entirely on AI parsing for cleaner, more traceable results
 */
async function parseNapPdf(fileUrlOrPath) {
  try {
    let dataBuffer;
    
    // Check if it's a Cloudinary URL or local file path
    if (fileUrlOrPath.startsWith('http')) {
      // Download file from Cloudinary
      console.log('Downloading PDF from Cloudinary:', fileUrlOrPath);
      const response = await axios.get(fileUrlOrPath, { responseType: 'arraybuffer' });
      dataBuffer = Buffer.from(response.data);
    } else {
      // Read local file (fallback)
      dataBuffer = fs.readFileSync(fileUrlOrPath);
    }
    
    const data = await pdfParse(dataBuffer);
    const text = data.text;
    
    console.log('PDF text extracted, length:', text.length);
    console.log('PDF text sample:', text.substring(0, 500));

    // Primary parsing with Gemini AI - no fallback, AI shoulders all parsing
    const geminiResults = await sendTextToGeminiForParsing(text);
    
    if (!geminiResults || geminiResults.length === 0) {
      console.log('DEBUGGING - PDF text first 2000 chars:', text.substring(0, 2000));
      throw new Error('Unable to parse PDF content using Gemini AI. The document format may not be supported or the content is not recognizable as a NAP report.');
    }
    
    // Convert Gemini monthly format to flat format for backwards compatibility
    const convertedResults = [];
    
    geminiResults.forEach(agent => {
      if (agent.monthly) {
        // Process each month for this agent
        Object.keys(agent.monthly).forEach(month => {
          const monthData = agent.monthly[month];
          // Include if there's any activity: sales OR lapses OR both
          if (monthData.cc > 0 || monthData.lapsed > 0 || monthData.sale > 0) {
            console.log(`Processing ${agent.agentName} for ${month}: cc=${monthData.cc}, sale=${monthData.sale}, lapsed=${monthData.lapsed}`);
            convertedResults.push({
              name: agent.agentName,
              api: monthData.sale,
              cc: monthData.cc,
              credit: monthData.sale,
              lapsed: Math.abs(monthData.lapsed), // Ensure positive value for lapsed amount
              month: month,
              monthField: month,
              monthValue: monthData.sale
            });
          }
        });
      }
    });
    
    console.log('Gemini parsing successful:', convertedResults.length, 'agent-month records');
    return convertedResults;
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw error;
  }
}

exports.parseNapPdf = parseNapPdf;

exports.uploadNapReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('Uploaded file info:', {
      originalname: req.file.originalname,
      cloudinaryUrl: req.file.path,
      publicId: req.file.filename
    });
    
    // Parse the PDF using Gemini AI (now uses Cloudinary URL)
    const parsed = await parseNapPdf(req.file.path);
    
    if (!parsed || parsed.length === 0) {
      return res.status(400).json({ 
        error: 'No valid data could be extracted from the PDF. Please ensure this is a valid NAP report.' 
      });
    }
    
    // Group records by month for storage
    const recordsByMonth = {};
    console.log('Processing parsed records:', parsed.length);
    
    parsed.forEach((record, index) => {
      const month = record.month || record.monthField || new Date().toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      console.log(`Record ${index}: Agent=${record.name}, Month=${month}, CC=${record.cc}, Sale=${record.credit}, Lapsed=${record.lapsed}`);
      
      if (!recordsByMonth[month]) {
        recordsByMonth[month] = [];
      }
      recordsByMonth[month].push(record);
    });
    
    console.log('Records grouped by month:', Object.keys(recordsByMonth));
    
    // Store each month's data
    Object.keys(recordsByMonth).forEach(month => {
      napReports[month] = recordsByMonth[month];
      console.log(`Stored ${recordsByMonth[month].length} records for month ${month}`);
    });
    
    // Format response to match frontend expectations
    const allFormattedRecords = [];
    Object.keys(recordsByMonth).forEach(month => {
      recordsByMonth[month].forEach((report, index) => {
        allFormattedRecords.push({
          _id: `${month}-${index}`,
          agentName: report.name,
          month: month,
          cc: report.cc,
          sale: report.credit || report.api,
          lapsed: typeof report.lapsed === 'number' ? report.lapsed : 0, // Show monetary amount
          createdAt: new Date().toISOString()
        });
      });
    });
    
    const monthsList = Object.keys(recordsByMonth);
    res.json({ 
      message: `NAP report uploaded and parsed successfully. Found ${allFormattedRecords.length} records across ${monthsList.length} month(s): ${monthsList.join(', ')}.`,
      records: allFormattedRecords 
    });
    
  } catch (err) {
    console.error('Upload error:', err);
    
    // Provide specific error messages for different failure types
    if (err.message.includes('API key')) {
      return res.status(500).json({ 
        error: 'Configuration error: Gemini API key not properly configured.' 
      });
    }
    
    if (err.message.includes('not supported') || err.message.includes('not recognizable')) {
      return res.status(400).json({ 
        error: 'The uploaded file does not appear to be a valid NAP report or the format is not supported.' 
      });
    }
    
    res.status(500).json({ 
      error: `Failed to process NAP report: ${err.message}` 
    });
  }
};

exports.getNapReports = async (req, res) => {
  try {
    const { month, view } = req.query;
    
    if (month) {
      // Return reports for specific month
      const reports = napReports[month] || [];
      const formattedReports = reports.map((report, index) => ({
        _id: `${month}-${index}`,
        agentName: report.name,
        month: month,
        cc: report.cc,
        sale: report.credit,
        lapsed: typeof report.lapsed === 'number' ? report.lapsed : 0,
        createdAt: new Date().toISOString()
      }));
      return res.json(formattedReports);
    }
    
    if (view === 'total') {
      // Return aggregated totals across all months per agent
      const agentTotals = {};
      
      Object.keys(napReports).forEach(monthKey => {
        napReports[monthKey].forEach(report => {
          const agentName = report.name;
          if (!agentTotals[agentName]) {
            agentTotals[agentName] = {
              agentName: agentName,
              totalCC: 0,
              totalSale: 0,
              totalLapsed: 0,
              months: []
            };
          }
          
          agentTotals[agentName].totalCC += report.cc || 0;
          agentTotals[agentName].totalSale += report.credit || 0;
          agentTotals[agentName].totalLapsed += (typeof report.lapsed === 'number' ? report.lapsed : 0);
          agentTotals[agentName].months.push(monthKey);
        });
      });
      
      const totalReports = Object.values(agentTotals).map((agent, index) => ({
        _id: `total-${index}`,
        agentName: agent.agentName,
        month: 'TOTAL',
        cc: agent.totalCC,
        sale: Math.round(agent.totalSale * 100) / 100, // Round to 2 decimal places
        lapsed: Math.round(agent.totalLapsed * 100) / 100,
        monthsCovered: agent.months.join(', '),
        createdAt: new Date().toISOString()
      }));
      
      return res.json(totalReports);
    }
    
    // Return all reports by month (default)
    const allReports = [];
    Object.keys(napReports).forEach(monthKey => {
      napReports[monthKey].forEach((report, index) => {
        allReports.push({
          _id: `${monthKey}-${index}`,
          agentName: report.name,
          month: monthKey,
          cc: report.cc,
          sale: report.credit,
          lapsed: typeof report.lapsed === 'number' ? report.lapsed : 0,
          createdAt: new Date().toISOString()
        });
      });
    });
    
    res.json(allReports);
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.clearNapReports = async (req, res) => {
  try {
    // Clear all stored NAP reports from memory
    Object.keys(napReports).forEach(key => {
      delete napReports[key];
    });
    
    console.log('NAP reports table cleared by user');
    res.json({ 
      message: 'NAP reports table cleared successfully. You can now upload a new report.' 
    });
  } catch (err) {
    console.error('Clear reports error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.exportNapReport = async (req, res) => {
  try {
    const { month, view } = req.query;
    
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NAP Report');

    if (view === 'total') {
      // Export aggregated totals across all months
      const agentTotals = {};
      
      Object.keys(napReports).forEach(monthKey => {
        napReports[monthKey].forEach(report => {
          const agentName = report.name;
          if (!agentTotals[agentName]) {
            agentTotals[agentName] = {
              agentName: agentName,
              totalCC: 0,
              totalSale: 0,
              totalLapsed: 0,
              months: []
            };
          }
          
          agentTotals[agentName].totalCC += report.cc || 0;
          agentTotals[agentName].totalSale += report.credit || 0;
          agentTotals[agentName].totalLapsed += (typeof report.lapsed === 'number' ? report.lapsed : 0);
          agentTotals[agentName].months.push(monthKey);
        });
      });

      // Setup columns for all months export
      worksheet.columns = [
        { header: 'Agent Name', key: 'name', width: 30 },
        { header: 'Total CC', key: 'totalCC', width: 15 },
        { header: 'Total SALE', key: 'totalSale', width: 15 },
        { header: 'Total LAPSED', key: 'totalLapsed', width: 15 },
        { header: 'Months Covered', key: 'monthsCovered', width: 20 },
      ];

      // Add rows for all agents
      Object.values(agentTotals).forEach(agent => {
        worksheet.addRow({
          name: agent.agentName,
          totalCC: agent.totalCC,
          totalSale: Math.round(agent.totalSale * 100) / 100,
          totalLapsed: Math.round(agent.totalLapsed * 100) / 100,
          monthsCovered: [...new Set(agent.months)].join(', ')
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Disposition', 'attachment; filename=nap-report-all-months.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
      
    } else if (month) {
      // Export specific month
      if (!napReports[month]) {
        return res.status(404).json({ error: 'No data for specified month' });
      }

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
          lapsed: row.lapsed
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Disposition', `attachment; filename=nap-report-${month}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
      
    } else {
      return res.status(400).json({ error: 'Please specify either a month or view=total parameter' });
    }
    
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
};
