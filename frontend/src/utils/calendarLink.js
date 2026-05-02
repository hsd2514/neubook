/**
 * Build a prefilled Google Calendar "Add to Calendar" URL.
 *
 * No OAuth, no backend — opens calendar.google.com with pre-filled event details.
 *
 * @param {Object} params
 * @param {string} params.title       Event title
 * @param {string} params.description Event description
 * @param {string} [params.location]    Location (optional)
 * @param {string} params.startTime   ISO 8601 start time
 * @param {string} params.endTime     ISO 8601 end time
 * @returns {string} Google Calendar URL
 */
export function buildGoogleCalendarLink({ title, description, location, startTime, endTime }) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new TypeError("Invalid startTime or endTime");
  }

  // Convert any timezone to UTC, then format as YYYYMMDDTHHMMSSZ
  function toGcalUtc(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      "T" +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      "Z"
    );
  }

  const dates = `${toGcalUtc(start)}/${toGcalUtc(end)}`;

  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    dates,
  });

  if (location && location.trim()) {
    query.set("location", location.trim());
  }

  return `https://calendar.google.com/calendar/render?${query}`;
}
