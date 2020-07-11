import { handler } from "./tile";

const noop = {} as AWSLambda.Context;

test("should return a tile with 200", (done) => {
  const event = ({
    pathParameters: { proxy: "0/0/0.mvt" },
  } as unknown) as AWSLambda.APIGatewayProxyEvent;
  handler(event, noop, (_0, res) => {
    expect(res.statusCode).toBe(200);
    done();
  });
});

test("should return a tile with 200", (done) => {
  const event = ({
    pathParameters: { proxy: "13/7164/3227.mvt" },
  } as unknown) as AWSLambda.APIGatewayProxyEvent;
  handler(event, noop, (_0, res) => {
    expect(res.statusCode).toBe(200);
    done();
  });
});

test("should return a tile with 200", (done) => {
  const event = ({
    pathParameters: { proxy: "0/100/100.mvt" },
  } as unknown) as AWSLambda.APIGatewayProxyEvent;
  handler(event, noop, (_0, res) => {
    expect(res.statusCode).toBe(200);
    done();
  });
});
