export function formatDate(dateTimeString) {

    if (!dateTimeString) return "";

    const date = new Date(dateTimeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Month starts from 0
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}
