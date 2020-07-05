import { handler } from "./metadata";

const noop = {} as AWSLambda.Context;
const event = {
  requestContext: { domainName: "localhost", stage: test },
} as any;

test("should return a metadata with 200", (done) => {
  handler(event, noop, (_0, res) => {
    expect(res.statusCode).toBe(200);
    expect(typeof JSON.parse(res.body).name).toBe("string");
    const tiles = JSON.parse(res.body).tiles;
    // expect(typeof tiles[0]).toBe("string");
    done();
  });
});
