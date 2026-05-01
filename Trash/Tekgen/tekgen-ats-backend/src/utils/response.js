// Standard API response format
const sendResponse = (res, statusCode, success, data = null, message = null) => {
  const response = {
    success,
    statusCode,
    data,
  };

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
};

const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  sendResponse(res, statusCode, true, data, message);
};

const sendError = (res, message = 'Error', statusCode = 500, data = null) => {
  sendResponse(res, statusCode, false, data, message);
};

module.exports = {
  sendResponse,
  sendSuccess,
  sendError,
};
