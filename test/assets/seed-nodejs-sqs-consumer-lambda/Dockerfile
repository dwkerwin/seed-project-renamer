FROM --platform=$BUILDPLATFORM public.ecr.aws/lambda/nodejs:20-arm64 AS runtime
ARG TARGETARCH
ENV TARGETARCH=${TARGETARCH}
ARG GITHUB_TOKEN

WORKDIR /var/task
# Copy package files 
COPY package*.json ./
RUN echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" > .npmrc && \
    echo "@example-org:registry=https://npm.pkg.github.com" >> .npmrc && \
    npm cache clean --force && \
    npm install && \
    npm cache clean --force && \
    rm -f .npmrc

# Copy source code
COPY . ./

CMD ["index.handler"]
