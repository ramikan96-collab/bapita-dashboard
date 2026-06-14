export const en = {
  hero: { cta: "Book Appointment" },
  services: { title: "Services", book: "Book →" },
  gallery: { title: "Gallery" },
  about: { title: "About" },
  hours: { title: "Hours", closed: "Closed" },
  location: { title: "Location", directions: "Get Directions →" },
  footer: { poweredBy: "Powered by", brand: "Bapita" },
  overlay: {
    stepOf: (n: number, t: number) => `${n} of ${t}`,
  },
  steps: {
    service: { title: "Choose a service" },
    date: { title: "Choose a date" },
    time: { title: "Choose a time", noSlots: "No available times" },
    contact: {
      title: "Your details",
      name: "Full name *",
      namePlaceholder: "Your name",
      phone: "Phone *",
      phonePlaceholder: "05X-XXX-XXXX",
      email: "Email (optional)",
      emailPlaceholder: "you@example.com",
      confirm: "Confirm Booking",
    },
    success: {
      title: "Booking confirmed!",
      seeYou: (name: string) => `See you soon, ${name}.`,
      addToCalendar: "Add to Calendar",
    },
  },
  calendar: {
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    weekDays: ["Su","Mo","Tu","We","Th","Fr","Sa"],
  },
};
