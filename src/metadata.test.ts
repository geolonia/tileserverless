import { handler } from "./metadata";

const noop = {} as AWSLambda.Context;
const event = {} as AWSLambda.APIGatewayProxyEvent;

test("should return a metadata with 200", (done) => {
  handler(event, noop, (_0, res) => {
    expect(res.statusCode).toBe(200);
    expect(typeof JSON.parse(res.body).name).toBe("string");
    done();
  });
});
