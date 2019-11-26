import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CfnParametersCode } from "@aws-cdk/aws-lambda";
export interface PipelineStackProps extends StackProps {
    readonly lambdaCode: CfnParametersCode;
}
export declare class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: PipelineStackProps);
}
