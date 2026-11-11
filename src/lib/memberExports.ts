import type { MemberProfile } from '../types';

export type ApprovedMemberExportFormat = 'csv' | 'excel' | 'pdf';

type ExportRecord = Record<string, string>;

const formatDate = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
};

const createExportRecords = (members: readonly MemberProfile[]): ExportRecord[] =>
  [...members]
    .filter((member) => member.status === 'approved')
    .sort((left, right) => (left.memberId || '').localeCompare(right.memberId || '', 'en', { numeric: true }))
    .map((member) => ({
      'Member ID': member.memberId || '',
      'Full name': member.fullName || '',
      'Father name': member.fatherName || '',
      'Mobile number': member.mobile || '',
      'Email': member.email || '',
      'CNIC / Passport': member.idNumber || '',
      'Country': member.country || '',
      'City / Wilayat': member.currentLocation || '',
      'Emergency contact name': member.emergencyContact?.name || '',
      'Emergency contact relation': member.emergencyContact?.relation || '',
      'Emergency contact primary number': member.emergencyContact?.phone || '',
      'Emergency contact alternate number': member.emergencyContact?.alternatePhone || '',
      'Registration date': formatDate(member.registeredAt),
      'Approval date': formatDate(member.approvedAt),
      'Member since': member.memberSince || '',
      'Receipt reference': member.receiptReference || '',
      'Photo on file': member.photoURL ? 'Yes' : 'No',
      'Payment receipt on file': member.paymentReceiptURL ? 'Yes' : 'No',
      'Admin note': member.adminNote || '',
      'Status': 'Approved',
    }));

const createFilename = (format: ApprovedMemberExportFormat): string =>
  `plc-approved-members-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : format}`;

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const exportCsv = (records: ExportRecord[], filename: string): void => {
  const headers = Object.keys(records[0]);
  const escapeCell = (value: string): string => {
    const safeValue = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safeValue.replace(/"/g, '""')}"`;
  };
  const csv = [headers, ...records.map((record) => headers.map((header) => record[header] || ''))]
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n');
  downloadBlob(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), filename);
};

const exportExcel = async (records: ExportRecord[], filename: string): Promise<void> => {
  const excelModule = await import('exceljs') as typeof import('exceljs') & { default?: typeof import('exceljs') };
  const ExcelJS = excelModule.default || excelModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Pakistan Labour Community';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Approved members', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  const headers = Object.keys(records[0]);
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(Math.max(header.length + 3, 16), 36),
  }));
  records.forEach((record) => worksheet.addRow(record));
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D5A31' } };
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
  worksheet.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true };
  });

  const data = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
  );
};

const exportPdf = async (records: ExportRecord[], filename: string): Promise<void> => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.setProperties({
    title: 'PLC Approved Member Records',
    subject: 'Approved member administration records',
    creator: 'Pakistan Labour Community Member Portal',
  });

  records.forEach((record, index) => {
    if (index > 0) pdf.addPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text('Pakistan Labour Community', 16, 16);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Approved Members — Administration Records', 16, 22);
    pdf.text(`Member ${index + 1} of ${records.length}  •  Generated ${new Date().toISOString().slice(0, 10)}`, 16, 28);

    autoTable(pdf, {
      startY: 34,
      head: [['Field', 'Member record']],
      body: Object.entries(record).map(([field, value]) => [field, value || '—']),
      theme: 'grid',
      margin: { left: 16, right: 16 },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, overflow: 'linebreak' },
      headStyles: { fillColor: [13, 90, 49], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' } },
    });
  });

  downloadBlob(pdf.output('blob'), filename);
};

export const downloadApprovedMemberRecords = async (
  members: readonly MemberProfile[],
  format: ApprovedMemberExportFormat,
): Promise<number> => {
  const records = createExportRecords(members);
  if (records.length === 0) {
    throw new Error('There are no approved members to export.');
  }

  const filename = createFilename(format);
  if (format === 'csv') exportCsv(records, filename);
  else if (format === 'excel') await exportExcel(records, filename);
  else await exportPdf(records, filename);

  return records.length;
};
