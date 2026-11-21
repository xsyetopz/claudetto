#!/usr/bin/env bash
# Scaffold: one XML Info.plist with a nested URL scheme. Offline, deterministic.
set -euo pipefail
cat > Info.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleName</key>
	<string>Ledger</string>
	<key>CFBundleShortVersionString</key>
	<string>2.7.1</string>
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLName</key>
			<string>com.example.ledger.open</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>ledger-open</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
PLIST
