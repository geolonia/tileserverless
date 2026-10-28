import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { ROUTE_METADATA_JSON, ROUTE_TILES_JSON } from "./meta";

// Checks the infrastructure settings in template.yaml that the handlers depend
// on, and the values that differ between AWS SAM and Serverless Framework
// defaults (timeout, memory, log retention).

// CloudFormation short-form tags (!Ref, !Sub, ...) as plain objects.
const CFN_TAGS = ["Ref", "Sub", "GetAtt", "Join", "Split", "Select", "If", "Equals", "Not", "And", "Or", "FindInMap", "ImportValue", "Base64", "GetAZs"];
const schema = yaml.DEFAULT_SCHEMA.extend(
  CFN_TAGS.flatMap((name) => {
    const key = name === "Ref" ? "Ref" : `Fn::${name}`;
    return (["scalar", "sequence", "mapping"] as const).map(
      (kind) => new yaml.Type(`!${name}`, { kind, construct: (data) => ({ [key]: data }) }),
    );
  }),
);

const template = yaml.load(
  fs.readFileSync(path.join(__dirname, "..", "template.yaml"), "utf8"),
  { schema },
) as any;
const globals = template.Globals.Function;
const resources = template.Resources;

const functionsByHandler = (handler: string) =>
  Object.entries<any>(resources).filter(
    ([, r]) => r.Type === "AWS::Serverless::Function" && r.Properties.Handler === handler,
  );

const routeKeysOf = (fn: any) =>
  Object.values<any>(fn.Properties.Events)
    .filter((e) => e.Type === "HttpApi")
    .map((e) => `${e.Properties.Method} ${e.Properties.Path}`)
    .sort();

const [[tileName, tileFunction]] = functionsByHandler("dist/tile.handler");
const [[metaName, metaFunction]] = functionsByHandler("dist/meta.handler");

describe("template.yaml", () => {
  it("routes tiles.json and metadata.json to the route keys the meta handler checks", () => {
    expect(routeKeysOf(metaFunction)).toEqual([ROUTE_METADATA_JSON, ROUTE_TILES_JSON].sort());
  });

  it("routes tiles with the path parameters the tile handler reads", () => {
    expect(routeKeysOf(tileFunction)).toEqual(["GET /{ver}/tiles/{z}/{x}/{y}"]);
  });

  it("attaches every route to the HTTP API", () => {
    for (const fn of [tileFunction, metaFunction]) {
      for (const event of Object.values<any>(fn.Properties.Events)) {
        expect(event.Properties.ApiId).toEqual({ Ref: "HttpApi" });
      }
    }
  });

  it("uses the $default stage, so paths have no stage prefix", () => {
    expect(resources.HttpApi.Type).toBe("AWS::Serverless::HttpApi");
    expect(resources.HttpApi.Properties.StageName).toBeUndefined();
  });

  it("allows CORS GET requests from any origin", () => {
    expect(resources.HttpApi.Properties.CorsConfiguration).toEqual({
      AllowOrigins: ["*"],
      AllowHeaders: ["Content-Type"],
      AllowMethods: ["GET"],
      MaxAge: 6000,
    });
  });

  it("points the handlers to compiled files that export a handler", () => {
    for (const fn of [tileFunction, metaFunction]) {
      const [file, exportName] = fn.Properties.Handler.split(".");
      const source = path.join(__dirname, "..", file.replace(/^dist\//, "src/") + ".ts");
      expect(fs.existsSync(source)).toBe(true);
      expect(typeof require(source)[exportName]).toBe("function");
    }
  });

  // SAM defaults to 3 seconds and 128 MB. Serverless Framework used 6 seconds
  // (not set in serverless.yml), and a shorter timeout makes #50 worse.
  it("keeps the function settings of the Serverless Framework deployment", () => {
    expect(globals.Runtime).toBe("nodejs24.x");
    expect(globals.Architectures).toEqual(["x86_64"]);
    expect(globals.Timeout).toBe(6);
    expect(globals.MemorySize).toBe(256);
  });

  it("mounts EFS at MOUNT_PATH and sets the environment the handlers read", () => {
    expect(globals.VpcConfig).toEqual({
      SecurityGroupIds: { Ref: "SecurityGroupIds" },
      SubnetIds: { Ref: "SubnetIds" },
    });
    expect(Object.keys(globals.Environment.Variables).sort()).toEqual(["CLOUDFRONT_DOMAIN_NAME", "MOUNT_PATH"]);
    for (const fn of [tileFunction, metaFunction]) {
      expect(fn.Properties.FileSystemConfigs).toHaveLength(1);
      expect(fn.Properties.FileSystemConfigs[0].LocalMountPath).toBe(globals.Environment.Variables.MOUNT_PATH);
      expect(fn.Properties.Role).toEqual({ "Fn::GetAtt": "LambdaRole.Arn" });
    }
  });

  it("allows the role to use the VPC and mount the EFS access point", () => {
    const role = resources.LambdaRole.Properties;
    expect(role.ManagedPolicyArns).toEqual([
      { "Fn::Sub": "arn:${AWS::Partition}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole" },
    ]);
    const statements = role.Policies.flatMap((p: any) => p.PolicyDocument.Statement);
    expect(statements).toContainEqual(expect.objectContaining({
      Effect: "Allow",
      Action: ["elasticfilesystem:ClientMount", "elasticfilesystem:ClientWrite"],
    }));
  });

  it("keeps the logs of each function for 30 days", () => {
    for (const name of [tileName, metaName]) {
      const logGroups = Object.values<any>(resources).filter(
        (r) => r.Type === "AWS::Logs::LogGroup" && r.Properties.LogGroupName["Fn::Sub"] === `/aws/lambda/\${${name}}`,
      );
      expect(logGroups).toHaveLength(1);
      expect(logGroups[0].Properties.RetentionInDays).toBe(30);
    }
  });

  it("outputs HttpApiId, which tileserverless-infra uses for the CloudFront origin", () => {
    expect(template.Outputs.HttpApiId.Value).toEqual({ Ref: "HttpApi" });
  });
});
