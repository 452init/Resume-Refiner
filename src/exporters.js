import { Document, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';

export function downloadTextFile(text, filename, type) {
  saveBlob(new Blob([text], { type }), filename);
}

export function downloadResumePdf(text, filename = 'refined-resume') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const lineHeight = 15;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  text.split('\n').forEach((line) => {
    const wrapped = doc.splitTextToSize(line || ' ', maxWidth);
    wrapped.forEach((part) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(part, margin, y);
      y += lineHeight;
    });
  });

  doc.save(`${filename}.pdf`);
}

export async function downloadResumeDocx(text, filename = 'refined-resume') {
  const children = text.split('\n').map((line) => {
    const isHeading = line && line === line.toUpperCase() && /[A-Z]/.test(line);
    return new Paragraph({
      spacing: { after: isHeading ? 160 : 80 },
      children: [
        new TextRun({
          text: line || ' ',
          bold: isHeading,
          size: isHeading ? 24 : 21
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

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
