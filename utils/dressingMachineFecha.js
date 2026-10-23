import { format_date } from './constants.js';

const ISO_DATE = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;

/** MDB / machine raw upload: supports yyyy-mm-dd before format_date (avoids Excel-serial misparsing). */
export const parse_dressing_machine_fecha = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const match = ISO_DATE.exec(value.trim());
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return format_date(value);
};
