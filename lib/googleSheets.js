import { google } from "googleapis";
import path from "path";

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(
    process.cwd(),
    "credentials",
    "google-service-account.json"
  ),
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

export async function getGoogleSheets() {
  const client = await auth.getClient();

  return google.sheets({
    version: "v4",
    auth: client,
  });
}