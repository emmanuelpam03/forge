#!/usr/bin/env node
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import ExcelJS from 'exceljs';
import PptxGenJS from 'pptxgenjs';

async function ensureDir(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
  } catch {}
}

async function generatePdf(outDir: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // standard letter px
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  const title = 'Students in the Classroom — Generated PDF';
  page.drawText(title, {
    x: 50,
    y: height - 80,
    size: 20,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  const body = `This PDF was generated programmatically as an example.\n\nScene: A bright classroom with students collaborating on a STEM project. Non-identifiable faces.`;
  page.drawText(body, { x: 50, y: height - 120, size: 12, font, color: rgb(0, 0, 0) });

  const pdfBytes = await pdfDoc.save();
  const outPath = path.join(outDir, 'students-classroom.pdf');
  await writeFile(outPath, pdfBytes);
  return outPath;
}

async function generateDocx(outDir: string) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Students in the Classroom — Generated DOCX', bold: true, size: 28 })] }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'This DOCX was generated programmatically as an example.' }),
          new Paragraph({ text: 'Scene: Students collaborating on projects; non-identifiable faces for privacy.' }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(outDir, 'students-classroom.docx');
  await writeFile(outPath, buffer);
  return outPath;
}

async function generateXlsx(outDir: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Students');
  sheet.columns = [
    { header: 'Name', key: 'name', width: 32 },
    { header: 'Activity', key: 'activity', width: 40 },
    { header: 'Notes', key: 'notes', width: 50 },
  ];
  sheet.addRow({ name: 'Group A', activity: 'Robotics kit', notes: 'Collaborating on design' });
  sheet.addRow({ name: 'Group B', activity: 'Laptops', notes: 'Coding sensor readouts' });

  const buffer = await workbook.xlsx.writeBuffer();
  const outPath = path.join(outDir, 'students-classroom.xlsx');
  await writeFile(outPath, Buffer.from(buffer));
  return outPath;
}

async function generatePptx(outDir: string) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  const slide = pres.addSlide();
  slide.addText('Students in the Classroom — Generated PPTX', { x: 0.5, y: 0.5, fontSize: 24, bold: true });
  slide.addText('Example slide: Groups collaborating on STEM activities. Faces are non-identifiable.', { x: 0.5, y: 1.4, fontSize: 14, color: '363636' });

  const outBuffer = await pres.write('nodebuffer');
  const outPath = path.join(outDir, 'students-classroom.pptx');
  await writeFile(outPath, outBuffer as Buffer);
  return outPath;
}

async function main() {
  const outDir = path.join(process.cwd(), 'generated');
  await ensureDir(outDir);

  console.log('Generating PDF...');
  const pdfPath = await generatePdf(outDir);
  console.log('Wrote', pdfPath);

  console.log('Generating DOCX...');
  const docxPath = await generateDocx(outDir);
  console.log('Wrote', docxPath);

  console.log('Generating XLSX...');
  const xlsxPath = await generateXlsx(outDir);
  console.log('Wrote', xlsxPath);

  console.log('Generating PPTX...');
  const pptxPath = await generatePptx(outDir);
  console.log('Wrote', pptxPath);

  console.log('All files generated in', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
