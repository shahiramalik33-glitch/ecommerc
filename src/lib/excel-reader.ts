import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

export interface ExcelProduct {
  name: string;
  category: string;
  price: number | string;
  stockStatus: string;
  description: string;
}

const DEFAULT_DESKTOP_PATH = "C:\\Users\\FR-Traders\\Desktop";

function resolveSpreadsheetPath(targetPath: string): string | null {
  if (!fs.existsSync(targetPath)) return null;

  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      // Find the first .xlsx or .xls file in the directory
      const files = fs.readdirSync(targetPath);
      const sheetFile = files.find((f) => /\.(xlsx|xls)$/i.test(f));
      if (sheetFile) {
        return path.join(targetPath, sheetFile);
      }
      return null;
    }
    return targetPath;
  } catch (err) {
    console.error("[ExcelReader] Error resolving path:", err);
    return null;
  }
}

export function getExcelProducts(): ExcelProduct[] {
  const configuredPath = process.env.EXCEL_PATH || path.join(DEFAULT_DESKTOP_PATH, "ecomerce.xlsx");
  const filePath = resolveSpreadsheetPath(configuredPath) || resolveSpreadsheetPath(DEFAULT_DESKTOP_PATH);

  if (!filePath) {
    console.warn(`[ExcelReader] No spreadsheet found at ${configuredPath} or ${DEFAULT_DESKTOP_PATH}`);
    return [];
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: "",
      raw: false,
    });

    const products: ExcelProduct[] = [];

    for (const row of rawRows) {
      const nameKey = Object.keys(row).find((k) =>
        /product\s*name/i.test(k) || /^name$/i.test(k) || /^title$/i.test(k)
      );
      const catKey = Object.keys(row).find((k) => /category/i.test(k));
      const priceKey = Object.keys(row).find((k) => /price/i.test(k));
      const stockKey = Object.keys(row).find((k) =>
        /stock/i.test(k) || /status/i.test(k) || /availability/i.test(k)
      );
      const descKey = Object.keys(row).find((k) =>
        /desc/i.test(k) || /detail/i.test(k)
      );

      const name = (nameKey ? String(row[nameKey]) : "").trim();
      if (!name) continue;

      const category = (catKey ? String(row[catKey]) : "").trim();
      const price = (priceKey ? row[priceKey] : "").toString().trim();
      const stockStatus = (stockKey ? String(row[stockKey]) : "In stock").trim();
      const description = (descKey ? String(row[descKey]) : "").trim();

      products.push({
        name,
        category,
        price,
        stockStatus,
        description,
      });
    }

    return products;
  } catch (error) {
    console.error("[ExcelReader] Error reading excel file:", error);
    return [];
  }
}

export function formatProductsForPrompt(products: ExcelProduct[]): string {
  if (!products.length) {
    return "No products currently found in the catalog.";
  }

  return products
    .map(
      (p, idx) =>
        `${idx + 1}. **${p.name}** | Category: ${p.category || "General"} | Price: $${p.price} | Stock: ${p.stockStatus} | Details: ${p.description || "N/A"}`
    )
    .join("\n");
}
