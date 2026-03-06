// utils/parseGovEwayDate.js
export function parseGovEwayDate(dateStr) {
    if (dateStr == null || typeof dateStr !== 'string') return null;
    // Expected format: DD/MM/YYYY hh:mm:ss AM|PM
    const [datePart, timePart, meridian] = dateStr.split(" ");
  
    const [day, month, year] = datePart.split("/").map(Number);
    let [hour, minute, second] = timePart.split(":").map(Number);
  
    // Convert to 24-hour format
    if (meridian === "PM" && hour !== 12) hour += 12;
    if (meridian === "AM" && hour === 12) hour = 0;
  
    // Create UTC date (Gov time is IST → UTC = IST - 5:30)
    return new Date(Date.UTC(
      year,
      month - 1,
      day,
      hour - 5,
      minute - 30,
      second
    ));
  }
  