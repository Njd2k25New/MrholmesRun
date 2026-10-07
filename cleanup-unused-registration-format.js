const { google } = require("googleapis");
const path = require("node:path");

const SPREADSHEET_ID = "1rIUiNA4uL7w9YsnqPKu_M_lpCrHdH0di_JcbxtsVH_I";
const REGISTRATIONS_SHEET_TITLE = "Registrations";

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(
      __dirname,
      "credentials",
      "google-service-account.json"
    ),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: authClient });

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields:
      "sheets(properties(sheetId,title,gridProperties(rowCount)))",
  });

  const registrationsSheet = spreadsheet.data.sheets?.find(
    (sheet) => sheet.properties?.title === REGISTRATIONS_SHEET_TITLE
  );

  if (!registrationsSheet) {
    throw new Error(
      `Could not find a sheet titled "${REGISTRATIONS_SHEET_TITLE}".`
    );
  }

  const sheetId = registrationsSheet.properties.sheetId;
  const rowCount =
    registrationsSheet.properties.gridProperties?.rowCount;

  if (!Number.isInteger(rowCount)) {
    throw new Error("Could not determine the Registrations row count.");
  }

  const registrationValues =
    await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Registrations!A:J",
      valueRenderOption: "FORMULA",
    });

  const rows = registrationValues.data.values || [];
  const lastDataRow = rows.reduce(
    (lastRow, row, index) =>
      row.some((value) => String(value ?? "").trim() !== "")
        ? index + 1
        : lastRow,
    1
  );
  const emptyRowsStartIndex = lastDataRow;
  const dataRange =
    lastDataRow >= 2 ? `A2:J${lastDataRow}` : "(none)";
  const emptyRange =
    emptyRowsStartIndex < rowCount
      ? `A${lastDataRow + 1}:J${rowCount}`
      : "(none)";

  const requests = [
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 0.07,
              green: 0.07,
              blue: 0.07,
            },
            textFormat: {
              foregroundColor: {
                red: 1,
                green: 1,
                blue: 1,
              },
              bold: true,
            },
            verticalAlignment: "MIDDLE",
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat.foregroundColor,textFormat.bold,verticalAlignment)",
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: 0,
          endIndex: 1,
        },
        properties: { pixelSize: 40 },
        fields: "pixelSize",
      },
    },
  ];

  if (lastDataRow >= 2) {
    requests.push(
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 1,
            endRowIndex: lastDataRow,
            startColumnIndex: 0,
            endColumnIndex: 10,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: {
                red: 1,
                green: 1,
                blue: 1,
              },
              textFormat: {
                foregroundColor: {
                  red: 0,
                  green: 0,
                  blue: 0,
                },
                bold: false,
              },
              verticalAlignment: "MIDDLE",
              wrapStrategy: "CLIP",
            },
          },
          fields:
            "userEnteredFormat(backgroundColor,textFormat.foregroundColor,textFormat.bold,verticalAlignment,wrapStrategy)",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: 1,
            endIndex: lastDataRow,
          },
          properties: { pixelSize: 32 },
          fields: "pixelSize",
        },
      }
    );
  }

  if (emptyRowsStartIndex < rowCount) {
    requests.push(
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: emptyRowsStartIndex,
            endRowIndex: rowCount,
            startColumnIndex: 0,
            endColumnIndex: 10,
          },
          cell: { userEnteredFormat: {} },
          fields:
            "userEnteredFormat(backgroundColor,textFormat.foregroundColor,textFormat.bold,verticalAlignment,wrapStrategy)",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: emptyRowsStartIndex,
            endIndex: rowCount,
          },
          properties: { pixelSize: 21 },
          fields: "pixelSize",
        },
      }
    );
  }

  const columnWidths = [200, 220, 120, 130, 220, 80, 100, 250, 180, 120];

  columnWidths.forEach((pixelSize, columnIndex) => {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: columnIndex,
          endIndex: columnIndex + 1,
        },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    });
  });

  console.log(`[CLEANUP] Last data row: ${lastDataRow}`);
  console.log("[CLEANUP] Header range: A1:J1");
  console.log(`[CLEANUP] Data range: ${dataRange}`);
  console.log(`[CLEANUP] Empty range: ${emptyRange}`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  console.log(
    "Registrations sheet formatting updated successfully."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
