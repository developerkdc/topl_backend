import axios from "axios";

export async function sendToTally(xml) {
    try {
        const response = await axios.post(
            "http://localhost:9000",
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
