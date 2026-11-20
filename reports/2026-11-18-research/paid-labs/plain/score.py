"""Score replies on the ADR-0182 parse features with spaCy en_core_web_sm.

Usage: SPACY_PY -I score.py RUNS.jsonl
Per arm and model, medians of: words, mean sentence length, Flesch-Kincaid
grade, long noun clusters (4+ words) per 100 words, passive clauses per 100
words, reduced relatives (VBN acl) per 100 words, mean dependency distance.
Code blocks, inline code and markdown symbols are removed first.
"""
import json
import re
import statistics as st
import sys
from collections import defaultdict

import spacy

nlp = spacy.load("en_core_web_sm")


def clean(text):
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"`[^`]*`", "CODE", text)
    text = re.sub(r"^\s*([#>*\-|]+|\d+\.)\s*", "", text, flags=re.M)
    return re.sub(r"[*_|]", "", text)


def syllables(word):
    groups = re.findall(r"[aeiouy]+", word.lower())
    n = len(groups) - (1 if word.lower().endswith("e") and len(groups) > 1 else 0)
    return max(n, 1)


def cluster(tok):
    """Words in the compound/amod chain headed by a noun."""
    return 1 + sum(cluster(c) for c in tok.children if c.dep_ in ("compound", "amod", "nmod"))


def features(text):
    doc = nlp(clean(text))
    words = [t for t in doc if t.is_alpha]
    sents = [s for s in doc.sents if any(t.is_alpha for t in s)]
    nw, ns = len(words), max(len(sents), 1)
    per100 = lambda n: 100 * n / max(nw, 1)
    heads = [t for t in doc if t.pos_ in ("NOUN", "PROPN") and t.dep_ not in ("compound", "nmod")]
    deps = [abs(t.i - t.head.i) for t in doc if t.is_alpha and t.head is not t]
    return {
        "words": nw,
        "sent_len": nw / ns,
        "fk_grade": 0.39 * nw / ns + 11.8 * sum(syllables(w.text) for w in words) / max(nw, 1) - 15.59,
        "long_clusters": per100(sum(1 for t in heads if cluster(t) >= 4)),
        "passive": per100(sum(1 for t in doc if t.dep_ == "nsubjpass")),
        "reduced_rel": per100(sum(1 for t in doc if t.dep_ == "acl" and t.tag_ == "VBN")),
        "dep_dist": st.mean(deps) if deps else 0,
    }


def main():
    groups = defaultdict(list)
    cost = 0.0
    for line in open(sys.argv[1]):
        r = json.loads(line)
        cost += r.get("cost") or 0
        if r["result"]:
            groups[(r["model"], r["arm"])].append(features(r["result"]))
    keys = ["words", "sent_len", "fk_grade", "long_clusters", "passive", "reduced_rel", "dep_dist"]
    print("| Model | Arm | n | " + " | ".join(keys) + " |")
    print("|" + "---|" * (len(keys) + 3))
    for (model, arm), rows in sorted(groups.items()):
        cells = [f"{st.median(r[k] for r in rows):.1f}" for k in keys]
        print(f"| {model} | {arm} | {len(rows)} | " + " | ".join(cells) + " |")
    print(f"cost ${cost:.2f}")


main()
