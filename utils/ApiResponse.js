class ApiResponse {
    constructor(statusCode,message, result = []) {
        this.statusCode = statusCode;
        this.success = statusCode < 400;
        this.message = message;
        this.result = result;
    }
};

export default ApiResponse;