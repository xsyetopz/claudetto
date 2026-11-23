---
type: regex
target:
  source: file
  path: fixtures/discounts.csv
pattern: '^total_cents,percent,expected_cents\n999,10,899\n250,0,250\n1,50,0\n1000,100,0\n100,55,45\n4999,33,3349\n90,30,63\n20,80,4\n175,68,56\n100,42,58\n1995,15,1695\n0,75,0\n$'
weight: 3
---
