// Beit Rakia page content, 2026-11-01. Dry run by default, prints the patch.
//
//   node scripts/beit-rakia-data-2026-11-01.mjs           # show what would change
//   node scripts/beit-rakia-data-2026-11-01.mjs --apply   # write it
//
// Needs docs/migrations/2026-11-01-service-weekend-price.sql to have run first.
// Rows as they stood before this: backups/beit-rakia-*-2026-11-01.json.
//
// Owner-confirmed facts only. The 20-seat table, Shabbat fridge and separate
// sinks stay out until the owner confirms them. No street, no door code.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const BUSINESS_ID = "32117807-5bc1-4820-b83d-6bf694f2646f";
const UNIT_ID = "af460b94-3eff-44a6-b20d-245f9ff61862";
const STORAGE_DIR = `${url}/storage/v1/object/public/business-images/galleries/2f39016f-1fca-47e1-8e44-e92e86785859`;
const APPLY = process.argv.includes("--apply");

// Order from ~/Desktop/beit-rakia/copy-pack.md. Ari18-204 and Ari18-22 are cut.
// Ari18-202 was never uploaded, so it goes up here under the same naming scheme.
const FILE = {
  201: "1787564361023-1", 202: "1787564361023-2", 203: "1787564361023-3",
  205: "1787564361023-5", 206: "1787564361023-6", 207: "1787564361023-7",
  208: "1787564361023-8", 209: "1787564361023-9", 210: "1787564361023-10",
  211: "1787564361024-11", 212: "1787564361024-12", 213: "1787564361024-13",
  214: "1787564361024-14", 215: "1787564361024-15", 216: "1787564361024-16",
  217: "1787564361024-17", 218: "1787564361024-18", 219: "1787564361024-19",
  220: "1787564361024-20", 221: "1787564361024-21",
};
const ORDER = [218, 202, 216, 201, 206, 220, 207, 211, 214, 205, 219, 212, 203, 221, 217, 215, 208, 209, 210, 213];
const photo = (n) => `${STORAGE_DIR}/${FILE[n]}.jpg`;

const ABOUT_HE = `בית יוקרה בלב העיר העתיקה בצפת, המשלב ישן עם חדש. כ-200 מ"ר בשני מפלסים: 5 חדרי שינה, 18 מיטות, 3 חדרי רחצה, אחד מהם עם ג'קוזי. שתי מרפסות עם נוף להרים, נדנדה וערסל.

שבת בבית: מפה לבנה, 2 פלטות שבת ומיחם מוכנים לשימוש. בתי הכנסת קרליבך וצאנז במרחק הליכה, ומכולת קרובה פתוחה עד חצות.

מיטות: בחדרי הזוגות 2 מיטות נפרדות, לא מיטה זוגית. בשני חדרים יש גם ספה נפתחת, ובחדר אחד 6 מיטות.

מיזוג בכל חדר שינה ובסלון. מים חמים על גז כל היממה. מצעים ומגבות בניקוי יבש.

אין חניה פרטית. חניה בתשלום ברחוב, כחול לבן עם פנגו, קרוב לבית.`;

const ABOUT_EN = `A luxury home in the heart of Safed's Old City (Tzfat), where old stone meets new comfort. 200 m² on two levels: 5 bedrooms, 18 beds, 3 bathrooms, one with a jacuzzi. Two balconies with mountain views, a swing and a hammock.

Shabbat at the house: a white tablecloth, 2 Shabbat hotplates and an urn are ready for you. Carlebach and Sanz synagogues are a short walk, and a grocery nearby is open until midnight.

Beds: couples' rooms have two separate single beds, not a double. Two rooms add a sofa bed and one room sleeps six.

Air conditioning in every bedroom and the living room. Gas hot water around the clock. Linens and towels are professionally dry cleaned.

There's no private parking. Paid street parking (blue-and-white bays, Pango app) is close to the house.`;

const business = {
  address: "העיר העתיקה, צפת",
  whatsapp_number: "+972534379176",
  phone: "053-437-9176",
  tagline: "Shabbat-ready · Sleeps 18 · Safed Old City",
  tagline_he: "ערוך לשבת · 18 מיטות · העיר העתיקה בצפת",
  about_text: ABOUT_EN,
  about_text_he: ABOUT_HE,
  show_about: true,
  show_stats: false,
  section_order: ["services", "about", "gallery", "location", "reviews"],
  hero_image_url: photo(218),
  gallery_images: ORDER.map(photo),
};

const unit = {
  name: "Beit Rakia",
  name_he: "בית רקיע",
  description: "Whole house, 5 bedrooms, 18 beds, 3 bathrooms. Friday and Saturday nights ₪3,500, so a Shabbat stay is ₪7,000.",
  description_he: "כל הבית, 5 חדרי שינה, 18 מיטות, 3 חדרי רחצה. ליל שישי ושבת 3,500 ₪, שבת שלמה 7,000 ₪.",
  price: 1500,
  weekend_price: 3500,
  amenities: ["wifi", "air-conditioning", "kitchen", "terrace", "bed-linens"],
};

if (!APPLY) {
  console.log("DRY RUN, nothing written. Add --apply to write.\n");
  console.log(JSON.stringify({ business, unit }, null, 1));
  process.exit(0);
}

const upload = await fetch(`${url}/storage/v1/object/business-images/galleries/2f39016f-1fca-47e1-8e44-e92e86785859/${FILE[202]}.jpg`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "image/jpeg", "x-upsert": "true" },
  body: readFileSync(`${process.env.HOME}/Desktop/traklin/raw/Ari18-202.jpg`),
});
if (!upload.ok) throw new Error(`photo upload ${upload.status}: ${await upload.text()}`);

for (const [table, id, patch] of [["businesses", BUSINESS_ID, business], ["services", UNIT_ID, unit]]) {
  const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`${table} ${res.status}: ${await res.text()}`);
  console.log(`${table} updated`);
}
