// Helper d'export Excel soigné (couleurs, titres, tableaux aérés) partagé par
// le Tableau de bord et les Rapports. S'appuie sur xlsx-js-style (drop-in de
// SheetJS qui, contrairement à xlsx, applique réellement les styles de cellule).
import * as XLSX from "xlsx-js-style";

// Palette (reprend les couleurs de l'app : bleu nuit + accents).
const C = {
  title: "1E3A8A",      // bandeau titre (bleu foncé)
  titleText: "FFFFFF",
  header: "131B2E",     // ligne d'en-tête (bleu nuit)
  headerText: "FFFFFF",
  zebra: "F1F5F9",      // lignes paires
  white: "FFFFFF",
  text: "0F172A",
  subtitle: "64748B",
  border: "D9E2EC",
};

const thin = { style: "thin" as const, color: { rgb: C.border } };
const allBorders = { top: thin, bottom: thin, left: thin, right: thin };

export interface Column {
  header: string;
  key: string;
  width?: number; // largeur forcée (en caractères) ; sinon auto
}

export interface StyledSheetOptions {
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: Column[];
  rows: Record<string, unknown>[];
}

// Construit une feuille stylée : bandeau titre fusionné, sous-titre optionnel,
// en-tête coloré, lignes zébrées, bordures fines et colonnes auto-dimensionnées.
export function buildStyledSheet(opts: StyledSheetOptions) {
  const { title, subtitle, columns, rows } = opts;
  const n = columns.length;

  const aoa: unknown[][] = [];
  aoa.push([title, ...Array(n - 1).fill("")]);
  if (subtitle) aoa.push([subtitle, ...Array(n - 1).fill("")]);
  const headerRow = aoa.length;
  aoa.push(columns.map((c) => c.header));
  for (const r of rows) aoa.push(columns.map((c) => r[c.key] ?? ""));

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Fusions du titre (et du sous-titre) sur toute la largeur.
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: n - 1 } },
    ...(subtitle ? [{ s: { r: 1, c: 0 }, e: { r: 1, c: n - 1 } }] : []),
  ];

  // Largeurs de colonnes : max(en-tête, contenu) borné entre 12 et 48.
  ws["!cols"] = columns.map((c) => {
    const contentMax = rows.reduce(
      (m, r) => Math.max(m, String(r[c.key] ?? "").length),
      c.header.length
    );
    return { wch: Math.min(Math.max((c.width ?? contentMax) + 4, 12), 48) };
  });

  // Hauteurs de lignes (aération).
  ws["!rows"] = aoa.map((_, i) => {
    if (i === 0) return { hpt: 32 };
    if (subtitle && i === 1) return { hpt: 18 };
    if (i === headerRow) return { hpt: 24 };
    return { hpt: 20 };
  });

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let Col = range.s.c; Col <= range.e.c; Col++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: Col });
      const cell = ws[ref];
      if (!cell) continue;

      if (R === 0) {
        cell.s = {
          font: { bold: true, sz: 16, color: { rgb: C.titleText } },
          fill: { fgColor: { rgb: C.title } },
          alignment: { horizontal: "left", vertical: "center", indent: 1 },
        };
      } else if (subtitle && R === 1) {
        cell.s = {
          font: { italic: true, sz: 10, color: { rgb: C.subtitle } },
          alignment: { horizontal: "left", vertical: "center", indent: 1 },
        };
      } else if (R === headerRow) {
        cell.s = {
          font: { bold: true, sz: 11, color: { rgb: C.headerText } },
          fill: { fgColor: { rgb: C.header } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: allBorders,
        };
      } else {
        const dataIdx = R - headerRow - 1;
        const isNum = typeof cell.v === "number";
        cell.s = {
          font: { sz: 10, color: { rgb: C.text } },
          fill: { fgColor: { rgb: dataIdx % 2 === 1 ? C.zebra : C.white } },
          alignment: { horizontal: isNum ? "right" : "left", vertical: "center", indent: isNum ? 0 : 1 },
          border: allBorders,
        };
      }
    }
  }

  return ws;
}

// Assemble plusieurs feuilles stylées et déclenche le téléchargement du .xlsx.
export function downloadStyledWorkbook(
  filename: string,
  sheets: { name: string; ws: ReturnType<typeof buildStyledSheet> }[]
) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) XLSX.utils.book_append_sheet(wb, s.ws, s.name);
  XLSX.writeFile(wb, filename);
}
