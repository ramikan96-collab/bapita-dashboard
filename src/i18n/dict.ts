// Dashboard UI dictionary. Keys are the English strings as written in the UI;
// t() falls back to the key itself, so untranslated strings render in English.
// Layout stays LTR — only the words change (decision with Rami, 2026-07-02).

export type DashboardLang = "en" | "he";

export const HE: Record<string, string> = {
  // Nav + drawer
  "Menu": "תפריט",
  "Manage": "ניהול",
  "Account": "חשבון",
  "more": "נוספים",
  "Calendar": "יומן",
  "Clients": "לקוחות",
  "Insights": "תובנות",
  "Extras": "תוספות",
  "Settings": "הגדרות",
  "Financials": "כספים",
  "Profile": "פרופיל",
  "Support": "תמיכה",
  "Admin": "ניהול",
  "Sign out": "התנתקות",
  "Notifications": "התראות",
  "New booking": "תור חדש",
  "Open menu": "פתיחת תפריט",
  "Navigation menu": "תפריט ניווט",
  "Print": "הדפסה",
  "My Business": "העסק שלי",

  // Calendar chrome
  "Day": "יום",
  "Week": "שבוע",
  "Month": "חודש",
  "Agenda": "סדר יום",
  "View": "תצוגה",
  "Today": "היום",
  "Status": "סטטוס",
  "Calendars": "יומנים",
  "All": "הכל",
  "Search clients…": "חיפוש לקוחות…",
  "Search": "חיפוש",
  "Filter": "סינון",
  "filters": "מסננים",
  "Filter by status": "סינון לפי סטטוס",
  "Clear filters": "ניקוי מסננים",
  "Clear all filters": "ניקוי כל המסננים",
  "Add calendar": "הוספת יומן",
  "Jump to today": "מעבר להיום",
  "Multiple calendars coming soon": "ריבוי יומנים — בקרוב",

  // Short weekday headers (month grid)
  "Mon": "ב׳",
  "Tue": "ג׳",
  "Wed": "ד׳",
  "Thu": "ה׳",
  "Fri": "ו׳",
  "Sat": "ש׳",
  "Sun": "א׳",
  "No appointments": "אין תורים",

  // Booking statuses
  "Pending": "ממתין",
  "Confirmed": "מאושר",
  "Completed": "הושלם",
  "Cancelled": "בוטל",
  "No-show": "לא הגיע",

  // Notifications sheet
  "Mark all read": "סימון הכל כנקרא",
  "Clear all": "ניקוי הכל",
  "No notifications yet": "אין התראות עדיין",
  "Push on this device": "התראות פוש במכשיר זה",

  // Toasts / feedback
  "Push notifications enabled": "התראות פוש הופעלו",
  "Notifications blocked — enable them in your browser settings": "ההתראות חסומות — יש להפעיל אותן בהגדרות הדפדפן",
  "Push notifications turned off": "התראות הפוש כובו",
  "Couldn't turn off notifications": "לא ניתן היה לכבות את ההתראות",
  "Failed to sign out": "ההתנתקות נכשלה",

  // Settings tabs + common
  "Business": "עסק",
  "Services": "שירותים",
  "Hours": "שעות",
  "Website": "אתר",
  "Content": "תוכן",
  "Save": "שמירה",
  "Save changes": "שמירת שינויים",
  "No changes": "אין שינויים",
  "Saving…": "שומר…",
  "Saved": "נשמר",
  "Today ·": "היום ·",
  "Tap a slot to book": "הקישו על משבצת לקביעת תור",
  "Cancel": "ביטול",
  "Delete": "מחיקה",
  "Edit": "עריכה",
  "Add": "הוספה",

  // Settings section cards
  "Details": "פרטים",
  "Hebrew version (עברית)": "גרסה בעברית",
  "Working days": "ימי עבודה",
  "Break between appointments": "הפסקה בין תורים",
  "How far ahead clients can book": "כמה זמן מראש אפשר לקבוע תור",
  "Time off & blocked dates": "חופשות ותאריכים חסומים",
  "Display settings": "הגדרות תצוגה",
  "Google Maps reviews": "ביקורות Google Maps",
  "Booking page": "עמוד ההזמנות",
  "Default language": "שפת ברירת מחדל",
  "Design": "עיצוב",
  "Social links": "קישורים חברתיים",
  "Profile photo": "תמונת פרופיל",
  "Gallery": "גלריה",
  "Staff": "צוות",

  // Dashboard language card
  "Dashboard language": "שפת הממשק",
  "The language this dashboard is shown in": "השפה שבה מוצג הממשק",

  // Team section
  "Team": "צוות",
  "Add team member": "הוסף איש צוות",
  "Name": "שם",
  "Role": "תפקיד",
  "Calendar color": "צבע ביומן",
  "Active": "פעיל",
  "Remove": "הסרה",
  "Let customers choose their professional": "אפשר ללקוחות לבחור איש צוות",
  "Adds a \"choose your professional\" step to your booking page": "מוסיף שלב \"בחירת איש צוות\" לעמוד ההזמנות שלך",
  "Add the people who work at your business — you'll be able to assign bookings to them and filter your calendar.": "הוסיפו את אנשי הצוות שעובדים אצלכם — תוכלו לשייך אליהם תורים ולסנן את היומן לפיהם.",
  "Failed to upload photo": "העלאת התמונה נכשלה",
  "Couldn't save. Please try again.": "לא הצלחנו לשמור. נסו שוב.",
  "Who performs this": "מי נותן שירות זה",
  "Any": "כל אחד",
};

export function translate(lang: DashboardLang, key: string): string {
  if (lang === "he") return HE[key] ?? key;
  return key;
}
