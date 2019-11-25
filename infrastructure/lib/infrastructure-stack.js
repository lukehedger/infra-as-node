"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_apigateway_1 = require("@aws-cdk/aws-apigateway");
const aws_lambda_1 = require("@aws-cdk/aws-lambda");
const core_1 = require("@aws-cdk/core");
class InfrastructureStack extends core_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const ping = new aws_lambda_1.Function(this, "PingHandler", {
            runtime: aws_lambda_1.Runtime.NODEJS_10_X,
            code: aws_lambda_1.Code.fromAsset("../lambda/lib"),
            handler: "ping.handler"
        });
        new aws_apigateway_1.LambdaRestApi(this, "PingEndpoint", {
            handler: ping
        });
    }
}
exports.InfrastructureStack = InfrastructureStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmFzdHJ1Y3R1cmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmZyYXN0cnVjdHVyZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDREQUF3RDtBQUN4RCxvREFBOEQ7QUFDOUQsd0NBQTZEO0FBRTdELE1BQWEsbUJBQW9CLFNBQVEsWUFBSztJQUM1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQzFELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sSUFBSSxHQUFHLElBQUkscUJBQVEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQzdDLE9BQU8sRUFBRSxvQkFBTyxDQUFDLFdBQVc7WUFDNUIsSUFBSSxFQUFFLGlCQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQztZQUNyQyxPQUFPLEVBQUUsY0FBYztTQUN4QixDQUFDLENBQUM7UUFFSCxJQUFJLDhCQUFhLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxPQUFPLEVBQUUsSUFBSTtTQUNkLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWRELGtEQWNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGFtYmRhUmVzdEFwaSB9IGZyb20gXCJAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheVwiO1xuaW1wb3J0IHsgQ29kZSwgRnVuY3Rpb24sIFJ1bnRpbWUgfSBmcm9tIFwiQGF3cy1jZGsvYXdzLWxhbWJkYVwiO1xuaW1wb3J0IHsgQ29uc3RydWN0LCBTdGFjaywgU3RhY2tQcm9wcyB9IGZyb20gXCJAYXdzLWNkay9jb3JlXCI7XG5cbmV4cG9ydCBjbGFzcyBJbmZyYXN0cnVjdHVyZVN0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHBpbmcgPSBuZXcgRnVuY3Rpb24odGhpcywgXCJQaW5nSGFuZGxlclwiLCB7XG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18xMF9YLFxuICAgICAgY29kZTogQ29kZS5mcm9tQXNzZXQoXCIuLi9sYW1iZGEvbGliXCIpLFxuICAgICAgaGFuZGxlcjogXCJwaW5nLmhhbmRsZXJcIlxuICAgIH0pO1xuXG4gICAgbmV3IExhbWJkYVJlc3RBcGkodGhpcywgXCJQaW5nRW5kcG9pbnRcIiwge1xuICAgICAgaGFuZGxlcjogcGluZ1xuICAgIH0pO1xuICB9XG59XG4iXX0=