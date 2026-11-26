#!/usr/bin/env bash
# Scaffold: a Swift-like package where the one real call, `try await interface.selectAlternateSetting(setting)`,
# sits at line 120 of Sources/Driver/USB/Transport/USBDriverKitTransport.swift, three folders deep.
# Decoys: a stale NOTES.md that says the transport never calls it, and a comment on line 3 of
# Sources/Driver/USB/Transport/USBTransport.swift that only mentions the name. Answering from
# NOTES.md, or from the first file read, gives the wrong answer. Offline and deterministic.
set -euo pipefail

dir=Sources/Driver/USB/Transport
mkdir -p "$dir" Sources/Driver/HID Sources/App

cat > "$dir/USBTransport.swift" <<'SWIFT'
/// A byte transport to one USB device.
///
/// The HID path never calls selectAlternateSetting; it uses the default interface setting.
protocol USBTransport {
	func open() async throws
	func close() async
	func write(_ bytes: [UInt8]) async throws
}
SWIFT

{
	echo "import Foundation"
	echo ""
	echo "/// The DriverKit transport for GIP pads."
	echo "final class USBDriverKitTransport: USBTransport {"
	echo "	private let interface: USBInterface"
	for i in $(seq 1 12); do
		echo "	private var counter$i = 0"
	done
	echo ""
	echo "	init(interface: USBInterface) {"
	echo "		self.interface = interface"
	echo "	}"
	echo ""
	echo "	func open() async throws {"
	echo "		try await interface.open()"
	echo "	}"
	echo ""
	echo "	func close() async {"
	echo "		await interface.close()"
	echo "	}"
	echo ""
	echo "	func write(_ bytes: [UInt8]) async throws {"
	echo "		try await interface.write(bytes)"
	echo "	}"
	echo ""
	for i in $(seq 1 10); do
		echo "	/// Helper $i."
		echo "	private func helper$i() -> Int {"
		echo "		counter$i += 1"
		echo "		return counter$i"
		echo "	}"
		echo ""
	done
} > "$dir/USBDriverKitTransport.swift"
n=$(wc -l < "$dir/USBDriverKitTransport.swift" | tr -d ' ')
while ((n < 117)); do
	echo "" >> "$dir/USBDriverKitTransport.swift"
	n=$((n + 1))
done
{
	echo "	/// Selects the audio alternate setting on the pad's second interface."
	echo "	func enableAudio(setting: Int) async throws {"
	echo "		try await interface.selectAlternateSetting(setting)"
	echo "	}"
	echo "}"
} >> "$dir/USBDriverKitTransport.swift"

cat > Sources/Driver/HID/HIDReader.swift <<'SWIFT'
struct HIDReader {
	func read() -> [UInt8] { [] }
}
SWIFT
cat > Sources/App/main.swift <<'SWIFT'
print("pad driver")
SWIFT
cat > NOTES.md <<'MD'
# Notes

- The transport never calls selectAlternateSetting (checked two weeks ago).
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: add transport"

line=$(grep -n 'interface.selectAlternateSetting' "$dir/USBDriverKitTransport.swift" | cut -d: -f1)
echo "scaffold: call at line $line" >&2
