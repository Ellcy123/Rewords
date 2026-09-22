#!/usr/bin/env python3
"""
Enhanced Rhyme Dictionary for Rapper Coach.
Supports: single char lookup, multi-pronunciation, similarity-based search,
word-level rhyme queries, and frequency-aware sorting.
"""

import json
import sys
import random
import argparse
from pathlib import Path
from typing import List, Dict, Optional, Tuple

# Pinyin finals sorted by length (longest first) for greedy matching
FINALS = [
    "iang", "iong", "uang", "ueng",
    "ian", "iao", "uai", "uan",
    "ia", "ie", "iu", "ua", "uo", "ui", "un", "üe", "ün", "ve", "vn",
    "ang", "eng", "ing", "ong",
    "ai", "ei", "ui", "ao", "ou", "iu", "ie", "üe", "er",
    "an", "en", "in", "un", "ün",
    "a", "o", "e", "i", "u", "ü", "v",
]

# Vowel similarity for family/slant rhyme
VOWEL_SIMILARITY = {
    ("a", "ia"): 0.9, ("a", "ua"): 0.9, ("a", "ai"): 0.8, ("a", "an"): 0.8, ("a", "ang"): 0.8,
    ("o", "uo"): 0.9, ("o", "ou"): 0.8, ("o", "ong"): 0.8,
    ("e", "ie"): 0.9, ("e", "üe"): 0.85, ("e", "ei"): 0.8, ("e", "en"): 0.8, ("e", "eng"): 0.8,
    ("i", "ie"): 0.9, ("i", "in"): 0.85, ("i", "ing"): 0.85, ("i", "ia"): 0.85,
    ("u", "ua"): 0.9, ("u", "uo"): 0.9, ("u", "ui"): 0.85, ("u", "un"): 0.85, ("u", "uang"): 0.85,
    ("ü", "üe"): 0.9, ("ü", "ün"): 0.9, ("ü", "ue"): 1.0, ("ü", "iu"): 0.85,
    ("an", "ian"): 0.9, ("an", "uan"): 0.9, ("an", "ang"): 0.85,
    ("en", "in"): 0.85, ("en", "un"): 0.85, ("en", "eng"): 0.9,
    ("in", "ing"): 0.9, ("in", "ün"): 0.85,
    ("ang", "iang"): 0.9, ("ang", "uang"): 0.9,
    ("eng", "ing"): 0.85, ("eng", "ong"): 0.85, ("eng", "iong"): 0.85,
    ("ong", "iong"): 0.9,
    ("ai", "uai"): 0.9,
    ("ei", "ui"): 0.85,
    ("ao", "iao"): 0.9,
    ("ou", "iu"): 0.85,
}


def _build_symmetric_matrix():
    result = dict(VOWEL_SIMILARITY)
    for (a, b), v in list(result.items()):
        result[(b, a)] = v
    return result


VOWEL_SIM = _build_symmetric_matrix()

# Rough character frequency ranking (higher = more common)
# Based on general Chinese character frequency
COMMON_CHARS = set(
    "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动"
    "同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自"
    "理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那"
    "社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条"
    "只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次"
    "品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几"
    "九区强放决西被干做必战先回则任取完举色市青华容王呢古先世观深火手头眼声感比明"
)

TONE_MAP = str.maketrans(
    "āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ",
    "aaaaooooeeeeiiiiuuuuüüüü"
)


def remove_tone(pinyin: str) -> str:
    """Remove tone marks from pinyin."""
    return pinyin.translate(TONE_MAP)


def extract_final(pinyin_no_tone: str) -> str:
    """Extract the final (韵母) from a pinyin string."""
    py = pinyin_no_tone.lower()
    for final in FINALS:
        if py.endswith(final):
            return final
    initials = [
        "zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l",
        "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w"
    ]
    for ini in sorted(initials, key=len, reverse=True):
        if py.startswith(ini):
            return py[len(ini):]
    return py


def final_similarity(final_a: str, final_b: str) -> float:
    """Calculate similarity between two pinyin finals (0.0 - 1.0)."""
    if final_a == final_b:
        return 1.0
    key = (final_a, final_b)
    if key in VOWEL_SIM:
        return VOWEL_SIM[key]
    if final_a and final_b:
        if final_a in final_b or final_b in final_a:
            return 0.7
        shared = set(final_a) & set(final_b)
        if shared:
            return 0.5 + 0.3 * (len(shared) / max(len(final_a), len(final_b)))
    return 0.0


class RhymeDict:
    def __init__(self, dict_path: Optional[Path] = None):
        if dict_path is None:
            dict_path = Path(__file__).with_name("pinyin_dict.json")
        self.dict_path = dict_path
        self.char_to_pinyin: Dict[str, List[str]] = {}
        self.final_to_chars: Dict[str, List[str]] = {}
        self._load_dict()

    def _load_dict(self):
        with open(self.dict_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        for code, pinyin_str in raw.items():
            char = chr(int(code))
            o = ord(char)
            if not (0x4E00 <= o <= 0x9FFF):
                continue
            # Support multiple pronunciations
            pinyins = [p.strip() for p in pinyin_str.split(",")]
            self.char_to_pinyin[char] = pinyins
            for pinyin in pinyins:
                final = extract_final(remove_tone(pinyin))
                if char not in self.final_to_chars.get(final, []):
                    self.final_to_chars.setdefault(final, []).append(char)

    def lookup(self, char: str, limit: int = 20, 
               include_family: bool = True, 
               include_slant: bool = False,
               sort_by_freq: bool = True) -> Dict:
        """Lookup rhymes for a single Chinese character.
        
        Args:
            char: A single Chinese character
            limit: Max number of results
            include_family: Include family rhymes (similar finals)
            include_slant: Include slant rhymes (loosely similar)
            sort_by_freq: Sort common characters first
        """
        if len(char) != 1:
            return {"error": "Please input a single Chinese character."}

        pinyins = self.char_to_pinyin.get(char)
        if not pinyins:
            return {"error": f"Pinyin not found for '{char}'."}

        primary_pinyin = pinyins[0]
        primary_final = extract_final(remove_tone(primary_pinyin))
        
        # Collect all candidates with similarity scores
        candidates = []
        seen = set()
        
        for final, chars in self.final_to_chars.items():
            sim = final_similarity(final, primary_final)
            if sim >= 0.95:
                rtype = "exact"
            elif sim >= 0.7:
                if not include_family:
                    continue
                rtype = "family"
            elif sim >= 0.5:
                if not include_slant:
                    continue
                rtype = "slant"
            else:
                continue
            
            for c in chars:
                if c == char or c in seen:
                    continue
                seen.add(c)
                freq_score = 1 if c in COMMON_CHARS else 0
                candidates.append({
                    "char": c,
                    "final": final,
                    "similarity": round(sim, 2),
                    "type": rtype,
                    "freq_score": freq_score
                })
        
        # Sort: exact first, then by similarity, then by frequency
        if sort_by_freq:
            candidates.sort(key=lambda x: (x["type"] != "exact", -x["similarity"], -x["freq_score"]))
        else:
            random.shuffle(candidates)
        
        result_candidates = candidates[:limit]
        
        return {
            "char": char,
            "pinyin": primary_pinyin,
            "all_pinyins": pinyins,
            "final": primary_final,
            "rhyme_count": len(candidates),
            "rhymes": result_candidates,
        }

    def lookup_word(self, word: str, limit: int = 20,
                    include_family: bool = True,
                    include_slant: bool = False) -> Dict:
        """Lookup rhymes for a word (multi-syllable).
        
        Returns characters that rhyme with the LAST character of the word.
        """
        if not word:
            return {"error": "Empty word."}
        
        last_char = word[-1]
        result = self.lookup(last_char, limit=limit, 
                            include_family=include_family, 
                            include_slant=include_slant)
        result["query_word"] = word
        return result

    def suggest_rhyme_words(self, word: str, limit: int = 10) -> List[str]:
        """Suggest common two-character words ending with rhymes of the input word."""
        result = self.lookup_word(word, limit=limit * 3)
        if "error" in result:
            return []
        
        rhymes = result.get("rhymes", [])
        suggestions = []
        for r in rhymes:
            c = r["char"]
            # Generate simple word combinations
            # In a full implementation, we'd use a word dictionary
            suggestions.append(f"X{c}")  # Placeholder pattern
            if len(suggestions) >= limit:
                break
        return suggestions

    def batch_lookup(self, chars: List[str], limit: int = 10) -> List[Dict]:
        """Lookup rhymes for multiple characters."""
        return [self.lookup(c, limit=limit) for c in chars if len(c) == 1]


def main():
    parser = argparse.ArgumentParser(description="Enhanced Rhyme Dictionary Lookup")
    parser.add_argument("query", help="A Chinese character or word to lookup")
    parser.add_argument("-n", "--limit", type=int, default=20, help="Max number of rhyme results")
    parser.add_argument("-j", "--json", action="store_true", help="Output raw JSON")
    parser.add_argument("--family", action="store_true", default=True, help="Include family rhymes")
    parser.add_argument("--slant", action="store_true", default=False, help="Include slant rhymes")
    parser.add_argument("--no-freq-sort", action="store_true", help="Disable frequency sorting")
    args = parser.parse_args()

    dict_path = Path(__file__).with_name("pinyin_dict.json")
    if not dict_path.exists():
        print(f"Error: pinyin_dict.json not found at {dict_path}", file=sys.stderr)
        sys.exit(1)

    rd = RhymeDict(dict_path)
    
    # Check if query is single char or word
    if len(args.query) == 1:
        result = rd.lookup(
            args.query, 
            limit=args.limit,
            include_family=args.family,
            include_slant=args.slant,
            sort_by_freq=not args.no_freq_sort
        )
    else:
        result = rd.lookup_word(
            args.query,
            limit=args.limit,
            include_family=args.family,
            include_slant=args.slant,
            sort_by_freq=not args.no_freq_sort
        )

    if "error" in result:
        print(result["error"], file=sys.stderr)
        sys.exit(1)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        all_pinyins = result.get("all_pinyins", [result["pinyin"]])
        pinyin_str = "/".join(all_pinyins)
        word_note = f" (词尾: {result.get('query_word', '')})" if "query_word" in result else ""
        print(f"【{result['char']}】拼音: {pinyin_str} | 韵母: {result['final']}{word_note}")
        print(f"同韵字 ({result['rhyme_count']} 个，展示前 {len(result['rhymes'])} 个):")
        
        # Group by type
        exact = [r for r in result["rhymes"] if r["type"] == "exact"]
        family = [r for r in result["rhymes"] if r["type"] == "family"]
        slant = [r for r in result["rhymes"] if r["type"] == "slant"]
        
        if exact:
            print(f"  [完美押韵] {' '.join(r['char'] for r in exact[:args.limit])}")
        if family:
            remaining = args.limit - len(exact)
            if remaining > 0:
                print(f"  [家族韵]   {' '.join(r['char'] for r in family[:remaining])}")
        if slant:
            remaining = args.limit - len(exact) - len(family)
            if remaining > 0:
                print(f"  [斜韵]     {' '.join(r['char'] for r in slant[:remaining])}")


if __name__ == "__main__":
    main()
