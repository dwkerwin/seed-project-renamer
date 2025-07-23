# Stage 1: Build Environment
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
ARG TARGETARCH
ENV TARGETARCH=${TARGETARCH}
ARG NUGET_AUTH_TOKEN
ENV NUGET_AUTH_TOKEN=${NUGET_AUTH_TOKEN}
ARG GITHUB_USERNAME
ENV GITHUB_USERNAME=${GITHUB_USERNAME}
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=${GITHUB_TOKEN}
ARG PFX_PASSWORD=12selfsigned34
ENV PFX_PASSWORD=${PFX_PASSWORD}
WORKDIR /app

# Copy project files
COPY *.csproj ./

# Generate NuGet.config from template
COPY nuget.config.template ./
RUN sed -e "s/%GITHUB_USERNAME%/${GITHUB_USERNAME}/g" \
        -e "s/%NUGET_AUTH_TOKEN%/${NUGET_AUTH_TOKEN}/g" \
        nuget.config.template > nuget.config

# Clean NuGet cache to avoid corrupted packages
RUN dotnet nuget locals all --clear

# Restore dependencies
RUN dotnet restore --configfile /app/nuget.config

# Copy the remaining source code
COPY . ./

RUN mkdir -p /app/certs && \
    # Generate the certificate and private key
	openssl req -x509 -newkey rsa:2048 \
	-keyout /app/certs/localhost.key \
	-out /app/certs/localhost.cer \
	-days 1460 -nodes -subj "/C=US/ST=Pennsylvania/L=Oxford Valley/O=YourOrg/CN=localhost" && \
    # Convert the certificate and private key into a PFX file
    openssl pkcs12 -export \
    -out /app/certs/localhost.pfx \
    -inkey /app/certs/localhost.key \
    -in /app/certs/localhost.cer \
    -passout pass:${PFX_PASSWORD}

# Build and publish the project
RUN dotnet publish SeedDotnetRestapiEcsFargate.csproj -c Release -o /app/out/api --runtime linux-${TARGETARCH} --self-contained false -p:PublishReadyToRun=true

# Stage 2: Runtime Image with ASP.NET Core
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/aspnet:8.0
ARG PFX_PASSWORD=12selfsigned34
ENV PFX_PASSWORD=${PFX_PASSWORD}
WORKDIR /app

# Copy the published application and certificate from the build stage
COPY --from=build-env /app/out/api ./
COPY --from=build-env /app/certs/localhost.pfx ./certs/localhost.pfx

# Set appropriate permissions for the certificate
RUN chmod 600 ./certs/localhost.pfx

# Expose necessary ports
EXPOSE 8080
EXPOSE 8081

# Set environment variables for ASP.NET Core HTTPS configuration
ENV ASPNETCORE_URLS=https://+:8081;http://+:8080
ENV ASPNETCORE_KESTREL__ENDPOINTS__HTTP__URL=http://0.0.0.0:8080
ENV ASPNETCORE_KESTREL__ENDPOINTS__HTTPS__URL=https://0.0.0.0:8081
ENV ASPNETCORE_Kestrel__Certificates__Default__Path=/app/certs/localhost.pfx
ENV ASPNETCORE_Kestrel__Certificates__Default__Password=${PFX_PASSWORD}

# Entry point to run the application
ENTRYPOINT ["dotnet", "SeedDotnetRestapiEcsFargate.dll"]
