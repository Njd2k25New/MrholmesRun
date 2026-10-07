import { getGoogleSheets } from "@/lib/googleSheets";

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    console.log("GOOGLE SHEET ID:", spreadsheetId);

    if (!spreadsheetId) {
      throw new Error(
        "GOOGLE_SHEET_ID was not loaded from .env.local"
      );
    }

    const sheets = await getGoogleSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "Events!A2:H",
    });

    const rows = response.data.values || [];

    const events = rows
      .map((row) => ({
        eventId: row[0],
        date: row[1],
        eventName: row[2],
        totalSlots: Number(row[3] || 0),
        bookedSlots: Number(row[4] || 0),
        availableSlots: Number(row[5] || 0),
        status: row[6],
      }))
      .filter(
        (event) =>
          event.status === "Open" &&
          event.availableSlots > 0
      );

    return Response.json({
      success: true,
      events,
    });

  } catch (error) {
    console.error("GOOGLE SHEETS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}