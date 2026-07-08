import axios from "axios";

export async function sendToTally(xml) {
    try {
        const response = await axios.post(
            // "http://localhost:9000",
            `${process.env.TALLY_URL}:${process.env.TALLY_PORT}`,
            xml,
            {
                headers: { "Content-Type": "application/xml" },
                timeout: 10000
            }
        );

        return response.data;

    } catch (err) {
        console.error("Tally Error:", err.message);
        throw err;
    }
}
