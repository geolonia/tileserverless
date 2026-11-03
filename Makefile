# Build targets for `sam build` (BuildMethod: makefile).
#
# The functions use sqlite3, a native module, so they are not bundled. Each
# artifact holds the compiled `dist/` (run `yarn build` before `sam build`)
# and the production dependencies installed from yarn.lock. The build must run
# on Linux x86_64 (as CI does) so that the sqlite3 binary matches the Lambda
# runtime; a package built elsewhere would fail on Lambda.

.PHONY: build-TileFunction build-MetaFunction

build-TileFunction build-MetaFunction:
	@[ "$$(uname -s)" = Linux ] && [ "$$(uname -m)" = x86_64 ] || { echo "Build on Linux x86_64: the package contains a native sqlite3 binary for Lambda." >&2; exit 1; }
	test -d dist || { echo "dist/ not found. Run 'yarn build' first." >&2; exit 1; }
	mkdir -p "$(ARTIFACTS_DIR)"
	cp -R dist package.json yarn.lock "$(ARTIFACTS_DIR)/"
	cd "$(ARTIFACTS_DIR)" && yarn install --frozen-lockfile --production --non-interactive
