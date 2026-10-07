import { getGoogleSheets } from "@/lib/googleSheets";

import {
  checkRegistrationRateLimit,
  getClientIp,
} from "@/lib/rateLimit";

export async function POST(request) {
  console.log("[REGISTER] Request received");

  const clientIp = getClientIp(request.headers);
  const rateLimit = checkRegistrationRateLimit(clientIp);

  if (!rateLimit.allowed) {
    console.log("[REGISTER] Rate limit exceeded");

    return Response.json(
      {
        success: false,
        message:
          "Too many registration attempts. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            rateLimit.retryAfterSeconds
          ),
        },
      }
    );
  }

  console.log("[REGISTER] Rate limit passed");

  try {
    // ==================================================
    // 1. GET REQUEST DATA
    // ==================================================

    const body = await request.json();

    const {
      fullName,
      age,
      gender,
      email,
      phone,
      eventId,
      honeypot,
    } = body;

    const honeypotValue =
      typeof honeypot === "string"
        ? honeypot.trim()
        : "";

    console.log(
      "[REGISTER] Honeypot:",
      honeypotValue ? "HAS VALUE" : "EMPTY"
    );

    // Fake success for bots.
    // No registration is created.
    if (honeypotValue) {
      console.warn(
        "Registration request blocked by honeypot."
      );

      return Response.json({
        success: true,
        message: "Your response has been captured.",
      });
    }

    console.log("[REGISTER] Honeypot passed");

    // ==================================================
    // 2. BASIC VALIDATION
    // ==================================================

    if (
      !fullName ||
      !age ||
      !gender ||
      !email ||
      !phone ||
      !eventId
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Please complete all required fields.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 3. CLEAN VALUES
    // ==================================================

    const cleanFullName =
      String(fullName).trim();

    const cleanEmail = String(email)
      .trim()
      .toLowerCase();

    const cleanPhone =
      String(phone).trim();

    const cleanGender = String(gender)
      .trim()
      .toLowerCase();

    const cleanEventId =
      String(eventId).trim();

    const numericAge = Number(age);

    // Normalize phone for duplicate comparison
    const normalizedPhone =
      cleanPhone.replace(/[\s()-]/g, "");

    // ==================================================
    // 4. VALIDATE AGE
    // ==================================================

    if (
      !Number.isInteger(numericAge) ||
      numericAge < 1 ||
      numericAge > 100
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Please enter a valid age.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 5. VALIDATE EMAIL
    // ==================================================

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return Response.json(
        {
          success: false,
          message:
            "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    console.log("[REGISTER] Validation passed");

    // ==================================================
    // 6. CONNECT TO GOOGLE SHEETS
    // ==================================================

    const spreadsheetId =
      process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error(
        "GOOGLE_SHEET_ID is missing"
      );
    }

    const sheets =
      await getGoogleSheets();

    console.log(
      "[REGISTER] Google Sheets connected"
    );

    // ==================================================
    // 7. GET CURRENT EVENTS
    // ==================================================

    const eventsResponse =
      await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Events!A2:H",
      });

    const eventRows =
      eventsResponse.data.values || [];

    // ==================================================
    // 8. FIND SELECTED EVENT
    // ==================================================

    const eventIndex =
      eventRows.findIndex(
        (row) =>
          String(row[0] || "").trim() ===
          cleanEventId
      );

    if (eventIndex === -1) {
      return Response.json(
        {
          success: false,
          message:
            "Selected run was not found.",
        },
        { status: 404 }
      );
    }

    console.log("[REGISTER] Event found");

    const selectedEvent =
      eventRows[eventIndex];

    const eventDate =
      selectedEvent[1];

    const eventName =
      selectedEvent[2];

    const totalSlots = Number(
      selectedEvent[3] || 0
    );

    const bookedSlots = Number(
      selectedEvent[4] || 0
    );

    const status = String(
      selectedEvent[6] || ""
    ).trim();

    // ==================================================
    // 9. CHECK EVENT STATUS
    // ==================================================

    if (status !== "Open") {
      return Response.json(
        {
          success: false,
          message:
            "This run is currently closed.",
        },
        { status: 409 }
      );
    }

    // ==================================================
    // 10. CHECK SLOT AVAILABILITY
    // ==================================================

    if (bookedSlots >= totalSlots) {
      return Response.json(
        {
          success: false,
          message:
            "Sorry, this run is already full.",
        },
        { status: 409 }
      );
    }

    // ==================================================
    // 11. GET EXISTING REGISTRATIONS
    // ==================================================

    const registrationsResponse =
      await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Registrations!A2:J",
      });

    const registrationRows =
      registrationsResponse.data.values || [];

    // ==================================================
    // 12. CHECK DUPLICATE EMAIL
    // ==================================================

    const duplicateEmail =
      registrationRows.some((row) => {
        const registeredEventId =
          String(row[2] || "").trim();

        const registeredEmail =
          String(row[7] || "")
            .trim()
            .toLowerCase();

        return (
          registeredEventId ===
            cleanEventId &&
          registeredEmail ===
            cleanEmail
        );
      });

    if (duplicateEmail) {
      return Response.json(
        {
          success: false,
          message:
            "This email address is already registered for this run.",
        },
        { status: 409 }
      );
    }

    // ==================================================
    // 13. CHECK DUPLICATE PHONE
    // ==================================================

    const duplicatePhone =
      registrationRows.some((row) => {
        const registeredEventId =
          String(row[2] || "").trim();

        const registeredPhone =
          String(row[8] || "")
            .trim()
            .replace(/[\s()-]/g, "");

        return (
          registeredEventId ===
            cleanEventId &&
          registeredPhone ===
            normalizedPhone
        );
      });

    if (duplicatePhone) {
      return Response.json(
        {
          success: false,
          message:
            "This phone number is already registered for this run.",
        },
        { status: 409 }
      );
    }

    console.log(
      "[REGISTER] Duplicate checks passed"
    );

    // ==================================================
    // 14. CREATE REGISTRATION ID
    // ==================================================

    const registrationId =
      `REG-${Date.now()}`;

    const submittedAt =
      new Date().toISOString();

    // ==================================================
    // 15. SAVE REGISTRATION
    // ==================================================

    console.log(
      "[REGISTER] Appending registration..."
    );

    const appendResponse =
      await sheets.spreadsheets.values.append({
        spreadsheetId,

        range: "Registrations!A:J",

        // RAW prevents +965 phone numbers
        // from becoming formulas.
        valueInputOption: "RAW",

        insertDataOption: "INSERT_ROWS",

        requestBody: {
          values: [
            [
              registrationId,
              submittedAt,
              cleanEventId,
              eventDate,
              cleanFullName,
              numericAge,
              cleanGender,
              cleanEmail,
              cleanPhone,
              "Confirmed",
            ],
          ],
        },
      });

    const updatedRange =
      appendResponse.data.updates?.updatedRange;

    const updatedRows =
      appendResponse.data.updates?.updatedRows;

    console.log(
      "[REGISTER] Updated range:",
      updatedRange
    );

    console.log(
      "[REGISTER] Updated rows:",
      updatedRows
    );

    if (updatedRows !== 1) {
      throw new Error(
        "Google Sheets did not confirm exactly one appended registration row."
      );
    }

    if (!updatedRange) {
      throw new Error(
        "Google Sheets did not return the appended registration range."
      );
    }

    console.log(
      "[REGISTER] Registration appended"
    );

    // ==================================================
    // 16. FORMAT ONLY THE NEW REGISTRATION ROW
    // ==================================================
    //
    // Google Sheets can inherit formatting from the
    // previous row during values.append().
    //
    // We use updatedRange returned by Google Sheets
    // to identify exactly which row was inserted.
    //
    // Example:
    // Registrations!A3:J3
    //
    // Only that row is formatted.
    // ==================================================

    const rowMatch =
      updatedRange.match(
        /!A(\d+):J(\d+)$/
      );

    if (!rowMatch) {
      throw new Error(
        `Unable to determine appended row from range: ${updatedRange}`
      );
    }

    const newRegistrationRow =
      Number(rowMatch[1]);

    if (
      !Number.isInteger(
        newRegistrationRow
      ) ||
      newRegistrationRow < 2
    ) {
      throw new Error(
        "Invalid registration row returned by Google Sheets."
      );
    }

    console.log(
      "[REGISTER] Formatting row:",
      newRegistrationRow
    );

    // Get Registrations sheet ID
    const spreadsheetMetadata =
      await sheets.spreadsheets.get({
        spreadsheetId,

        fields:
          "sheets(properties(sheetId,title))",
      });

    const registrationsSheet =
      spreadsheetMetadata.data.sheets?.find(
        (sheet) =>
          sheet.properties?.title ===
          "Registrations"
      );

    if (
      !registrationsSheet?.properties
        ?.sheetId &&
      registrationsSheet?.properties
        ?.sheetId !== 0
    ) {
      throw new Error(
        "Registrations sheet ID could not be found."
      );
    }

    const registrationsSheetId =
      registrationsSheet.properties.sheetId;

    // Sheets API indexes are zero-based.
    // Sheet row 2 = index 1.
    const startRowIndex =
      newRegistrationRow - 1;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,

      requestBody: {
        requests: [
          // ------------------------------------------
          // WHITE BACKGROUND + DARK TEXT
          // ------------------------------------------

          {
            repeatCell: {
              range: {
                sheetId:
                  registrationsSheetId,

                startRowIndex,
                endRowIndex:
                  startRowIndex + 1,

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
                      red: 0.09,
                      green: 0.08,
                      blue: 0.07,
                    },

                    bold: false,
                  },

                  verticalAlignment:
                    "MIDDLE",

                  wrapStrategy:
                    "CLIP",
                },
              },

              fields:
                "userEnteredFormat.backgroundColor," +
                "userEnteredFormat.textFormat.foregroundColor," +
                "userEnteredFormat.textFormat.bold," +
                "userEnteredFormat.verticalAlignment," +
                "userEnteredFormat.wrapStrategy",
            },
          },

          // ------------------------------------------
          // ROW HEIGHT
          // ------------------------------------------

          {
            updateDimensionProperties: {
              range: {
                sheetId:
                  registrationsSheetId,

                dimension: "ROWS",

                startIndex:
                  startRowIndex,

                endIndex:
                  startRowIndex + 1,
              },

              properties: {
                pixelSize: 32,
              },

              fields:
                "pixelSize",
            },
          },
        ],
      },
    });

    console.log(
      "[REGISTER] New row formatted"
    );

    // ==================================================
    // 17. UPDATE BOOKED SLOT COUNT
    // ==================================================

    const newBookedSlots =
      bookedSlots + 1;

    // eventIndex 0 = sheet row 2
    const sheetRow =
      eventIndex + 2;

    console.log(
      "[REGISTER] Updating booked slots..."
    );

    const bookedSlotsResponse =
      await sheets.spreadsheets.values.update({
        spreadsheetId,

        range:
          `Events!E${sheetRow}`,

        valueInputOption:
          "USER_ENTERED",

        requestBody: {
          values: [
            [newBookedSlots],
          ],
        },
      });

    if (
      bookedSlotsResponse.data
        .updatedCells !== 1
    ) {
      throw new Error(
        "Google Sheets did not confirm the booked-slot update."
      );
    }

    console.log(
      "[REGISTER] Booked slots updated"
    );

    // ==================================================
    // 18. CALCULATE REMAINING SLOTS
    // ==================================================

    const remainingSlots =
      Math.max(
        0,
        totalSlots - newBookedSlots
      );

    // ==================================================
    // 19. SUCCESS RESPONSE
    // ==================================================

    return Response.json({
      success: true,

      message:
        "Your response has been captured. Registration completed successfully.",

      registration: {
        registrationId,
        eventId: cleanEventId,
        eventName,
        eventDate,
        remainingSlots,
      },
    });
  } catch (error) {
    console.error(
      "[REGISTER] Registration failed:",
      error.message
    );

    return Response.json(
      {
        success: false,
        message:
          "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}