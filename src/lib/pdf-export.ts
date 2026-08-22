export interface PdfImagePage {
  jpeg: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
  widthPoints: number;
  heightPoints: number;
}

const encoder = new TextEncoder();

function ascii(value: string) {
  return encoder.encode(value);
}

function concat(parts: readonly Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function pdfString(value: string) {
  return value.replace(/[^\x20-\x7e]/g, " ").replace(/([\\()])/g, "\\$1").slice(0, 240);
}

function number(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export function buildImagePdf(pages: readonly PdfImagePage[], title: string): Uint8Array {
  if (!pages.length) throw new Error("A PDF needs at least one rendered page.");
  if (pages.some((page) => !page.jpeg.length || page.pixelWidth < 1 || page.pixelHeight < 1 || page.widthPoints <= 0 || page.heightPoints <= 0)) {
    throw new Error("A rendered PDF page is invalid.");
  }

  const pageObjectIds = pages.map((_, index) => 3 + index * 3);
  const infoObjectId = 3 + pages.length * 3;
  const objects = new Map<number, Uint8Array>();
  objects.set(1, ascii("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(2, ascii(`<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>`));

  pages.forEach((page, index) => {
    const pageId = pageObjectIds[index];
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const width = number(page.widthPoints);
    const height = number(page.heightPoints);
    objects.set(pageId, ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
    objects.set(imageId, concat([
      ascii(`<< /Type /XObject /Subtype /Image /Width ${Math.round(page.pixelWidth)} /Height ${Math.round(page.pixelHeight)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`),
      page.jpeg,
      ascii("\nendstream"),
    ]));
    const content = ascii(`q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`);
    objects.set(contentId, concat([ascii(`<< /Length ${content.length} >>\nstream\n`), content, ascii("endstream")]));
  });
  objects.set(infoObjectId, ascii(`<< /Title (${pdfString(title)}) /Creator (GlassWare by Wiplash Labs) /Producer (GlassWare image PDF writer) >>`));

  const chunks: Uint8Array[] = [ascii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = new Array(infoObjectId + 1).fill(0);
  let offset = chunks[0].length;
  for (let id = 1; id <= infoObjectId; id += 1) {
    const object = objects.get(id);
    if (!object) throw new Error(`PDF object ${id} is missing.`);
    offsets[id] = offset;
    const chunk = concat([ascii(`${id} 0 obj\n`), object, ascii("\nendobj\n")]);
    chunks.push(chunk);
    offset += chunk.length;
  }
  const xrefOffset = offset;
  const xref = [
    `xref\n0 ${infoObjectId + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((entry) => `${String(entry).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${infoObjectId + 1} /Root 1 0 R /Info ${infoObjectId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  ].join("");
  chunks.push(ascii(xref));
  return concat(chunks);
}
