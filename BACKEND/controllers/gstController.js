import * as gstService from '../services/gstService.js';
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import mongoose from 'mongoose';

const Bill = mongoose.model('Bill');
const Purchase = mongoose.model('Purchase');

const getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        message: 'year and month query parameters are required',
      });
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        message: 'Invalid year or month. month must be 1-12',
      });
    }

    const summary = await gstService.getMonthlySummary(yearNum, monthNum, req.organizationId);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error in getMonthlySummary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly GST summary',
      error: error.message,
    });
  }
};

const getFYSummary = async (req, res) => {
  try {
    const { financialYear } = req.query;

    if (!financialYear) {
      return res.status(400).json({
        message: 'financialYear query parameter is required (format: YYYY-YY)',
      });
    }

    const fyRegex = /^\d{4}-\d{2}$/;
    if (!fyRegex.test(financialYear)) {
      return res.status(400).json({
        message: 'Invalid financial year format. Use YYYY-YY (e.g., 2025-26)',
      });
    }

    const summary = await gstService.getFYSummary(financialYear, req.organizationId);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error in getFYSummary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FY GST summary',
      error: error.message,
    });
  }
};

const getCurrentMonthSummary = async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const summary = await gstService.getMonthlySummary(year, month, req.organizationId);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error in getCurrentMonthSummary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current month GST summary',
      error: error.message,
    });
  }
};

const getCurrentFYSummary = async (req, res) => {
  try {
    const now = new Date();
    const fy = gstService.getFinancialYear(now);
    const summary = await gstService.getFYSummary(fy, req.organizationId);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error in getCurrentFYSummary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current FY GST summary',
      error: error.message,
    });
  }
};

const getAvailableFYs = async (req, res) => {
  try {
    const [billFYs, purchaseFYs] = await Promise.all([
      Bill.distinct('financialYear', { organizationId: req.organizationId }),
      Purchase.distinct('financialYear', { organizationId: req.organizationId }),
    ]);

    const allFYs = [...new Set([...billFYs, ...purchaseFYs])].sort().reverse();
    res.json({ success: true, data: allFYs });
  } catch (error) {
    console.error('Error in getAvailableFYs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available financial years',
      error: error.message,
    });
  }
};

const exportMonthlyExcel = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        message: 'year and month query parameters are required',
      });
    }

    const summary = await gstService.getMonthlySummary(
      parseInt(year, 10),
      parseInt(month, 10),
      req.organizationId
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Billing System GST Module';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('GST Summary', {
      properties: { tabColor: { argb: 'FF1976D2' } },
    });

    ws.columns = [
      { key: 'description', width: 45 },
      { key: 'taxableValue', width: 18 },
      { key: 'cgst', width: 15 },
      { key: 'sgst', width: 15 },
      { key: 'igst', width: 15 },
      { key: 'totalTax', width: 18 },
    ];

    ws.mergeCells('A1:F1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `GST Summary - ${summary.period} (FY ${summary.financialYear})`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1976D2' },
    };
    titleCell.alignment = { horizontal: 'center' };

    ws.addRow([]);

    const sectionHeaders = [
      { label: 'OUTPUT TAX (Sales)', data: summary.sales, color: 'FFE3F2FD' },
      { label: 'INPUT TAX (Purchases / ITC)', data: summary.purchases, color: 'FFE8F5E9' },
      { label: 'CREDIT NOTE ADJUSTMENTS', data: summary.creditNotes, color: 'FFFFF3E0' },
      { label: 'DEBIT NOTE ADJUSTMENTS', data: summary.debitNotes, color: 'FFFCE4EC' },
      { label: 'INTEREST NOTE LIABILITY', data: summary.interestNotes, color: 'FFF3E5F5' },
    ];

    for (const section of sectionHeaders) {
      ws.addRow([]);
      const headerRow = ws.addRow({
        description: section.label,
        taxableValue: '',
        cgst: '',
        sgst: '',
        igst: '',
        totalTax: '',
      });
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: section.color },
        };
      });

      const breakdownRows = [
        { description: '  Intra-State (CGST + SGST)', taxableValue: section.data.intraState?.taxableValue || 0, cgst: section.data.intraState?.cgst || 0, sgst: section.data.intraState?.sgst || 0, igst: 0, totalTax: (section.data.intraState?.cgst || 0) + (section.data.intraState?.sgst || 0) },
        { description: '  Inter-State (IGST)', taxableValue: section.data.interState?.taxableValue || 0, cgst: 0, sgst: 0, igst: section.data.interState?.igst || 0, totalTax: section.data.interState?.igst || 0 },
        { description: '  TOTAL', taxableValue: section.data.taxableValue, cgst: section.data.cgst || 0, sgst: section.data.sgst || 0, igst: section.data.igst || 0, totalTax: section.data.totalTax },
      ];

      for (const row of breakdownRows) {
        const dataRow = ws.addRow(row);
        if (row.description.includes('TOTAL')) {
          dataRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.border = { top: { style: 'thin' } };
          });
        }
      }
    }

    ws.addRow([]);
    const netHeader = ws.addRow({
      description: 'NET GST PAYABLE',
      taxableValue: '',
      cgst: '',
      sgst: '',
      igst: '',
      totalTax: summary.netPayable.netPayable,
    });
    netHeader.eachCell((cell) => {
      cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: summary.netPayable.netPayable < 0 ? 'FF4CAF50' : 'FFF44336' },
      };
    });

    const fileName = `GST_Summary_${summary.period}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export Excel',
      error: error.message,
    });
  }
};

const exportMonthlyPDF = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        message: 'year and month query parameters are required',
      });
    }

    const summary = await gstService.getMonthlySummary(
      parseInt(year, 10),
      parseInt(month, 10),
      req.organizationId
    );

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;
    const leftMargin = 40;
    const rightMargin = width - 40;

    const drawText = (text, x, yPos, opts = {}) => {
      const f = opts.bold ? boldFont : font;
      const size = opts.size || 10;
      const color = opts.color || rgb(0, 0, 0);
      page.drawText(text, { x, y: yPos, font: f, size, color });
    };

    const drawLine = (yPos, color = rgb(0.7, 0.7, 0.7)) => {
      page.drawLine({
        start: { x: leftMargin, y: yPos },
        end: { x: rightMargin, y: yPos },
        thickness: 1,
        color,
      });
    };

    drawText(`GST SUMMARY - ${summary.period}`, leftMargin, y, { bold: true, size: 16 });
    y -= 22;
    drawText(`Financial Year: ${summary.financialYear}`, leftMargin, y, { size: 10, color: rgb(0.4, 0.4, 0.4) });
    y -= 30;
    drawLine(y);
    y -= 20;

    const sections = [
      {
        title: 'OUTPUT TAX (Sales)',
        rows: [
          ['Taxable Value', summary.sales.taxableValue],
          ['CGST', summary.sales.cgst],
          ['SGST', summary.sales.sgst],
          ['IGST', summary.sales.igst],
          ['Total Output Tax', summary.sales.totalTax],
        ],
      },
      {
        title: 'INPUT TAX (Purchases / ITC)',
        rows: [
          ['Taxable Value', summary.purchases.taxableValue],
          ['CGST', summary.purchases.cgst],
          ['SGST', summary.purchases.sgst],
          ['IGST', summary.purchases.igst],
          ['Total Input Tax', summary.purchases.totalTax],
        ],
      },
      {
        title: 'CREDIT NOTE ADJUSTMENTS',
        rows: [
          ['Taxable Value', summary.creditNotes.taxableValue],
          ['CGST', summary.creditNotes.cgst],
          ['SGST', summary.creditNotes.sgst],
          ['IGST', summary.creditNotes.igst],
          ['Total Tax', summary.creditNotes.totalTax],
        ],
      },
      {
        title: 'DEBIT NOTE ADJUSTMENTS',
        rows: [
          ['Taxable Value', summary.debitNotes.taxableValue],
          ['CGST', summary.debitNotes.cgst],
          ['SGST', summary.debitNotes.sgst],
          ['IGST', summary.debitNotes.igst],
          ['Total Tax', summary.debitNotes.totalTax],
        ],
      },
      {
        title: 'INTEREST NOTE LIABILITY',
        rows: [
          ['Taxable Value', summary.interestNotes.taxableValue],
          ['CGST', summary.interestNotes.cgst],
          ['SGST', summary.interestNotes.sgst],
          ['IGST', summary.interestNotes.igst],
          ['Total Tax', summary.interestNotes.totalTax],
        ],
      },
    ];

    for (const section of sections) {
      drawText(section.title, leftMargin, y, { bold: true, size: 11, color: rgb(0.1, 0.3, 0.6) });
      y -= 18;

      for (const [label, value] of section.rows) {
        drawText(label, leftMargin + 10, y, { size: 9 });
        drawText(`Rs. ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightMargin - 100, y, { size: 9 });
        y -= 15;
      }
      y -= 8;
    }

    drawLine(y);
    y -= 20;
    drawText('NET GST LIABILITY', leftMargin, y, { bold: true, size: 13 });
    y -= 20;
    drawText(`Output Tax:  Rs. ${Number(summary.outputTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftMargin + 10, y, { bold: true, size: 10 });
    y -= 16;
    drawText(`Input Tax (ITC):  Rs. ${Number(summary.inputTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftMargin + 10, y, { bold: true, size: 10 });
    y -= 16;
    const netColor = summary.netPayable.netPayable < 0 ? rgb(0.1, 0.6, 0.2) : rgb(0.8, 0.1, 0.1);
    drawText(
      `Net Payable:  Rs. ${Number(summary.netPayable.netPayable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      leftMargin + 10,
      y,
      { bold: true, size: 12, color: netColor }
    );

    const pdfBytes = await pdfDoc.save();
    const fileName = `GST_Summary_${summary.period}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export PDF',
      error: error.message,
    });
  }
};

export {
  getMonthlySummary,
  getFYSummary,
  getCurrentMonthSummary,
  getCurrentFYSummary,
  getAvailableFYs,
  exportMonthlyExcel,
  exportMonthlyPDF,
};
