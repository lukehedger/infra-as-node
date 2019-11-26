"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_apigateway_1 = require("@aws-cdk/aws-apigateway");
const aws_lambda_1 = require("@aws-cdk/aws-lambda");
const core_1 = require("@aws-cdk/core");
class InfrastructureStack extends core_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.lambdaCode = aws_lambda_1.Code.cfnParameters();
        const ping = new aws_lambda_1.Function(this, "PingHandler", {
            code: this.lambdaCode,
            handler: "ping.handler",
            runtime: aws_lambda_1.Runtime.NODEJS_10_X
        });
        new aws_apigateway_1.LambdaRestApi(this, "PingEndpoint", {
            handler: ping
        });
    }
}
exports.InfrastructureStack = InfrastructureStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmFzdHJ1Y3R1cmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmZyYXN0cnVjdHVyZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDREQUF3RDtBQUN4RCxvREFLNkI7QUFDN0Isd0NBQTZEO0FBRTdELE1BQWEsbUJBQW9CLFNBQVEsWUFBSztJQUc1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQzFELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxVQUFVLEdBQUcsaUJBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUV2QyxNQUFNLElBQUksR0FBRyxJQUFJLHFCQUFRLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUM3QyxJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDckIsT0FBTyxFQUFFLGNBQWM7WUFDdkIsT0FBTyxFQUFFLG9CQUFPLENBQUMsV0FBVztTQUM3QixDQUFDLENBQUM7UUFFSCxJQUFJLDhCQUFhLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxPQUFPLEVBQUUsSUFBSTtTQUNkLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWxCRCxrREFrQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMYW1iZGFSZXN0QXBpIH0gZnJvbSBcIkBhd3MtY2RrL2F3cy1hcGlnYXRld2F5XCI7XG5pbXBvcnQge1xuICBDZm5QYXJhbWV0ZXJzQ29kZSxcbiAgQ29kZSxcbiAgRnVuY3Rpb24sXG4gIFJ1bnRpbWVcbn0gZnJvbSBcIkBhd3MtY2RrL2F3cy1sYW1iZGFcIjtcbmltcG9ydCB7IENvbnN0cnVjdCwgU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xuXG5leHBvcnQgY2xhc3MgSW5mcmFzdHJ1Y3R1cmVTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGxhbWJkYUNvZGU6IENmblBhcmFtZXRlcnNDb2RlO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgdGhpcy5sYW1iZGFDb2RlID0gQ29kZS5jZm5QYXJhbWV0ZXJzKCk7XG5cbiAgICBjb25zdCBwaW5nID0gbmV3IEZ1bmN0aW9uKHRoaXMsIFwiUGluZ0hhbmRsZXJcIiwge1xuICAgICAgY29kZTogdGhpcy5sYW1iZGFDb2RlLFxuICAgICAgaGFuZGxlcjogXCJwaW5nLmhhbmRsZXJcIixcbiAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuTk9ERUpTXzEwX1hcbiAgICB9KTtcblxuICAgIG5ldyBMYW1iZGFSZXN0QXBpKHRoaXMsIFwiUGluZ0VuZHBvaW50XCIsIHtcbiAgICAgIGhhbmRsZXI6IHBpbmdcbiAgICB9KTtcbiAgfVxufVxuIl19