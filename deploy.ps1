# Build package
Remove-Item -Recurse -Force deployment-package;
New-Item -ItemType Directory deployment-package;
Copy-Item package.json -Destination deployment-package;
Copy-Item execution-handler.js -Destination deployment-package;
cd deployment-package;
npm install --production;

# Deploy package
sam package --template-file ..\template.yaml --s3-bucket bdzevel-lambdas --output-template-file output-template.yaml;

$stacks = aws cloudformation list-stacks --stack-status-filter "CREATE_FAILED" "ROLLBACK_FAILED" "ROLLBACK_COMPLETE" | ConvertFrom-Json;
$existingStack = $stacks.StackSummaries | Where-Object { $_.StackName -eq "slack-pr-reminder" }
if ($existingStack) {
  aws cloudformation delete-stack --stack-name "slack-pr-reminder";
  aws cloudformation wait stack-delete-complete --stack-name "slack-pr-reminder";
}

sam deploy --template-file output-template.yaml --stack-name slack-pr-reminder --capabilities CAPABILITY_IAM;

# Reset user original dir
cd ..;