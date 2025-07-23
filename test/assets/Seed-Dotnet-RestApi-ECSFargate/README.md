# .NET Core REST API ECS Fargate Seed Project

This is a seed project for building .NET Core REST APIs that run on ECS Fargate.

Features:
- RESTful API built with .NET Core
- Complete infrastructure setup using Terraform
- Containerized application running on ECS Fargate
- Secure deployment in private subnets
- Docker containerization
- Swagger API documentation at /api/docs
- Environment variable management using dotenv (.env.dev file support)
- Health check endpoints
- GitHub Actions CICD and Manual Deploy workflows
- Cross-Origin Resource Sharing (CORS) configured for your organization's subdomains
- Unit tests with xUnit
- Configurable logging with LOG_LEVEL environment variable

### Getting Started: Creating a New Service From The Seed Project

Follow these steps **in order** to create and set up a new service from this seed project:

**Step 1: Local Setup First**
```shell
# Clone and rename locally
git clone https://github.com/yourusername/Seed-Dotnet-RestApi-ECSFargate.git my-new-service-name
cd my-new-service-name
rm -rf .git
git init
npx @dwkerwin/seed-project-renamer --from Seed-Dotnet-RestApi-ECSFargate your-new-project-name
```

**Step 2: Update Project Files**
1. Update your README.md with service description
2. Run `dotnet restore` in the service directory

**Step 3: Create GitHub Repository** 
- Create new repo on GitHub
- **Important:** Do NOT initialize with README (avoids conflicts)

**Step 4: Connect Local to Remote**
```shell
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/your-new-service-name.git
git push -u origin main
```

## Build and Run Locally

```shell
# if PLATFORM or TARGETARCH envars were set for a previous docker build,
# they will interfere with local builds
unset PLATFORM && unset TARGETARCH
# restore, build and run
dotnet restore
dotnet build
dotnet run
```

You can also set the log level when running the application:

```shell
# Run with Debug level logging (CORRECT WAY)
LOG_LEVEL=Debug dotnet run

# IMPORTANT: Do NOT use the following format, as it won't work:
# LOG_LEVEL=Debug && dotnet run    # WRONG - variable not passed to dotnet process
```

The API will be running locally on:
- HTTPS: https://localhost:8081 (primary endpoint)
- HTTP: http://localhost:8080 (redirects to HTTPS)

To test:

```shell
# Test the main HTTPS endpoint (use -k to skip certificate validation for self-signed cert)
curl -k https://localhost:8081/api/health
# Should return: {"status":"Healthy"}

# Test the "up" endpoint
curl -k https://localhost:8081/api/health/up

# Note: The HTTP endpoint will redirect to HTTPS
# curl http://localhost:8080/api/health  # Will return a 307 redirect
```

You can access the Swagger API documentation at https://localhost:8081/api/docs

## Running Tests

The project includes unit tests using xUnit. To run the tests:

```shell
unset PLATFORM && unset TARGETARCH

# Run all tests
dotnet test SeedDotnetRestapiEcsFargate.sln

# Run specific tests with filter 
dotnet test SeedDotnetRestapiEcsFargate.sln --filter "FullyQualifiedName~HealthControllerTests"
```

## Docker Support

### Build in Docker

```shell
# One-time setup for docker buildx to build on multiple architectures.
docker buildx create --use
docker buildx inspect --bootstrap

# Set target platform (Use linux/arm64 on M1 macOS systems.)
export PLATFORM=linux/amd64 && TARGETARCH=$PLATFORM # or linux/arm64

# Grab the GitHub credentials from the workstation's local global nuget
# config, where your personal access token should be stored with the
# "packages: read" permission.
export GITHUB_USERNAME=$(xmllint --xpath "string(//packageSourceCredentials/github/add[@key='Username']/@value)" ~/.config/NuGet/NuGet.Config)
export NUGET_AUTH_TOKEN=$(xmllint --xpath "string(//packageSourceCredentials/github/add[@key='ClearTextPassword']/@value)" ~/.config/NuGet/NuGet.Config)

# First, navigate to the project directory
cd SeedDotnetRestapiEcsFargate

# Build the image with buildx
docker buildx build \
    --platform $PLATFORM \
    --build-arg GITHUB_USERNAME=$GITHUB_USERNAME \
    --build-arg NUGET_AUTH_TOKEN=$NUGET_AUTH_TOKEN \
    --build-arg GITHUB_TOKEN=$GITHUB_TOKEN \
    -t seed-dotnet-restapi-ecsfargate:latest \
    --load .
```

### Run in Docker

```shell
# Platform must match project's RuntimeIdentifier or BadImageFormatException will be thrown.
export PLATFORM=linux/amd64 # or linux/arm64 if you're running a Mac. 
docker run -it --rm --platform=$PLATFORM -p 8080:8080 -p 8081:8081 \
    -v ~/.aws/:/root/.aws/ \
    --env-file .env.dev \
    seed-dotnet-restapi-ecsfargate:latest

# Test the HTTPS endpoint (use -k to skip certificate validation)
curl -k https://localhost:8081/api/health
# Should return: {"status":"Healthy"}

# Note: HTTP endpoint will redirect to HTTPS
# curl http://localhost:8080/api/health  # Will return a 307 redirect
```

### AWS Deployment via Terraform

Deploy the API to AWS using Terraform:

```shell
cd SeedDotnetRestapiEcsFargate/terraform
export AWS_ENV="dev" && export AWS_PROFILE="aug$AWS_ENV"

# 🚨 PAY ATTENTION! 🚨
# THIS IS REALLY IMPORTANT:
# 
# BEFORE YOU RUN 'terraform init', CHANGE THE 'TF_KEY' BELOW TO SOMETHING
# UNIQUE!  IF YOU DON'T, YOU WILL OVERWRITE THE STATE OF THIS PROJECT AND
# CAUSE A DISASTER.  WE'RE TALKING FULL-ON TERRAFORM MAYHEM, AND YES, I
# WILL SAY "TOLD YOU SO."
#
# ALSO, update the 'tf_backend_config_key' in the .github/workflows/cicd.yml
# file to the same value. While there also update the 'image_name' to match
# the docker image of this service (should match your 'image_name' value in
# your 'env-{dev/qa/prod}.tfvars' files).
export TF_KEY="seed-dotnet-restapi-ecsfargate"

# always delete the .terraform directory first, and re-init
rm -rf .terraform
# configure the tf backend (remote-state)
terraform init \
    -backend-config="bucket=yourorg-tfstate-${AWS_ENV}" \
    -backend-config="key=${TF_KEY}/terraform.tfstate" \
    -backend-config="region=us-east-1" \
    -backend-config="dynamodb_table=tfstate_${AWS_ENV}"
# apply
terraform apply -var-file env-$AWS_ENV.tfvars
```

## Accessing the API in AWS

Once deployed to AWS, the API is accessible at:

```shell
# Replace 'dev' with desired environment - health endpoint shown as example
https://seed-dotnet-restapi-ecsfargate.aws-dev.yourorg.com/api/health
```

Swagger API documentation is available at:
```
https://seed-dotnet-restapi-ecsfargate.aws-{env}.yourorg.com/api/docs
```

### LOG_LEVEL Values

The LOG_LEVEL environment variable accepts the following values (case-insensitive):

| Log Level | Aliases | Description |
|-----------|---------|-------------|
| Verbose | none | Most detailed logging, includes all messages |
| Debug | none | Detailed information useful for debugging |
| Information | info | General information about application progress |
| Warning | warn | Potential issues that don't prevent the application from working |
| Error | err | Issues that prevent specific operations from working |
| Fatal | critical | Critical errors that cause the application to crash |

If an invalid value is provided, the application will default to the "Information" level and log a warning message.
