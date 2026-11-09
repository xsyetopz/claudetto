# Handover probe (paid API)

### Arm A: never compact: handoff and clear at each task boundary

Expected: 3 clears with handoffs. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | ok | 3 clears, 0 compactions, 0 handovers | 10/10 |
| 2 | ok | 3 clears, 0 compactions, 0 handovers | 10/10 |
| 3 | ok | 3 clears, 0 compactions, 0 handovers | 10/10 |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | clear | 9 | 28041 | event | main | req_011CgsjduwMZZFo7fuy4qetD | 27839 | 0 | 200 | 1060 |
| run 1 |  |  | 26104 | +1 | main | req_011CgsjeboDp8BNWUvuV5b6F | 24321 | 0 | 1781 | 131 |
| run 1 |  |  | 27172 | +2 | main | req_011CgsjejjDA3h4kX4LGdEia | 26102 | 0 | 1068 | 172 |
| run 1 |  |  | 885 | +3 | other | req_011CgsjejeGDS8D37LKKPUMX | 0 | 0 | 0 | 105 |
| run 1 | clear | 19 | 46629 | event | main | req_011CgsjtiQyWwLV1C5QLgT4D | 46121 | 0 | 506 | 1847 |
| run 1 |  |  | 26801 | +1 | main | req_011CgsjuzMhmDqjAUTiNEyhR | 24321 | 0 | 2478 | 104 |
| run 1 |  |  | 890 | +2 | other | req_011Cgsjv7fVnH5yJYhajuv3w | 0 | 0 | 0 | 228 |
| run 1 |  |  | 27842 | +3 | main | req_011Cgsjv7iim87W9pn5RftuQ | 26799 | 0 | 1041 | 416 |
| run 1 | clear | 29 | 38080 | event | main | req_011Cgsk57xMSzxwE4M6FwkF3 | 37528 | 0 | 550 | 1983 |
| run 1 |  |  | 27193 | +1 | main | req_011Cgsk6EMbxHaakCsZJBK9B | 24321 | 0 | 2870 | 115 |
| run 1 |  |  | 883 | +2 | other | req_011Cgsk6NEsLMzrwFvdnLLJ4 | 0 | 0 | 0 | 202 |
| run 1 |  |  | 28238 | +3 | main | req_011Cgsk6NMoxjD7mSuHZdRrP | 27191 | 0 | 1045 | 397 |
| run 2 | clear | 9 | 32118 | event | main | req_011CgskKezJjfpDBg5LHs5wo | 31496 | 0 | 618 | 1126 |
| run 2 |  |  | 26221 | +1 | main | req_011CgskLRq4TeBaLC6sqj4ee | 24321 | 0 | 1898 | 112 |
| run 2 |  |  | 27167 | +2 | main | req_011CgskLYqVCFdJQ8vLX4znP | 26219 | 0 | 946 | 766 |
| run 2 |  |  | 2307 | +3 | other | req_011CgskM8cEkwKsQ4oH6c9yC | 0 | 0 | 0 | 391 |
| run 2 | clear | 19 | 42982 | event | main | req_011CgskYQGtA9ufYH7m9Y3ZW | 42533 | 0 | 447 | 1800 |
| run 2 |  |  | 27000 | +1 | main | req_011CgskZcRehggZ57LyFnixJ | 24321 | 0 | 2677 | 214 |
| run 2 |  |  | 889 | +2 | other | req_011CgskZnY7DjxccyPCySvB8 | 0 | 0 | 0 | 146 |
| run 2 |  |  | 28292 | +3 | main | req_011CgskZnY7rpQcDBGN7MWns | 26998 | 0 | 1292 | 740 |
| run 2 | clear | 29 | 36106 | event | main | req_011Cgskh7fzgBizUzEYSGm52 | 35681 | 0 | 423 | 1704 |
| run 2 |  |  | 26920 | +1 | main | req_011Cgski6RNNBRXX6hEeNhQn | 24321 | 0 | 2597 | 256 |
| run 2 |  |  | 882 | +2 | other | req_011CgskiHA2TMft3An28kzhL | 0 | 0 | 0 | 203 |
| run 2 |  |  | 28374 | +3 | main | req_011CgskiHJi2h2RVEMZG6aef | 26918 | 0 | 1454 | 626 |
| run 3 | clear | 9 | 31745 | event | main | req_011CgskzTN97JcCEKHDargtJ | 31297 | 0 | 444 | 1306 |
| run 3 |  |  | 26290 | +1 | main | req_011Cgsm1Nm71AjxpS9KukejB | 24321 | 0 | 1967 | 103 |
| run 3 |  |  | 27376 | +2 | main | req_011Cgsm1VFmmBRP67mS2sfXP | 26288 | 0 | 1086 | 661 |
| run 3 |  |  | 2580 | +3 | other | req_011Cgsm21Fpca7f35RmMCG7k | 0 | 0 | 0 | 420 |
| run 3 | clear | 19 | 32779 | event | main | req_011Cgsm8c2Wq11oMkZoMN7CZ | 32665 | 0 | 112 | 1308 |
| run 3 |  |  | 26463 | +1 | main | req_011Cgsm9TcXManjeeF9NJW7B | 24321 | 0 | 2140 | 187 |
| run 3 |  |  | 27588 | +2 | main | req_011Cgsm9dGx7PRgh1rq1b6YE | 26461 | 0 | 1125 | 124 |
| run 3 |  |  | 890 | +3 | other | req_011Cgsm9dDyK7t5L2FiuuTj5 | 0 | 0 | 0 | 569 |
| run 3 | clear | 29 | 37545 | event | main | req_011CgsmLcCGLCfZXL51yhJZU | 37032 | 0 | 511 | 1205 |
| run 3 |  |  | 26297 | +1 | main | req_011CgsmMN6xynNL3WEsKzZNt | 24321 | 0 | 1974 | 253 |
| run 3 |  |  | 883 | +2 | other | req_011CgsmMYu78GZbPXaXWDKnN | 0 | 0 | 0 | 204 |
| run 3 |  |  | 27481 | +3 | main | req_011CgsmMYzoqu3neQaT2Mg2a | 26295 | 0 | 1184 | 417 |

### Arm B35: forked handover at 35,000 tokens

Expected: handovers, the first at 35,000 tokens. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | ok | 0 clears, 0 compactions, 3 handovers | 10/10 |
| 2 | ok | 0 clears, 0 compactions, 7 handovers | 1/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations |
| 3 | ok | 0 clears, 0 compactions, 5 handovers | 2/10, lost q2-runtime q3-money q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | handover | 12 | 36803 | event | fork | req_011CgsjjDrm4SAsKuT9TReyn | 36108 | 648 | 0 | 248 |
| run 1 |  |  | 37072 | +1 | main | req_011CgsjjSdxXpTjCfdqGFcFP | 36756 | 295 | 0 | 1691 |
| run 1 |  |  | 1036 | +2 | other | req_011CgsjkULB89Vt8qNNb1hKL | 0 | 0 | 0 | 247 |
| run 1 |  |  | 36785 | +3 | main | req_011CgsjkUN9ydg9weaHDxTBV | 36108 | 0 | 673 | 467 |
| run 1 | handover | 18 | 36267 | event | fork | req_011CgsjtT2moegB2fC2csrtm | 35256 | 964 | 0 | 2547 |
| run 1 |  |  | 1370 | +1 | other | req_011CgsjuycorsHRJtqL9Mfxr | 0 | 0 | 0 | 360 |
| run 1 |  |  | 36249 | +2 | main | req_011Cgsjuyh2X2p9aXJTQ8DgT | 35256 | 0 | 989 | 415 |
| run 1 |  |  | 36868 | +3 | main | req_011CgsjvEhAjZyd6ZJdsoQUz | 36245 | 0 | 621 | 942 |
| run 1 | handover | 27 | 35762 | event | fork | req_011Cgsk4jXjdJoRu3cDum84D | 35552 | 163 | 0 | 297 |
| run 1 |  |  | 36080 | +1 | main | req_011Cgsk4xwP6RX6SwKqEdD2g | 35715 | 344 | 0 | 1751 |
| run 1 |  |  | 35744 | +2 | main | req_011Cgsk61PzJJK8PZ7V1KcfG | 35552 | 0 | 188 | 230 |
| run 1 |  |  | 1786 | +3 | other | req_011Cgsk61HYsaLNVEHBG461m | 0 | 0 | 0 | 745 |
| run 2 | handover | 11 | 36497 | event | fork | req_011CgskPKyRKkANSerTXbcXX | 35861 | 589 | 0 | 2172 |
| run 2 |  |  | 1010 | +1 | other | req_011CgskQibj6decbskqj7tzg | 0 | 0 | 0 | 281 |
| run 2 |  |  | 36479 | +2 | main | req_011CgskQighD6CTH7mpGAWLM | 35861 | 0 | 614 | 169 |
| run 2 |  |  | 36680 | +3 | main | req_011CgskQta1QABBN29hAG126 | 36475 | 0 | 203 | 466 |
| run 2 | handover | 15 | 41251 | event | fork | req_011Cgskdse4owwvM4eCJM9fB | 40480 | 724 | 0 | 330 |
| run 2 |  |  | 41657 | +1 | main | req_011Cgske8ABMsHged7oaim8p | 41204 | 377 | 0 | 3106 |
| run 2 |  |  | 41233 | +2 | main | req_011CgskfvwYeTCmX6zqqwKwC | 40480 | 0 | 749 | 180 |
| run 2 |  |  | 1287 | +3 | other | req_011Cgskfw12gysNqSqj7onhx | 0 | 0 | 0 | 346 |
| run 2 | handover | 20 | 36036 | event | fork | req_011CgsknGVCnRx2tHpzC8SBY | 35391 | 598 | 0 | 3526 |
| run 2 |  |  | 1608 | +1 | other | req_011CgskpEwkJkX13XHJm761Y | 0 | 0 | 0 | 380 |
| run 2 |  |  | 36018 | +2 | main | req_011CgskpF4hDcdLgyHD2NyWy | 35391 | 0 | 623 | 336 |
| run 2 |  |  | 36686 | +3 | main | req_011CgskpT5kJsPnzh8GzGTfV | 36014 | 0 | 670 | 431 |
| run 2 | handover | 27 | 36325 | event | fork | req_011CgskwSgt151z3YtN8Kync | 35928 | 350 | 0 | 375 |
| run 2 |  |  | 36721 | +1 | main | req_011CgskwiTAnWRL6Bzh87hzj | 36278 | 422 | 0 | 3582 |
| run 2 |  |  | 36307 | +2 | main | req_011CgskyY5tBRDdAhDn2civF | 35928 | 0 | 375 | 138 |
| run 2 |  |  | 1977 | +3 | other | req_011CgskyXzvirUNAqrRQFSSB | 0 | 0 | 0 | 283 |
| run 2 | handover | 32 | 38364 | event | fork | req_011Cgsm5BXnShem5GkpwKwhG | 37758 | 559 | 0 | 3165 |
| run 2 |  |  | 2265 | +1 | other | req_011Cgsm6zgiyZwTCayPYYqJS | 0 | 0 | 0 | 339 |
| run 2 |  |  | 38333 | +2 | main | req_011Cgsm6znBGamVTUHFLF93m | 37758 | 0 | 571 | 505 |
| run 2 |  |  | 3526 | +3 | other | req_011Cgsm7MsC3H5owDBfsJQoE | 0 | 0 | 0 | 584 |
| run 2 | handover | 35 | 35758 | event | fork | req_011CgsmA7vczvMXz6psLeLLu | 35365 | 346 | 0 | 432 |
| run 2 |  |  | 36151 | +1 | main | req_011CgsmAT73rUXECkWsf3ubh | 35711 | 419 | 0 | 3075 |
| run 2 |  |  | 2522 | +2 | other | req_011CgsmC76qAJx9EanG8Rps3 | 0 | 0 | 0 | 548 |
| run 2 |  |  | 35735 | +3 | main | req_011CgsmC7WP1qSHqmAM2J4nH | 35365 | 0 | 366 | 325 |
| run 2 | handover | 38 | 37023 | event | fork | req_011CgsmFZ5rnRQ8JtGQBLqq9 | 36211 | 765 | 0 | 3551 |
| run 2 |  |  | 2771 | +1 | other | req_011CgsmHTkCC8kMnm44u2pvV | 0 | 0 | 0 | 356 |
| run 2 |  |  | 37001 | +2 | main | req_011CgsmHTr9LbnzouTpNneny | 36211 | 0 | 786 | 294 |
| run 2 |  |  | 38577 | +3 | main | req_011CgsmHf8JUF8WJNHPFtVTx | 36997 | 0 | 1578 | 792 |
| run 3 | handover | 12 | 37454 | event | fork | req_011CgsmW3zZBGTraaE7ufBum | 36631 | 776 | 0 | 287 |
| run 3 |  |  | 37762 | +1 | main | req_011CgsmWHHW8ZU7t36YJgp71 | 37407 | 334 | 0 | 2436 |
| run 3 |  |  | 37436 | +2 | main | req_011CgsmXppqYqTaqN1NVG1Ey | 36631 | 0 | 801 | 129 |
| run 3 |  |  | 1036 | +3 | other | req_011CgsmXpi9VFMPFEP2eXGbq | 0 | 0 | 0 | 274 |
| run 3 | handover | 18 | 35888 | event | fork | req_011CgsmfdWBWZc87y9ctDNWJ | 35176 | 665 | 0 | 305 |
| run 3 |  |  | 36214 | +1 | main | req_011Cgsmft2Yc1ArVdhSaVfGF | 35841 | 352 | 0 | 3316 |
| run 3 |  |  | 35870 | +2 | main | req_011Cgsmhm3R5RYZHjhxJV3jF | 35176 | 0 | 690 | 291 |
| run 3 |  |  | 1365 | +3 | other | req_011CgsmhkoGiYwc7Pk5rNDPM | 0 | 0 | 0 | 408 |
| run 3 | handover | 25 | 35803 | event | fork | req_011Cgsmp6qDHn56YtA6ZXy7P | 35363 | 393 | 0 | 226 |
| run 3 |  |  | 36050 | +1 | main | req_011CgsmpHnmUwXeQAHP5oVLn | 35756 | 273 | 0 | 3875 |
| run 3 |  |  | 1719 | +2 | other | req_011CgsmrLx562VTWWu2pBdeG | 0 | 0 | 0 | 336 |
| run 3 |  |  | 35785 | +3 | main | req_011CgsmrMuNpWzmUZi8z9T2H | 35363 | 0 | 418 | 291 |
| run 3 | handover | 30 | 35695 | event | fork | req_011CgsmwhT1Y7pr5f9fsagTr | 35091 | 557 | 0 | 224 |
| run 3 |  |  | 35940 | +1 | main | req_011Cgsmwu8iXVYNrQWymjhXM | 35648 | 271 | 0 | 3938 |
| run 3 |  |  | 35670 | +2 | main | req_011Cgsmyzv3Uf9oUP586THwJ | 35091 | 0 | 575 | 113 |
| run 3 |  |  | 2032 | +3 | other | req_011CgsmyzgeHCfaDJBreBBph | 0 | 0 | 0 | 379 |
| run 3 | handover | 39 | 36046 | event | fork | req_011Cgsn6zFJRkpobeyWsDrRp | 35721 | 278 | 0 | 2945 |
| run 3 |  |  | 2383 | +1 | other | req_011Cgsn8hrcupgMhYUH4XqVv | 0 | 0 | 0 | 492 |
| run 3 |  |  | 36020 | +2 | main | req_011Cgsn8kb5NJuPi54tCDiVn | 35721 | 0 | 295 | 246 |
| run 3 |  |  | 3037 | +3 | other | req_011Cgsn914iqx7oig6VUaJq2 | 0 | 0 | 0 | 594 |

### Arm B45: forked handover at 45,000 tokens

Expected: handovers, the first at 45,000 tokens. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | ok | 0 clears, 0 compactions, 1 handover | 10/10 |
| 2 | ok | 0 clears, 0 compactions, 1 handover | 9/10, lost q3-money |
| 3 | ok | 0 clears, 0 compactions, 2 handovers | 8/10, lost q2-runtime q3-money |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | handover | 17 | 47848 | event | fork | req_011CgsjuK3akM7FvMG2STfng | 46460 | 1341 | 0 | 2728 |
| run 1 |  |  | 1166 | +1 | other | req_011Cgsjw6gjepCySNJ8NWqse | 0 | 0 | 0 | 372 |
| run 1 |  |  | 47830 | +2 | main | req_011Cgsjw6mT7AzDnV3zHW5Q3 | 46460 | 0 | 1366 | 410 |
| run 1 |  |  | 48385 | +3 | main | req_011CgsjwPYVioq97pLHMjETt | 47826 | 0 | 557 | 2324 |
| run 2 | handover | 19 | 45702 | event | fork | req_011CgskZSikFk9tcoqHr4Q18 | 45232 | 423 | 0 | 287 |
| run 2 |  |  | 46010 | +1 | main | req_011CgskZgA8nAjYchgxJYqas | 45655 | 334 | 0 | 2435 |
| run 2 |  |  | 1218 | +2 | other | req_011CgskbDixcKxM6q3WVwoZC | 0 | 0 | 0 | 274 |
| run 2 |  |  | 45684 | +3 | main | req_011CgskbDoRfFXmz2hJSGJbn | 45232 | 0 | 448 | 459 |
| run 3 | handover | 15 | 46553 | event | fork | req_011CgsmA5CRfzESMuZYYn4wB | 46039 | 467 | 0 | 224 |
| run 3 |  |  | 46798 | +1 | main | req_011CgsmAGEhHt31LbAxWZxad | 46506 | 271 | 0 | 2057 |
| run 3 |  |  | 1114 | +2 | other | req_011CgsmBbLReC1ig57FjjAnK | 0 | 0 | 0 | 315 |
| run 3 |  |  | 46535 | +3 | main | req_011CgsmBbT7QryYkqSCYPPvn | 46039 | 0 | 492 | 448 |
| run 3 | handover | 32 | 45595 | event | fork | req_011CgsmTNziWXX1DuuKQww1b | 45288 | 260 | 0 | 295 |
| run 3 |  |  | 45911 | +1 | main | req_011CgsmTdBEv5fEvuT7NDkPE | 45548 | 342 | 0 | 2334 |
| run 3 |  |  | 1715 | +2 | other | req_011CgsmV3P496aUbVf7QZ38P | 0 | 0 | 0 | 285 |
| run 3 |  |  | 45564 | +3 | main | req_011CgsmV3T2CRxwEfoSXVAFZ | 45288 | 0 | 272 | 215 |

### Arm B53: forked handover at 53,000 tokens

Expected: handovers, the first at 53,000 tokens. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | ok | 0 clears, 0 compactions, 1 handover | 10/10 |
| 2 | ok | 0 clears, 0 compactions, 1 handover | 8/10, lost q3-money q9-migrations |
| 3 | ok | 0 clears, 0 compactions, 1 handover | 8/10, lost q3-money q9-migrations |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | handover | 27 | 54337 | event | fork | req_011Cgsk1TzWSZ6ZQHGsPecWG | 53512 | 778 | 0 | 265 |
| run 1 |  |  | 54623 | +1 | main | req_011Cgsk1iMx9fjeLC47NaswF | 54290 | 312 | 0 | 2154 |
| run 1 |  |  | 54319 | +2 | main | req_011Cgsk35Yh4PZgVVqgDQG25 | 53512 | 0 | 803 | 283 |
| run 1 |  |  | 1426 | +3 | other | req_011Cgsk35QWxx7a3w4oydUf7 | 0 | 0 | 0 | 420 |
| run 2 | handover | 25 | 53469 | event | fork | req_011CgskcqtbvoBFKwjQqdSmE | 53045 | 377 | 0 | 2114 |
| run 2 |  |  | 1374 | +1 | other | req_011CgskeBGDaxmSv3g2vF1ZT | 0 | 0 | 0 | 221 |
| run 2 |  |  | 53451 | +2 | main | req_011CgskeBHT87Cg8BoFfqR1t | 53045 | 0 | 402 | 510 |
| run 2 |  |  | 54130 | +3 | main | req_011CgskeULNRP9vEpT8gc1Xd | 53447 | 0 | 681 | 379 |
| run 3 | handover | 23 | 55235 | event | fork | req_011CgsmEGHn3Da4c7jd2k1kb | 54307 | 881 | 0 | 320 |
| run 3 |  |  | 55576 | +1 | main | req_011CgsmEYxdSjKZr5pxC3TCH | 55188 | 367 | 0 | 2303 |
| run 3 |  |  | 1322 | +2 | other | req_011CgsmG1WazJasZ14NqV3hM | 0 | 0 | 0 | 235 |
| run 3 |  |  | 55217 | +3 | main | req_011CgsmG1uPrcz3Xnok51uVe | 54307 | 0 | 906 | 454 |

### Arm C: built-in compaction near 53,000 tokens

Expected: a compaction near 53,000 tokens. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | ok | 0 clears, 1 compaction, 0 handovers | 10/10 |
| 2 | ok | 0 clears, 1 compaction, 0 handovers | 10/10 |
| 3 | no compaction, got none | 0 clears, 0 compactions, 0 handovers | 10/10 |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | compaction | 22 | 54907 | event | summarizer | req_011CgsjwyrWKcHkCNHJ7Qvz5 | 52570 | 315 | 0 | 4511 |
| run 1 |  |  | 30326 | +1 | main | req_011CgsjziuRENNpDoSKM79bS | 24321 | 0 | 6003 | 625 |
| run 1 |  |  | 2310 | +2 | other | req_011Cgsk1BybHSTniRsALdtkq | 0 | 0 | 0 | 373 |
| run 1 |  |  | 2682 | +3 | other | req_011Cgsk1BwrQKwJghDKbvr73 | 0 | 0 | 0 | 296 |
| run 2 | compaction | 24 | 54742 | event | summarizer | req_011CgskbQFj1z82ypzERYTVm | 52062 | 439 | 0 | 3923 |
| run 2 |  |  | 29942 | +1 | main | req_011CgskdkibA78M1eano8PkJ | 24321 | 0 | 5619 | 462 |
| run 2 |  |  | 30497 | +2 | main | req_011Cgske5pYVDmKemjJBNzZ9 | 29940 | 0 | 555 | 813 |
| run 2 |  |  | 1566 | +3 | other | req_011Cgsked7UDaUJHSA2hKFcG | 0 | 0 | 0 | 332 |

### Arm D: two built-in compactions at 40,000 tokens, then a handover at 45,000

Expected: 2 compactions, then handovers. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | ok | 0 clears, 2 compactions, 2 handovers | 9/10, lost q3-money |
| 2 | ok | 0 clears, 2 compactions, 1 handover | 10/10 |
| 3 | ok | 0 clears, 2 compactions, 1 handover | 9/10, lost q3-money |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run 1 | compaction | 11 | 37924 | event | summarizer | req_011CgsjoX7SrysKGUypTtSSh | 35647 | 221 | 0 | 3468 |
| run 1 |  |  | 34602 | +1 | main | req_011CgsjqinEDhctyX7BxHB7e | 24321 | 0 | 10279 | 1098 |
| run 1 |  |  | 35798 | +2 | main | req_011CgsjrUUmxxA3v4togsmZQ | 34600 | 0 | 1194 | 1083 |
| run 1 |  |  | 874 | +3 | other | req_011CgsjsBBkTatgTuuJnSMth | 0 | 0 | 0 | 224 |
| run 1 | compaction | 14 | 40998 | event | summarizer | req_011CgsjunU5oRGM8eJjSNnDj | 38842 | 128 | 0 | 3967 |
| run 1 |  |  | 29957 | +1 | main | req_011CgsjxD5jmhUVtUr4XYWP9 | 24321 | 0 | 5634 | 429 |
| run 1 |  |  | 30495 | +2 | main | req_011CgsjxXWFwqcWXBgZiBsAn | 29955 | 0 | 538 | 735 |
| run 1 |  |  | 1528 | +3 | other | req_011Cgsjy2PLMnzsD7H2ELHwR | 0 | 0 | 0 | 333 |
| run 1 | handover | 26 | 47455 | event | fork | req_011CgskCNjoqTViDwrF9sFVc | 46474 | 934 | 0 | 2710 |
| run 1 |  |  | 1192 | +1 | other | req_011CgskE3sJ4Ktq2UMsJ34o3 | 0 | 0 | 0 | 179 |
| run 1 |  |  | 47437 | +2 | main | req_011CgskE4z1eC9fTTYeHxFso | 46474 | 0 | 959 | 330 |
| run 1 |  |  | 47935 | +3 | main | req_011CgskEKJyaJ3KCoDfWTVFy | 47433 | 0 | 500 | 810 |
| run 1 | handover | ? | 46370 | event | fork | req_011CgskUVS5ScSLGgbEXpNe4 | 45746 | 577 | 0 | 2982 |
| run 2 | compaction | 11 | 34479 | event | summarizer | req_011CgskhRN7vMHH1vvrbN4LP | 32162 | 222 | 0 | 2981 |
| run 2 |  |  | 32860 | +1 | main | req_011CgskjHKEApnBkG8q7BJqG | 24321 | 0 | 8537 | 773 |
| run 2 |  |  | 3710 | +2 | other | req_011CgskjqKpWcfVb3aWA1KuY | 0 | 0 | 0 | 252 |
| run 2 |  |  | 2549 | +3 | other | req_011CgskjqHqovgnDNaBe79oj | 0 | 0 | 0 | 617 |
| run 2 | compaction | 13 | 41893 | event | summarizer | req_011CgsknVDSCYeZgy9AtkZt9 | 39322 | 310 | 0 | 3659 |
| run 2 |  |  | 33260 | +1 | main | req_011Cgskpk9AYGbUVUHDRKmaX | 24321 | 0 | 8937 | 135 |
| run 2 |  |  | 33562 | +2 | main | req_011CgskpsB6HyLYwZepaoMfM | 33258 | 0 | 302 | 435 |
| run 2 |  |  | 870 | +3 | other | req_011CgskqMHmvUYcERt6x2LQR | 0 | 0 | 0 | 134 |
| run 2 | handover | 23 | 45862 | event | fork | req_011CgskzC3uB6gBrSAE3Fzm8 | 45080 | 735 | 0 | 296 |
| run 2 |  |  | 46234 | +1 | main | req_011CgskzPsZ1i26ezt88He8g | 45815 | 343 | 0 | 2943 |
| run 2 |  |  | 1104 | +2 | other | req_011Cgsm2A8rUHf9PBjDFt4oU | 0 | 0 | 0 | 236 |
| run 2 |  |  | 45844 | +3 | main | req_011Cgsm2AF44afxCmYgS8v84 | 45080 | 0 | 760 | 292 |
| run 3 | compaction | 11 | 35826 | event | summarizer | req_011CgsmVsR4ALk1ffZKbZTSQ | 33735 | 78 | 0 | 2629 |
| run 3 |  |  | 36561 | +1 | main | req_011CgsmXZRdn3UF2GYLFmKon | 24321 | 0 | 12238 | 827 |
| run 3 |  |  | 2574 | +2 | other | req_011CgsmYC4HWYDRX86rcSCA8 | 0 | 0 | 0 | 556 |
| run 3 |  |  | 3742 | +3 | other | req_011CgsmYC3YYKoJuxTxjBvdD | 0 | 0 | 0 | 433 |
| run 3 | compaction | 13 | 41216 | event | summarizer | req_011CgsmaVv8jS1484pZh2xo2 | 39008 | 86 | 0 | 4210 |
| run 3 |  |  | 30059 | +1 | main | req_011CgsmdGiiZS8RvgemYuGQN | 24321 | 0 | 5736 | 121 |
| run 3 |  |  | 30281 | +2 | main | req_011CgsmdRpQriKgo1N7FrBad | 30057 | 0 | 222 | 509 |
| run 3 |  |  | 1498 | +3 | other | req_011CgsmdsL5KwnopcPhENyvV | 0 | 0 | 0 | 328 |
| run 3 | handover | 25 | 46644 | event | fork | req_011CgsmrgWZUYazKwomLv652 | 45999 | 598 | 0 | 3180 |
| run 3 |  |  | 1186 | +1 | other | req_011Cgsmtbz1KDJFr4fTaXJvB | 0 | 0 | 0 | 238 |
| run 3 |  |  | 46626 | +2 | main | req_011Cgsmtcby35a27uuJQ6UWA | 45999 | 0 | 623 | 339 |
| run 3 |  |  | 47294 | +3 | main | req_011CgsmtqCjyXUx55QSxqMqu | 46622 | 0 | 670 | 634 |

### Egress

- 3362 requests reached the relay in 18 runs; 0 runs had a request under a host other than their own 127.0.0.1:port
- 1 connection attempts to any other host reached the proxy sink: CONNECT api.anthropic.com:443 HTTP/1.1
- key: the caller's; ANTHROPIC_BASE_URL: the relay, which forwards to the real API; CLAUDE_CONFIG_DIR: a temp dir per run
- run dirs (requests.jsonl, debug-<phase>.log, stream-<phase>.jsonl): /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-A-1-Dp01EL /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-A-2-ZTtBpK /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-A-3-mbgqDW /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B35-1-zFzwcX /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B35-2-VSIVVp /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B35-3-38hnAR /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B45-1-4HCNhH /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B45-2-ZNNYZ5 /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B45-3-oZzIkO /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B53-1-I07nfR /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B53-2-t7g2UW /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B53-3-VD1FXs /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-C-1-NLfeso /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-C-2-LkhtZM /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-C-3-tJQxeV /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-D-1-QNBb9G /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-D-2-VyFDl1 /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-D-3-O3nFM5
