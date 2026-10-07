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
    fields: "sheets(properties(sheetId,title))",
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
  const registrationValues =
    await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Registrations!A:A",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
  const lastRegistrationRow =
    registrationValues.data.values?.length || 1;
  const dataEndRowIndex = Math.max(2, lastRegistrationRow);

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
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: dataEndRowIndex,
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
          startIndex: 0,
          endIndex: 1,
        },
        properties: { pixelSize: 40 },
        fields: "pixelSize",
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: 1,
          endIndex: dataEndRowIndex,
        },
        properties: { pixelSize: 32 },
        fields: "pixelSize",
      },
    },
  ];

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

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  console.log("Registrations sheet formatting fixed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
