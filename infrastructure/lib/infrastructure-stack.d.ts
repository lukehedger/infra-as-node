import { CfnParametersCode } from "@aws-cdk/aws-lambda";
import { Construct, Stack, StackProps } from "@aws-cdk/core";
export declare class InfrastructureStack extends Stack {
    readonly lambdaCode: CfnParametersCode;
    constructor(scope: Construct, id: string, props?: StackProps);
}
