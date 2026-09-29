import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';
import { formatResumeText } from './refinement.js';

export function downloadTextFile(text, filename, type) {
  saveBlob(new Blob([text], { type }), filename);
}

export function downloadResumePdf(text, filename = 'refined-resume') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 54;
  const lineHeight = 14;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;
  const lines = formatResumeText(text).split('\n');

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(35, 45, 55);

  lines.forEach((line, index) => {
    const isHeading = isResumeHeading(line, index, lines);
    const isBullet = line.startsWith('- ');
    const left = isBullet ? margin + 12 : margin;
    const width = isBullet ? maxWidth - 12 : maxWidth;
    doc.setFont('helvetica', isHeading ? 'bold' : 'normal');
    doc.setFontSize(isHeading ? (index === 0 ? 18 : 11) : 9.5);
    if (isHeading && index > 0) {
      y += 8;
      doc.setDrawColor(210, 216, 220);
      doc.line(margin, y - 4, margin + maxWidth, y - 4);
    }
    const wrapped = doc.splitTextToSize(line || ' ', maxWidth);
    wrapped.forEach((part) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(isBullet && part === wrapped[0] ? `• ${part.slice(2)}` : part, left, y, { maxWidth: width });
      y += lineHeight;
    });
  });

  doc.save(`${filename}.pdf`);
}

export async function downloadResumeDocx(text, filename = 'refined-resume') {
  const lines = formatResumeText(text).split('\n');
  const children = lines.map((line, index) => {
    const isHeading = isResumeHeading(line, index, lines);
    const isBullet = line.startsWith('- ');
    return new Paragraph({
      heading: isHeading && index > 0 ? HeadingLevel.HEADING_2 : undefined,
      alignment: index === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
      bullet: isBullet ? { level: 0 } : undefined,
      spacing: { after: isHeading ? 120 : 70 },
      children: [
        new TextRun({
          text: isBullet ? line.slice(2) : line || ' ',
          bold: isHeading || index === 0,
          size: index === 0 ? 28 : isHeading ? 22 : 20,
          color: isHeading || index === 0 ? '183B56' : '263238'
        })
      ]
    });
  });

  const document = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  const blob = await Packer.toBlob(document);
  saveBlob(blob, `${filename}.docx`);
}

function isResumeHeading(line, index, lines) {
  if (index === 0) return true;
  const knownHeading = /^(summary|professional summary|experience|work experience|employment|education|skills|technical skills|projects|certifications|awards|volunteer|professional experience)$/i.test(line);
  const uppercaseHeading = line === line.toUpperCase() && /[A-Z]/.test(line) && line.length < 55;
  return knownHeading || uppercaseHeading || (index === 1 && lines.length > 2 && !line.startsWith('- '));
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
