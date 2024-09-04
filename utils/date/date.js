const convDate = (date) => {
    const originalDate = new Date(date);
    const day = originalDate.getDate();
    const month = originalDate.getMonth() + 1; // Months are zero-based
    const year = originalDate.getFullYear();

    // Add leading zeros if needed
    const formattedDate = `${(day < 10 ? '0' : '') + day}-${(month < 10 ? '0' : '') + month}-${year}`;

    return formattedDate;
}


export default convDate;