class ApiResponse {
    constructor(statusCode, success, message, result = []) {
        this.statusCode = statusCode;
        this.success = success ?? statusCode < 400;
        this.message = message;
        this.result = result;
    }
};

export default ApiResponse;