aws_env = "dev"
region  = "us-east-1"
image_name="example-org/seed-nodejs-sqs-consumer-lambda"
enable_sns_delivery_logging = true
log_level = "debug"
vpc_id="vpc-12345678901234567"
private_subnets = [
    "subnet-11111111111111111",
    "subnet-22222222222222222",
    "subnet-33333333333333333"
]
