export const displayDateFun = (originalDateString) => {
  const date = new Date(originalDateString);
  if (!originalDateString) return;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Month starts from 0
  const year = String(date.getFullYear()).slice(2);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
};
