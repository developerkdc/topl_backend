const STATE_CODES = [
  { code: 1,  name: "JAMMU AND KASHMIR" },
  { code: 2,  name: "HIMACHAL PRADESH" },
  { code: 3,  name: "PUNJAB" },
  { code: 4,  name: "CHANDIGARH" },
  { code: 5,  name: "UTTARAKHAND" },
  { code: 6,  name: "HARYANA" },
  { code: 7,  name: "DELHI" },
  { code: 8,  name: "RAJASTHAN" },
  { code: 9,  name: "UTTAR PRADESH" },
  { code: 10, name: "BIHAR" },
  { code: 11, name: "SIKKIM" },
  { code: 12, name: "ARUNACHAL PRADESH" },
  { code: 13, name: "NAGALAND" },
  { code: 14, name: "MANIPUR" },
  { code: 15, name: "MIZORAM" },
  { code: 16, name: "TRIPURA" },
  { code: 17, name: "MEGHALAYA" },
  { code: 18, name: "ASSAM" },
  { code: 19, name: "WEST BENGAL" },
  { code: 20, name: "JHARKHAND" },
  { code: 21, name: "ODISHA" },
  { code: 22, name: "CHHATTISGARH" },
  { code: 23, name: "MADHYA PRADESH" },
  { code: 24, name: "GUJARAT" },
  { code: 25, name: "DAMAN AND DIU" },
  { code: 26, name: "DADRA AND NAGAR HAVELI" },
  { code: 27, name: "MAHARASHTRA" },
  { code: 29, name: "KARNATAKA" },
  { code: 30, name: "GOA" },
  { code: 31, name: "LAKSHADWEEP" },
  { code: 32, name: "KERALA" },
  { code: 33, name: "TAMIL NADU" },
  { code: 34, name: "PUDUCHERRY" },
  { code: 35, name: "ANDAMAN AND NICOBAR" },
  { code: 36, name: "TELANGANA" },
  { code: 37, name: "ANDHRA PRADESH" },
  { code: 38, name: "LADAKH" },
  { code: 96, name: "OTHER COUNTRIES" },
  { code: 97, name: "Other Territory" },
  { code: 99, name: "OTHER COUNTRIES" }
];

/**
 * Get state code from state name
 * @param {string} stateName - The name of the state
 * @returns {string|null} - The state code as a zero-padded 2-digit string, or null if not found
 */
export function getStateCode(stateName) {
  if (!stateName) return null;
  const state = STATE_CODES.find(
    (s) => s.name.toUpperCase() === stateName.toUpperCase()
  );
  return state ? state.code : null;
}

export { STATE_CODES };

export const getStateCodeAsString = (stateName) => {
  const code = getStateCode(stateName);
  if (code === null || code === undefined) {
    return '29';
  }
  return String(code).padStart(2, '0');
};
