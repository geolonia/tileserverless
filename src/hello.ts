const response = {
  statusCode: 200,
  headers: {
    "X-Geolonia-Text": "test",
  },
  body: JSON.stringify({ hello: "world" }),
};

export const asyncHandler = async (_0: any, _1: any) => {
  return response;
};

export const syncHandler = (_0: any, _1: any, callback: AWSLambda.Callback) => {
  return callback(null, response);
};
