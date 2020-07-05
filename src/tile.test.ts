import { handler } from "./tile";

const noop = {} as AWSLambda.Context;

test.only("should return a tile with 200", (done) => {
  const event = ({
    pathParameters: { z: 0, x: 0, y: 0 },
  } as unknown) as AWSLambda.APIGatewayProxyEvent;
  handler(event, noop, (_0, res) => {
    expect(res.statusCode).toBe(200);
    console.log(res.body);
    done();
  });
});

test("should return a tile with 200", (done) => {
  const event = ({
    pathParameters: { z: 7, x: 114, y: 86 },
  } as unknown) as AWSLambda.APIGatewayProxyEvent;
  handler(event, noop, (_0, res) => {
    expect(res.statusCode).toBe(200);
    done();
  });
});

test("should return 200 with ", (done) => {
  const event = ({
    pathParameters: { z: 0, x: 100, y: 100 },
  } as unknown) as AWSLambda.APIGatewayProxyEvent;
  handler(event, noop, (_0, res) => {
    expect(res.statusCode).toBe(200);
    done();
  });
});
