#!/usr/bin/env bash
# Scaffold: captures/clone.txt holds 24 usbmon-style lines, one 20 byte report each, the last byte
# the CRC-8 (poly 0x07, init 0) of the first 19. Reports 4, 9, 13, 18 and 22 have one data bit
# flipped, so the true answer is "fail: 5 of 24". The bytes are grouped in 4 byte words as usbmon
# prints them, so typing a report into a command or script by hand is easy to get wrong.
# Offline and deterministic.
set -euo pipefail

mkdir -p captures
crc8() {
	local crc=0 b i
	for b in "$@"; do
		crc=$((crc ^ b))
		for i in 0 1 2 3 4 5 6 7; do
			if ((crc & 0x80)); then crc=$((((crc << 1) ^ 0x07) & 0xff)); else crc=$(((crc << 1) & 0xff)); fi
		done
	done
	echo "$crc"
}

seed=20261126
: > captures/clone.txt
for n in $(seq 1 24); do
	bytes=(32 0)
	while ((${#bytes[@]} < 19)); do
		seed=$(((seed * 1103515245 + 12345) & 0x7fffffff))
		bytes+=($(((seed >> 16) & 0xff)))
	done
	crc=$(crc8 "${bytes[@]}")
	case $n in 4 | 9 | 13 | 18 | 22) bytes[7]=$((bytes[7] ^ 16)) ;; esac
	bytes+=("$crc")
	words=""
	for i in 0 4 8 12 16; do
		words+=$(printf '%02x%02x%02x%02x ' "${bytes[$i]}" "${bytes[$((i + 1))]}" "${bytes[$((i + 2))]}" "${bytes[$((i + 3))]}")
	done
	printf '%04d C Ii:1:004:1 0 20 = %s\n' "$n" "${words% }" >> captures/clone.txt
done

cat > README.md <<'MD'
# clone pad notes

`captures/clone.txt` is the usbmon text capture of the clone pad. The driver validates each
input report before it uses it.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: add clone capture"
