#!/usr/bin/env bash
# Runs scripts/smoke-test-package.js against a Lambda package directory in the
# AWS Lambda Node.js 24 base image (Amazon Linux 2023, x86_64).
#
#   scripts/smoke-test-in-lambda-image.sh <package dir>...
#
# The image is pinned by digest; neither pinact nor Dependabot updates it. To
# refresh it, get the digest of public.ecr.aws/lambda/nodejs:24, e.g. with
# `docker buildx imagetools inspect public.ecr.aws/lambda/nodejs:24`.
set -euo pipefail

# public.ecr.aws/lambda/nodejs:24
LAMBDA_IMAGE=public.ecr.aws/lambda/nodejs@sha256:be4c68f4a679e86ff3539675f27aedb3fada5bd2bbf885875c0ca7c32ac6f2bd

scripts_dir="$(cd "$(dirname "$0")" && pwd)"

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <package dir>..." >&2
  exit 2
fi

for package_dir in "$@"; do
  package_dir="$(cd "$package_dir" && pwd)"
  echo "Smoke testing $package_dir"
  docker run --rm --platform linux/amd64 \
    -v "$package_dir:/var/task:ro" \
    -v "$scripts_dir:/smoke:ro" \
    --entrypoint node "$LAMBDA_IMAGE" /smoke/smoke-test-package.js /var/task
done
