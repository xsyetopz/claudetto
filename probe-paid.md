# Handover probe (paid API)

### Arm A: never compact: handoff and clear at each task boundary

Expected: 3 clears with handoffs. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | ok | 3 clears, 0 compactions, 0 handovers | 9/10, lost q9-migrations |
| 2 | ok | 3 clears, 0 compactions, 0 handovers | 10/10 |
| 3 | ok | 3 clears, 0 compactions, 0 handovers | 10/10 |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | clear | 9 | 32909 | event | main | req_011CgsftWPhyCPx9AcZYhWwX | 32320 | 0 | 585 | 1608 |
| run 1 |  |  | 26556 | +1 | main | req_011CgsfugvFD3YTiXTf5o1xK | 24321 | 0 | 2233 | 173 |
| run 1 |  |  | 884 | +2 | other | req_011CgsfurjrcHX4q2nH1eSGh | 0 | 0 | 0 | 205 |
| run 1 |  |  | 27666 | +3 | main | req_011Cgsfuryk5FTkDsc9FToEg | 26554 | 0 | 1110 | 909 |
| run 1 | clear | 19 | 44534 | event | main | req_011Cgsg9jfbbogZN4ddFGapm | 44080 | 0 | 452 | 1776 |
| run 1 |  |  | 26944 | +1 | main | req_011CgsgAv2DeUKv5eGtJmQpU | 24321 | 0 | 2621 | 143 |
| run 1 |  |  | 889 | +2 | other | req_011CgsgB5LYoDxAMDG6t31NC | 0 | 0 | 0 | 193 |
| run 1 |  |  | 28062 | +3 | main | req_011CgsgB5YCxEiF8Z778RmCR | 26942 | 0 | 1118 | 176 |
| run 1 | clear | 29 | 36904 | event | main | req_011CgsgKThBPB4WrP9QxNBnT | 36511 | 0 | 391 | 1754 |
| run 1 |  |  | 26964 | +1 | main | req_011CgsgLRrLboLSamyPqEoN3 | 24321 | 0 | 2641 | 171 |
| run 1 |  |  | 882 | +2 | other | req_011CgsgLabgzY9yHXT134YZW | 0 | 0 | 0 | 239 |
| run 1 |  |  | 28066 | +3 | main | req_011CgsgLaksEmvhxvz63wiZZ | 26962 | 0 | 1102 | 352 |
| run 2 | clear | 9 | 28685 | event | main | req_011Cgsge6PoKxEemxjFcQRdW | 28244 | 0 | 437 | 1032 |
| run 2 |  |  | 26349 | +1 | main | req_011CgsgeoU6rUJRH7fDTME93 | 24321 | 0 | 2026 | 144 |
| run 2 |  |  | 884 | +2 | other | req_011CgsgexCD3MRnfR1etZBuH | 0 | 0 | 0 | 190 |
| run 2 |  |  | 27561 | +3 | main | req_011CgsgexJuPpM59vpAw3o9v | 26347 | 0 | 1212 | 464 |
| run 2 | clear | 19 | 47806 | event | main | req_011CgsgumfNg1bwM2rvfahPs | 47321 | 0 | 483 | 1731 |
| run 2 |  |  | 26803 | +1 | main | req_011Cgsgvvw19DB9aVKmPLzKW | 24321 | 0 | 2480 | 121 |
| run 2 |  |  | 27758 | +2 | main | req_011Cgsgw47cWGhaikD29xUFq | 26801 | 0 | 955 | 219 |
| run 2 |  |  | 886 | +3 | other | req_011CgsgwDSw4ghWXeQ56wq2A | 0 | 0 | 0 | 175 |
| run 2 | clear | 29 | 38781 | event | main | req_011Cgsh6d2Gef3v9r5rSJcHH | 38327 | 0 | 452 | 2201 |
| run 2 |  |  | 26842 | +1 | main | req_011Cgsh7wmR4o1q6TDujcRwT | 24321 | 0 | 2519 | 148 |
| run 2 |  |  | 27827 | +2 | main | req_011Cgsh85KbSy4fYQn3uQsQ8 | 26840 | 0 | 985 | 196 |
| run 2 |  |  | 879 | +3 | other | req_011Cgsh8FdxFXyd1afmorNF9 | 0 | 0 | 0 | 214 |
| run 3 | clear | 9 | 30476 | event | main | req_011CgshMQHDvjXBUKRyxo8mp | 29941 | 0 | 531 | 1371 |
| run 3 |  |  | 26448 | +1 | main | req_011CgshNQPT2xXff51bARbHk | 24321 | 0 | 2125 | 180 |
| run 3 |  |  | 27566 | +2 | main | req_011CgshNZj2969ZJL4Mo1K2s | 26446 | 0 | 1118 | 183 |
| run 3 |  |  | 887 | +3 | other | req_011CgshNZcacS8wJbP6QFxqi | 0 | 0 | 0 | 480 |
| run 3 | clear | 19 | 47420 | event | main | req_011Cgshdw8JcL8Rk9TE3SfdA | 46982 | 0 | 436 | 2654 |
| run 3 |  |  | 27253 | +1 | main | req_011Cgshfdkr9uNzihKT3XSsQ | 24321 | 0 | 2930 | 123 |
| run 3 |  |  | 28351 | +2 | main | req_011CgshfmCKXUSEEcKFoiy2H | 27251 | 0 | 1098 | 218 |
| run 3 |  |  | 891 | +3 | other | req_011Cgshfm7rwbkwxiekoTyB6 | 0 | 0 | 0 | 384 |
| run 3 | clear | 29 | 39906 | event | main | req_011CgshqLotnQWPV2f2sgrMx | 39707 | 0 | 197 | 2332 |
| run 3 |  |  | 27492 | +1 | main | req_011Cgshrh36t1zzkjm8f5SvP | 24321 | 0 | 3169 | 126 |
| run 3 |  |  | 28508 | +2 | main | req_011Cgshroa1DHJgyoa213CwE | 27490 | 0 | 1016 | 209 |
| run 3 |  |  | 884 | +3 | other | req_011CgshrxYFyUAraQ64rUW9S | 0 | 0 | 0 | 130 |

### Arm B25: forked handover at 25% of the window

Expected: handovers, the first at 25%. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | no handover, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 10/10 |
| 2 | no handover, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 8/10, lost q3-money q9-migrations |
| 3 | no handover, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 10/10 |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | clear | 9 | 29583 | event | main | req_011CgsfpozWZd5ND59KNLGKC | 29206 | 0 | 373 | 1318 |
| run 1 |  |  | 26395 | +1 | main | req_011CgsfqhimLDaDjdruVbp4R | 24321 | 0 | 2072 | 121 |
| run 1 |  |  | 884 | +2 | other | req_011Cgsfr3wS5DYWPiCJeBjJX | 0 | 0 | 0 | 493 |
| run 1 |  |  | 27454 | +3 | main | req_011Cgsfr97jhNzXpE3FtbB76 | 26393 | 0 | 1059 | 781 |
| run 1 | clear | 19 | 44339 | event | main | req_011Cgsg5Sg2XrHNn8WtwVWxn | 43520 | 0 | 817 | 2064 |
| run 1 |  |  | 26452 | +1 | main | req_011Cgsg6gaipPQNqKqFprQyB | 24321 | 0 | 2129 | 226 |
| run 1 |  |  | 889 | +2 | other | req_011Cgsg6r6DJKi5LqrhSPcvG | 0 | 0 | 0 | 170 |
| run 1 |  |  | 29158 | +3 | main | req_011Cgsg6rEe4rVeRpWqLAhui | 26450 | 0 | 2706 | 447 |
| run 1 | clear | 29 | 41349 | event | main | req_011CgsgEjjhCE7rVW5bCCVM1 | 40465 | 0 | 882 | 1874 |
| run 1 |  |  | 26697 | +1 | main | req_011CgsgFr9BdCb6U2qE1cCUj | 24321 | 0 | 2374 | 240 |
| run 1 |  |  | 882 | +2 | other | req_011CgsgG2xaA9yDdDUrdYdt6 | 0 | 0 | 0 | 213 |
| run 1 |  |  | 29345 | +3 | main | req_011CgsgG36VuSXwJCMLifNt2 | 26695 | 0 | 2648 | 281 |
| run 2 | clear | 9 | 31839 | event | main | req_011CgsgW16qfjrnHSwdxJ47b | 31261 | 0 | 574 | 1408 |
| run 2 |  |  | 26287 | +1 | main | req_011CgsgWzRBR1wiCi3wmFR19 | 24321 | 0 | 1964 | 136 |
| run 2 |  |  | 27297 | +2 | main | req_011CgsgX9FkgB6ZipAhHAPXV | 26285 | 0 | 1010 | 364 |
| run 2 |  |  | 1882 | +3 | other | req_011CgsgXRESLXNM2BT2axQ7H | 0 | 0 | 0 | 273 |
| run 2 | clear | 19 | 45256 | event | main | req_011CgsgkGH3Rtb6WZQww2UgY | 44821 | 0 | 433 | 1533 |
| run 2 |  |  | 26662 | +1 | main | req_011CgsgmG5QNBA5rjwEL97fY | 24321 | 0 | 2339 | 181 |
| run 2 |  |  | 891 | +2 | other | req_011CgsgmPinXYmQ4pdveVgQ2 | 0 | 0 | 0 | 241 |
| run 2 |  |  | 27782 | +3 | main | req_011CgsgmPo1FBouagGgRnczn | 26660 | 0 | 1120 | 243 |
| run 2 | clear | 29 | 38313 | event | main | req_011CgsguKLLpc2HjPY9a43zt | 37859 | 0 | 452 | 1352 |
| run 2 |  |  | 26529 | +1 | main | req_011Cgsgv6SimthJyGTkbNFr2 | 24321 | 0 | 2206 | 285 |
| run 2 |  |  | 884 | +2 | other | req_011CgsgvH4CLQZQXgCrtM8rq | 0 | 0 | 0 | 230 |
| run 2 |  |  | 30917 | +3 | main | req_011CgsgvHAPdc6kQxwACk9GP | 26527 | 0 | 4388 | 432 |
| run 3 | clear | 9 | 30823 | event | main | req_011Cgsh9wgkp2j5pA9nkSoXe | 30136 | 0 | 683 | 1510 |
| run 3 |  |  | 26589 | +1 | main | req_011CgshAyPEKMDTyADNvitNS | 24321 | 0 | 2266 | 165 |
| run 3 |  |  | 885 | +2 | other | req_011CgshB92vNpeNf5WXg4Sy6 | 0 | 0 | 0 | 176 |
| run 3 |  |  | 27710 | +3 | main | req_011CgshB997LiDU5qtCqp77F | 26587 | 0 | 1121 | 556 |
| run 3 | clear | 19 | 41544 | event | main | req_011CgshNsXMQ13rcC8LucftF | 41109 | 0 | 433 | 1388 |
| run 3 |  |  | 26566 | +1 | main | req_011CgshPmqpdjYFMmJ6L9Khx | 24321 | 0 | 2243 | 85 |
| run 3 |  |  | 27484 | +2 | main | req_011CgshPtqWWs5v3YVqRJmie | 26564 | 0 | 918 | 206 |
| run 3 |  |  | 889 | +3 | other | req_011CgshQ5GpJNxzC6AgxFkUi | 0 | 0 | 0 | 186 |
| run 3 | clear | 29 | 37014 | event | main | req_011CgshYJLMR6AuwX2QbraR7 | 36576 | 0 | 436 | 1326 |
| run 3 |  |  | 26483 | +1 | main | req_011CgshZ2oEnrYs2pBZoGHxV | 24321 | 0 | 2160 | 177 |
| run 3 |  |  | 882 | +2 | other | req_011CgshZC27hTQBxYyaE8mdX | 0 | 0 | 0 | 157 |
| run 3 |  |  | 27591 | +3 | main | req_011CgshZC5qM14RkqJDXymSe | 26481 | 0 | 1108 | 236 |

### Arm B50: forked handover at 50% of the window

Expected: handovers, the first at 50%. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | no handover, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 9/10, lost q3-money |
| 2 | no handover, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 10/10 |
| 3 | no handover, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 9/10, lost q8-tests |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | clear | 9 | 26956 | event | main | req_011Cgsfnwg4cBscC6jsDT5CU | 26753 | 0 | 201 | 731 |
| run 1 |  |  | 25757 | +1 | main | req_011CgsfoS3swJaFLXZNof21Q | 24321 | 0 | 1434 | 153 |
| run 1 |  |  | 886 | +2 | other | req_011CgsfoavRprA8L92gai11i | 0 | 0 | 0 | 249 |
| run 1 |  |  | 26840 | +3 | main | req_011Cgsfobc6zfT2WeNKebrZw | 25755 | 0 | 1083 | 185 |
| run 1 | clear | 19 | 46841 | event | main | req_011Cgsg4rd9xpzaJM6U3Rgkc | 46051 | 0 | 788 | 1852 |
| run 1 |  |  | 26950 | +1 | main | req_011Cgsg5z1vbMGpUwzaCKUWU | 24321 | 0 | 2627 | 152 |
| run 1 |  |  | 28040 | +2 | main | req_011Cgsg698MkVZ3PdpSfALTP | 26948 | 0 | 1090 | 195 |
| run 1 |  |  | 891 | +3 | other | req_011Cgsg68wTWTBPvNbG1nZ5x | 0 | 0 | 0 | 537 |
| run 1 | clear | 29 | 41412 | event | main | req_011CgsgFh7UFZSxjcLnP8kNh | 40640 | 0 | 770 | 1604 |
| run 1 |  |  | 26826 | +1 | main | req_011CgsgGg7iKrTyCrhr1frrr | 24321 | 0 | 2503 | 162 |
| run 1 |  |  | 27919 | +2 | main | req_011CgsgGprKnCR7kA6rB66Cn | 26824 | 0 | 1093 | 185 |
| run 1 |  |  | 884 | +3 | other | req_011CgsgGpkdM6kQB2PxVWrLS | 0 | 0 | 0 | 446 |
| run 2 | clear | 9 | 30329 | event | main | req_011CgsgXdmWD18jNmGgxkBG4 | 29615 | 0 | 710 | 1479 |
| run 2 |  |  | 26532 | +1 | main | req_011CgsgYdXdcVgVEzLKqtkVR | 24321 | 0 | 2209 | 105 |
| run 2 |  |  | 27624 | +2 | main | req_011CgsgYom3FU4dgVQiTJvSV | 26530 | 0 | 1092 | 904 |
| run 2 |  |  | 2354 | +3 | other | req_011CgsgZQvPAXn2czPvgncDx | 0 | 0 | 0 | 502 |
| run 2 | clear | 19 | 40784 | event | main | req_011CgsgkB6Emf9U5KboywRjw | 40407 | 0 | 375 | 1519 |
| run 2 |  |  | 26615 | +1 | main | req_011Cgsgm8kNvG7WcaiNDDyFk | 24321 | 0 | 2292 | 215 |
| run 2 |  |  | 890 | +2 | other | req_011CgsgmJPKY5PfQrYjbQgPt | 0 | 0 | 0 | 247 |
| run 2 |  |  | 27819 | +3 | main | req_011CgsgmJnsnc61czuNDkYug | 26613 | 0 | 1204 | 322 |
| run 2 | clear | 29 | 34800 | event | main | req_011Cgsgto6fjaofFSzMVC93M | 34566 | 0 | 232 | 1656 |
| run 2 |  |  | 26483 | +1 | main | req_011CgsgunSG7MpF6i5PGxMTv | 24321 | 0 | 2160 | 85 |
| run 2 |  |  | 27412 | +2 | main | req_011Cgsguu8b42NtqBCwA6qkc | 26481 | 0 | 929 | 77 |
| run 2 |  |  | 27509 | +3 | main | req_011CgsguyynBEGXa6TqrH9WK | 27410 | 0 | 97 | 371 |
| run 3 | clear | 9 | 27464 | event | main | req_011CgshCjvB39Y6j2BMMKbKd | 27268 | 0 | 194 | 886 |
| run 3 |  |  | 25915 | +1 | main | req_011CgshDLurEwPCJUhhk3N1q | 24321 | 0 | 1592 | 185 |
| run 3 |  |  | 884 | +2 | other | req_011CgshDVaEt1t9jVed9cpGG | 0 | 0 | 0 | 198 |
| run 3 |  |  | 27039 | +3 | main | req_011CgshDVgwgZZQdNHw1LNWp | 25913 | 0 | 1124 | 175 |
| run 3 | clear | 19 | 49267 | event | main | req_011CgshVoDqHiqAEX1oF4Enc | 48675 | 0 | 590 | 1537 |
| run 3 |  |  | 26584 | +1 | main | req_011CgshWrZn98mernRdn4ybG | 24321 | 0 | 2261 | 144 |
| run 3 |  |  | 893 | +2 | other | req_011CgshWzYFGW1igQqC1XV4m | 0 | 0 | 0 | 193 |
| run 3 |  |  | 27667 | +3 | main | req_011CgshWzeh5CwTBibJXJ3jH | 26582 | 0 | 1083 | 163 |
| run 3 | clear | 29 | 38236 | event | main | req_011CgshftAGgGpPDjWU2qh7U | 37717 | 0 | 517 | 1730 |
| run 3 |  |  | 26759 | +1 | main | req_011CgshgtSurNmt3s23uKdVy | 24321 | 0 | 2436 | 192 |
| run 3 |  |  | 886 | +2 | other | req_011Cgshh4qEbnehDWo9e5PuL | 0 | 0 | 0 | 176 |
| run 3 |  |  | 27944 | +3 | main | req_011Cgshh51uhWDKcDA1F3TpP | 26757 | 0 | 1185 | 303 |

### Arm B70: forked handover at 70% of the window

Expected: handovers, the first at 70%. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | no handover, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 10/10 |
| 2 | no handover, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 10/10 |
| 3 | no handover, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 8/10, lost q3-money q9-migrations |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | clear | 9 | 29822 | event | main | req_011CgsfqG88LV2AbcphRqc9P | 29539 | 0 | 279 | 1026 |
| run 1 |  |  | 26008 | +1 | main | req_011CgsfrKgDt2GQLu8SXk7SN | 24321 | 0 | 1685 | 127 |
| run 1 |  |  | 885 | +2 | other | req_011CgsfriGmyTrQXNVTWVMWd | 0 | 0 | 0 | 242 |
| run 1 |  |  | 27072 | +3 | main | req_011CgsfrpiUgDjDWRKzvRVky | 26006 | 0 | 1064 | 361 |
| run 1 | clear | 19 | 45636 | event | main | req_011Cgsg7sJvF69h4VJJLXYtV | 45118 | 0 | 516 | 1570 |
| run 1 |  |  | 1129 | +1 | other | req_011Cgsg929kvQzywzD64BLb9 | 0 | 0 | 0 | 348 |
| run 1 |  |  | 47288 | +2 | main | req_011Cgsg92GCRFFvzMGwmNinJ | 45634 | 0 | 1650 | 556 |
| run 1 |  |  | 48043 | +3 | main | req_011Cgsg9SdQTHL4zryPXpCCi | 47284 | 0 | 757 | 765 |
| run 1 | clear | 29 | 59957 | event | main | req_011CgsgK8dxD3Ycj6g9R7xre | 59382 | 0 | 573 | 1782 |
| run 1 |  |  | 26751 | +1 | main | req_011CgsgLGG8YEaFiDTSZc5z7 | 24321 | 0 | 2428 | 149 |
| run 1 |  |  | 883 | +2 | other | req_011CgsgLRG7ry4sj1rLKS1bN | 0 | 0 | 0 | 224 |
| run 1 |  |  | 27839 | +3 | main | req_011CgsgLRHMNHJCexUCcLrLM | 26749 | 0 | 1088 | 404 |
| run 2 | clear | 9 | 31496 | event | main | req_011Cgsgc21L9pQmHDkDMsip4 | 30856 | 0 | 636 | 963 |
| run 2 |  |  | 25968 | +1 | main | req_011CgsgcfR7PWHy7DHpZev6x | 24321 | 0 | 1645 | 142 |
| run 2 |  |  | 884 | +2 | other | req_011Cgsgco4UsPqt4kjs9apxi | 0 | 0 | 0 | 182 |
| run 2 |  |  | 27041 | +3 | main | req_011CgsgcoDAnKPYnG2jZCVPU | 25966 | 0 | 1073 | 385 |
| run 2 | clear | 19 | 33262 | event | main | req_011CgsgkRviCeZXMPr9R73Kw | 33080 | 0 | 180 | 1110 |
| run 2 |  |  | 26145 | +1 | main | req_011Cgsgm8KLiabXb1Ffm3nPx | 24321 | 0 | 1822 | 131 |
| run 2 |  |  | 27266 | +2 | main | req_011CgsgmFUT3KvywuFRerHbm | 26143 | 0 | 1121 | 585 |
| run 2 |  |  | 2446 | +3 | other | req_011CgsgmfvcGssE19oK1yDjZ | 0 | 0 | 0 | 205 |
| run 2 | clear | 29 | 33923 | event | main | req_011CgsgtrQM5qeDRRpNAtHYJ | 33636 | 0 | 285 | 1469 |
| run 2 |  |  | 26408 | +1 | main | req_011CgsguhHwMH7Vjzo5bwcnK | 24321 | 0 | 2085 | 160 |
| run 2 |  |  | 878 | +2 | other | req_011CgsguqbkM69GGn9t6dfDR | 0 | 0 | 0 | 425 |
| run 2 |  |  | 27549 | +3 | main | req_011Cgsguqgy82VtbSdBqiXKu | 26406 | 0 | 1141 | 579 |
| run 3 | clear | 9 | 28323 | event | main | req_011Cgsh9zXv56ufNCpDCRdyR | 28151 | 0 | 168 | 972 |
| run 3 |  |  | 25957 | +1 | main | req_011CgshAf3ux64CvkJqEAUC6 | 24321 | 0 | 1634 | 125 |
| run 3 |  |  | 26909 | +2 | main | req_011CgshAnZccsjLh9Gw1dAcc | 25955 | 0 | 952 | 483 |
| run 3 |  |  | 2219 | +3 | other | req_011CgshB8Ug9jLbpCHRwzoec | 0 | 0 | 0 | 10 |
| run 3 | clear | 19 | 47646 | event | main | req_011CgshQeULjVgXYNs6pckeF | 46884 | 0 | 760 | 2035 |
| run 3 |  |  | 26683 | +1 | main | req_011CgshRv3V95QYs3rmEcX1g | 24321 | 0 | 2360 | 210 |
| run 3 |  |  | 27832 | +2 | main | req_011CgshS69TLqWex75mEJzHZ | 26681 | 0 | 1149 | 277 |
| run 3 |  |  | 890 | +3 | other | req_011CgshS63VY5wzvRnm1WpDC | 0 | 0 | 0 | 223 |
| run 3 | clear | 29 | 40766 | event | main | req_011Cgshb2D4pzo6QaEzY2XZK | 40098 | 0 | 666 | 1499 |
| run 3 |  |  | 26632 | +1 | main | req_011CgshbtW1BrR254YywjfWe | 24321 | 0 | 2309 | 369 |
| run 3 |  |  | 883 | +2 | other | req_011Cgshc8HxbJH8qvC1Suvxu | 0 | 0 | 0 | 131 |
| run 3 |  |  | 28197 | +3 | main | req_011Cgshc8NRyp6bB7BBRvGq8 | 26630 | 0 | 1565 | 349 |

### Arm C: built-in compaction near 140,000 tokens

Expected: a compaction near 140,000 tokens. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | no compaction, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 9/10, lost q3-money |
| 2 | no compaction, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 10/10 |
| 3 | no compaction, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 10/10 |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | clear | 9 | 27806 | event | main | req_011CgsfoX8iEBUC8Yvi2wVMF | 27497 | 0 | 305 | 1272 |
| run 1 |  |  | 26179 | +1 | main | req_011CgsfpNz6fAY4jFNUcrmkj | 24321 | 0 | 1856 | 110 |
| run 1 |  |  | 27127 | +2 | main | req_011CgsfpaLjRBWeokAeb3G7U | 26177 | 0 | 948 | 583 |
| run 1 |  |  | 2380 | +3 | other | req_011Cgsfq13HVF3PsbfffYSrF | 0 | 0 | 0 | 198 |
| run 1 | clear | 19 | 48766 | event | main | req_011Cgsg6McTHcaRNX16BnEjL | 48119 | 0 | 645 | 1689 |
| run 1 |  |  | 26802 | +1 | main | req_011Cgsg7TCaY5BKidHWRfsmW | 24321 | 0 | 2479 | 108 |
| run 1 |  |  | 890 | +2 | other | req_011Cgsg7aRugaiAG5rbbfocA | 0 | 0 | 0 | 467 |
| run 1 |  |  | 27979 | +3 | main | req_011Cgsg7aYrdsaHPr4eWBsLw | 26800 | 0 | 1177 | 332 |
| run 1 | clear | 29 | 40850 | event | main | req_011CgsgJe9CjfvqBRvtmzPfc | 40260 | 0 | 588 | 3089 |
| run 1 |  |  | 27568 | +1 | main | req_011CgsgLRrLEphQR5ANztTMs | 24321 | 0 | 3245 | 111 |
| run 1 |  |  | 28644 | +2 | main | req_011CgsgLYbthWYKEYTZmRyRq | 27566 | 0 | 1076 | 304 |
| run 1 |  |  | 883 | +3 | other | req_011CgsgLkzWkQJQGzUSrkDPS | 0 | 0 | 0 | 175 |
| run 2 | clear | 9 | 31887 | event | main | req_011Cgsgb4LhT6o8EaZyW5Qux | 31479 | 0 | 404 | 1353 |
| run 2 |  |  | 994 | +1 | other | req_011Cgsgc7K4dP8VTtNCVXDPd | 0 | 0 | 0 | 252 |
| run 2 |  |  | 33322 | +2 | main | req_011Cgsgc7J4sAV3XyaHzmQYL | 31883 | 0 | 1435 | 327 |
| run 2 |  |  | 33685 | +3 | main | req_011CgsgcPrUmtAEN4SR2MGk8 | 33318 | 0 | 365 | 106 |
| run 2 | clear | 19 | 52526 | event | main | req_011CgsgpZ7BVEh1CkJiZwoJt | 51897 | 0 | 627 | 2258 |
| run 2 |  |  | 27460 | +1 | main | req_011CgsgqutcJBC6pr1aM5hJ2 | 24321 | 0 | 3137 | 123 |
| run 2 |  |  | 28665 | +2 | main | req_011Cgsgr2k86wHLzJtwcz7Nu | 27458 | 0 | 1205 | 283 |
| run 2 |  |  | 886 | +3 | other | req_011CgsgrDuadpVetATV9gZ4Y | 0 | 0 | 0 | 192 |
| run 2 | clear | 29 | 41333 | event | main | req_011Cgsh21Gqs2L6RNY4yT473 | 40773 | 0 | 558 | 1334 |
| run 2 |  |  | 26496 | +1 | main | req_011Cgsh2nzvnBngKSaPdviox | 24321 | 0 | 2173 | 216 |
| run 2 |  |  | 879 | +2 | other | req_011Cgsh2yooyPfZXK41K94zy | 0 | 0 | 0 | 220 |
| run 2 |  |  | 27641 | +3 | main | req_011Cgsh2yyUt7PtgCpcj9EAy | 26494 | 0 | 1145 | 246 |
| run 3 | clear | 9 | 27683 | event | main | req_011CgshEnZiZ9wzGYjFeQ38Y | 27454 | 0 | 227 | 907 |
| run 3 |  |  | 25931 | +1 | main | req_011CgshFQQjoNrk4z3xJAbxf | 24321 | 0 | 1608 | 228 |
| run 3 |  |  | 883 | +2 | other | req_011CgshFbYTut4qQTQaFBQfp | 0 | 0 | 0 | 547 |
| run 3 |  |  | 27108 | +3 | main | req_011CgshFbdByEzamtAAjEmAg | 25929 | 0 | 1177 | 457 |
| run 3 | clear | 19 | 46008 | event | main | req_011CgshWRPh7wc7LeFG9BnfZ | 45412 | 0 | 594 | 2241 |
| run 3 |  |  | 27092 | +1 | main | req_011CgshXvVgivAgnrRTsWcfw | 24321 | 0 | 2769 | 252 |
| run 3 |  |  | 890 | +2 | other | req_011CgshY7qKbQqqY9uo1YPnA | 0 | 0 | 0 | 249 |
| run 3 |  |  | 28333 | +3 | main | req_011CgshY7w2R9kFFiTdnVqiV | 27090 | 0 | 1241 | 293 |
| run 3 | clear | 29 | 37917 | event | main | req_011CgshfyvnUGyqKLsLK9rjK | 37383 | 0 | 532 | 1013 |
| run 3 |  |  | 26138 | +1 | main | req_011Cgshgccew6Nr2GZKYxReS | 24321 | 0 | 1815 | 176 |
| run 3 |  |  | 883 | +2 | other | req_011Cgshgn5BV4KDQCXkjpuPr | 0 | 0 | 0 | 166 |
| run 3 |  |  | 27245 | +3 | main | req_011CgshgnB8XonAouhsZsEES | 26136 | 0 | 1107 | 291 |

### Arm D: two built-in compactions, then a handover

Expected: 2 compactions, then 1 handover. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | expected compaction, compaction, handover, got clear, clear, compaction, clear, clear | 4 clears, 1 compaction, 0 handovers | 10/10 |
| 2 | expected compaction, compaction, handover, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 10/10 |
| 3 | expected compaction, compaction, handover, got clear, clear, clear | 3 clears, 0 compactions, 0 handovers | 10/10 |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | clear | 9 | 27410 | event | main | req_011CgsfoHwyDyib4zDmaJGvY | 27169 | 0 | 237 | 1074 |
| run 1 |  |  | 26073 | +1 | main | req_011Cgsfp3f1RfvtHQexCpjuZ | 24321 | 0 | 1750 | 163 |
| run 1 |  |  | 885 | +2 | other | req_011CgsfpG5sZv84X8zcQ24YW | 0 | 0 | 0 | 248 |
| run 1 |  |  | 27174 | +3 | main | req_011CgsfpGg67mPrNhhbHiXcu | 26071 | 0 | 1101 | 186 |
| run 1 | clear | 19 | 47420 | event | main | req_011Cgsg54n9Vvd8daYYfguiC | 46678 | 0 | 740 | 2071 |
| run 1 |  |  | 1129 | +1 | other | req_011Cgsg6YmfKeumWXBF5d7pQ | 0 | 0 | 0 | 223 |
| run 1 |  |  | 49416 | +2 | summarizer | req_011Cgsg6jRsgDWq1E2CrfrSp | 46678 | 396 | 0 | 3825 |
| run 1 |  |  | 31214 | +3 | main | req_011Cgsg98S2dw7WDwQTykLjw | 24321 | 0 | 6891 | 510 |
| run 1 | compaction | 20 | 49416 | event | summarizer | req_011Cgsg6jRsgDWq1E2CrfrSp | 46678 | 396 | 0 | 3825 |
| run 1 |  |  | 31214 | +1 | main | req_011Cgsg98S2dw7WDwQTykLjw | 24321 | 0 | 6891 | 510 |
| run 1 |  |  | 32218 | +2 | main | req_011Cgsg9UyYaCBiSVpazp7N2 | 31212 | 0 | 1004 | 570 |
| run 1 |  |  | 1264 | +3 | other | req_011Cgsg9vxyvFmyK1SQ9tmNJ | 0 | 0 | 0 | 324 |
| run 1 | clear | 26 | 38840 | event | main | req_011CgsgFFuezGhHcpLTYtJcG | 38247 | 0 | 591 | 2657 |
| run 1 |  |  | 27347 | +1 | main | req_011CgsgGoDbfMqCV3YyFmnLM | 24321 | 0 | 3024 | 152 |
| run 1 |  |  | 890 | +2 | other | req_011CgsgGwdNG7S7tY4KKmsaD | 0 | 0 | 0 | 310 |
| run 1 |  |  | 28438 | +3 | main | req_011CgsgGwmYnpGYhaJ7iehjE | 27345 | 0 | 1091 | 402 |
| run 1 | clear | 29 | 31331 | event | main | req_011CgsgK7NK7UFSc98nMiQRz | 30779 | 0 | 550 | 1421 |
| run 1 |  |  | 26522 | +1 | main | req_011CgsgKyBiagQZqct3J7n1S | 24321 | 0 | 2199 | 143 |
| run 1 |  |  | 883 | +2 | other | req_011CgsgL89iEhiWbSheAndoc | 0 | 0 | 0 | 185 |
| run 1 |  |  | 27596 | +3 | main | req_011CgsgL8HARsCLSRu848emA | 26520 | 0 | 1074 | 248 |
| run 2 | clear | 9 | 28441 | event | main | req_011CgsgXk13RPZ5Nh8qDWvyc | 28254 | 0 | 185 | 966 |
| run 2 |  |  | 26157 | +1 | main | req_011CgsgYShm7biwHeyS3tkPS | 24321 | 0 | 1834 | 201 |
| run 2 |  |  | 27307 | +2 | main | req_011CgsgYdXPJaxKZXcBeLUFP | 26155 | 0 | 1150 | 185 |
| run 2 |  |  | 885 | +3 | other | req_011CgsgYd94hJVBz49wiiGq9 | 0 | 0 | 0 | 395 |
| run 2 | clear | 19 | 36203 | event | main | req_011CgsgiRUd4oFraY9fyuoSw | 35985 | 0 | 216 | 1268 |
| run 2 |  |  | 26103 | +1 | main | req_011CgsgjGmXcTHVyi2doiQNP | 24321 | 0 | 1780 | 113 |
| run 2 |  |  | 27185 | +2 | main | req_011CgsgjPgkEsndNiR1iyVMt | 26101 | 0 | 1082 | 654 |
| run 2 |  |  | 2299 | +3 | other | req_011CgsgjvHkmQSuHirN8yhGG | 0 | 0 | 0 | 294 |
| run 2 | clear | 29 | 34065 | event | main | req_011CgsgsLSkgPedJDoiW7ERU | 33894 | 0 | 169 | 1037 |
| run 2 |  |  | 26220 | +1 | main | req_011CgsgszaTDFwTxRgrCozr4 | 24321 | 0 | 1897 | 92 |
| run 2 |  |  | 27148 | +2 | main | req_011Cgsgt6uTHCkoH6tm28MVP | 26218 | 0 | 928 | 546 |
| run 2 |  |  | 2270 | +3 | other | req_011CgsgtY5mUvHET7SqUB6Ys | 0 | 0 | 0 | 247 |
| run 3 | clear | 9 | 34949 | event | main | req_011CgshCBqN5Ema2sfHrV7Hf | 34594 | 0 | 353 | 1230 |
| run 3 |  |  | 26373 | +1 | main | req_011CgshD2WK6b7ZGRYFn35d3 | 24321 | 0 | 2050 | 203 |
| run 3 |  |  | 883 | +2 | other | req_011CgshDCb2zcducmvoNH9eY | 0 | 0 | 0 | 167 |
| run 3 |  |  | 27532 | +3 | main | req_011CgshDCgk9VxAz3mA1PjTb | 26371 | 0 | 1159 | 475 |
| run 3 | clear | 19 | 33438 | event | main | req_011CgshMgLcv7vjLSj7kwSWd | 33280 | 0 | 156 | 1472 |
| run 3 |  |  | 26777 | +1 | main | req_011CgshNdgf5LMapehTX3Vow | 24321 | 0 | 2454 | 118 |
| run 3 |  |  | 891 | +2 | other | req_011CgshNmUDosS3VoTzKCeSs | 0 | 0 | 0 | 191 |
| run 3 |  |  | 28001 | +3 | main | req_011CgshNmddesoroycU6bhNy | 26775 | 0 | 1224 | 730 |
| run 3 | clear | 29 | 34977 | event | main | req_011CgshXUprTYSXYsSY2YjrN | 34761 | 0 | 214 | 1419 |
| run 3 |  |  | 26732 | +1 | main | req_011CgshYJ8wqVNxa7QAjU4gS | 24321 | 0 | 2409 | 137 |
| run 3 |  |  | 884 | +2 | other | req_011CgshYRmaEFW75BMNBWkf5 | 0 | 0 | 0 | 404 |
| run 3 |  |  | 28142 | +3 | main | req_011CgshYRvWULFEYmmg1N6Fw | 26730 | 0 | 1410 | 632 |

### Egress

- 3324 requests reached the relay in 18 runs; 0 runs had a request under a host other than their own 127.0.0.1:port
- 0 connection attempts to any other host reached the proxy sink
- key: the caller's; ANTHROPIC_BASE_URL: the relay, which forwards to the real API; CLAUDE_CONFIG_DIR: a temp dir per run
- run dirs (requests.jsonl, debug-<phase>.log, stream-<phase>.jsonl): /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-A-1-fXBSlh /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-A-2-pdNtFz /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-A-3-xT0MAV /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B25-1-eKwaXt /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B25-2-kcuKkR /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B25-3-nCp13V /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B50-1-HklWXf /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B50-2-tNcvsQ /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B50-3-GvBpTu /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B70-1-52Zai0 /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B70-2-KfK3rT /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B70-3-g7NbCf /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-C-1-ZUnG3B /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-C-2-0kZFip /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-C-3-6BPxpW /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-D-1-4ZDrE2 /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-D-2-k40dth /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-D-3-EO0dJs
