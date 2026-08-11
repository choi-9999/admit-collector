import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const ADMIT_TAB = "admit";
const SETTINGS_TAB = "settings";
const ADMISSION_YEAR_KEY = "currentAdmissionYear";

export const LEGACY_ADMISSION_YEAR = 2026;
export const DEFAULT_CURRENT_ADMISSION_YEAR = 2027;

function sheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function ensureSettingsTab() {
  const sheets = sheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: "sheets.properties.title",
  });
  const exists = spreadsheet.data.sheets?.some(
    (sheet) => sheet.properties?.title === SETTINGS_TAB,
  );

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SETTINGS_TAB } } }],
      },
    });
  }

  return sheets;
}

export async function getCurrentAdmissionYear() {
  const sheets = await ensureSettingsTab();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SETTINGS_TAB}!A1:B`,
  });
  const rows = data.values || [];
  const setting = rows.find((row) => row[0] === ADMISSION_YEAR_KEY);
  const parsed = Number(setting?.[1]);

  if (Number.isInteger(parsed) && parsed >= 2020 && parsed <= 2100) {
    return parsed;
  }

  await setCurrentAdmissionYear(DEFAULT_CURRENT_ADMISSION_YEAR);
  return DEFAULT_CURRENT_ADMISSION_YEAR;
}

export async function setCurrentAdmissionYear(year: number) {
  const sheets = await ensureSettingsTab();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SETTINGS_TAB}!A1:B`,
  });
  const rows = data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === ADMISSION_YEAR_KEY);

  if (rowIndex >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SETTINGS_TAB}!B${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [[year]] },
    });
  } else {
    if (!rows.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SETTINGS_TAB}!A1:B1`,
        valueInputOption: "RAW",
        requestBody: { values: [["key", "value"]] },
      });
    }
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SETTINGS_TAB}!A:B`,
      valueInputOption: "RAW",
      requestBody: { values: [[ADMISSION_YEAR_KEY, year]] },
    });
  }

  return year;
}

export async function migrateLegacyAdmissionYears() {
  const sheets = sheetsClient();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${ADMIT_TAB}!A1:O`,
  });
  const rows = data.values || [];

  if (!rows.length) {
    return { migratedCount: 0 };
  }

  const yearColumn = 14;
  const values = rows.map((row, index) => {
    if (index === 0) return ["admissionYear"];
    return [row[yearColumn] || LEGACY_ADMISSION_YEAR];
  });
  const migratedCount = rows
    .slice(1)
    .filter((row) => !row[yearColumn]).length;

  if (rows[0][yearColumn] === "admissionYear" && migratedCount === 0) {
    return { migratedCount: 0 };
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${ADMIT_TAB}!O1:O${rows.length}`,
    valueInputOption: "RAW",
    requestBody: { values },
  });

  return { migratedCount };
}
