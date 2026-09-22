#!/usr/bin/env python3
"""
Enhanced Rhyme Engine for Rapper Coach.
Supports: single-syllable rhyme, multi-syllable rhyme, family rhyme, slant rhyme.
"""

import json
import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Set
from collections import defaultdict

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

# Vowel similarity matrix for family rhyme & slant rhyme
VOWEL_SIMILARITY = {
    # Same family: high similarity
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

# Slant rhyme: similar but not exact
SLANT_THRESHOLD = 0.6
FAMILY_THRESHOLD = 0.8
EXACT_THRESHOLD = 0.95


def _build_symmetric_matrix():
    """Make vowel similarity matrix symmetric."""
    result = dict(VOWEL_SIMILARITY)
    for (a, b), v in list(result.items()):
        result[(b, a)] = v
    return result


VOWEL_SIM = _build_symmetric_matrix()

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
    # Partial overlap heuristic
    if final_a and final_b:
        # Check if one contains the other
        if final_a in final_b or final_b in final_a:
            return 0.7
        # Check shared characters
        shared = set(final_a) & set(final_b)
        if shared:
            return 0.5 + 0.3 * (len(shared) / max(len(final_a), len(final_b)))
    return 0.0


def rhyme_type(similarity: float) -> str:
    """Classify rhyme type based on similarity."""
    if similarity >= EXACT_THRESHOLD:
        return "exact"
    if similarity >= FAMILY_THRESHOLD:
        return "family"
    if similarity >= SLANT_THRESHOLD:
        return "slant"
    return "none"


@dataclass
class PinyinInfo:
    char: str
    pinyin: str
    pinyin_no_tone: str
    final: str


@dataclass
class RhymeMatch:
    word_a: str
    word_b: str
    finals_a: List[str]
    finals_b: List[str]
    similarity: float
    match_type: str  # exact, family, slant, none
    is_multisyllable: bool = False


class RhymeEngine:
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

    def get_pinyin_info(self, char: str) -> List[PinyinInfo]:
        """Get pinyin info for a single character (supports multi-pronunciation)."""
        if len(char) != 1:
            return []
        pinyins = self.char_to_pinyin.get(char, [])
        return [
            PinyinInfo(
                char=char,
                pinyin=p,
                pinyin_no_tone=remove_tone(p),
                final=extract_final(remove_tone(p))
            )
            for p in pinyins
        ]

    def get_word_pinyin(self, word: str) -> List[List[PinyinInfo]]:
        """Get all possible pinyin combinations for a word."""
        char_infos = []
        for char in word:
            infos = self.get_pinyin_info(char)
            if not infos:
                # Fallback: treat as itself
                infos = [PinyinInfo(char=char, pinyin=char, pinyin_no_tone=char, final=char)]
            char_infos.append(infos)
        # Return cartesian product of pronunciations
        from itertools import product
        return [list(combo) for combo in product(*char_infos)]

    def match_syllables(self, finals_a: List[str], finals_b: List[str]) -> Tuple[float, bool]:
        """Match two syllable sequences and return (similarity, is_multisyllable)."""
        if not finals_a or not finals_b:
            return 0.0, False
        
        len_a, len_b = len(finals_a), len(finals_b)
        is_multi = max(len_a, len_b) > 1
        
        # For multisyllable, require same syllable count for exact match
        if len_a == len_b:
            sims = [final_similarity(fa, fb) for fa, fb in zip(finals_a, finals_b)]
            avg_sim = sum(sims) / len(sims)
            return avg_sim, is_multi
        
        # Different lengths: try to align by taking the shorter one's finals
        # against a window in the longer one
        if len_a < len_b:
            shorter, longer = finals_a, finals_b
        else:
            shorter, longer = finals_b, finals_a
        
        best_sim = 0.0
        for i in range(len(longer) - len(shorter) + 1):
            window = longer[i:i + len(shorter)]
            sims = [final_similarity(sa, la) for sa, la in zip(shorter, window)]
            avg_sim = sum(sims) / len(sims)
            if avg_sim > best_sim:
                best_sim = avg_sim
        
        # Penalize length mismatch
        best_sim *= min(len_a, len_b) / max(len_a, len_b)
        return best_sim, is_multi

    def match_words(self, word_a: str, word_b: str) -> List[RhymeMatch]:
        """Find all rhyme matches between two words (including all pronunciations)."""
        combos_a = self.get_word_pinyin(word_a)
        combos_b = self.get_word_pinyin(word_b)
        
        matches = []
        seen = set()
        for combo_a in combos_a:
            for combo_b in combos_b:
                finals_a = [p.final for p in combo_a]
                finals_b = [p.final for p in combo_b]
                sim, is_multi = self.match_syllables(finals_a, finals_b)
                key = (tuple(finals_a), tuple(finals_b))
                if key in seen:
                    continue
                seen.add(key)
                matches.append(RhymeMatch(
                    word_a=word_a,
                    word_b=word_b,
                    finals_a=finals_a,
                    finals_b=finals_b,
                    similarity=sim,
                    match_type=rhyme_type(sim),
                    is_multisyllable=is_multi
                ))
        # Return best match first
        matches.sort(key=lambda m: m.similarity, reverse=True)
        return matches

    def find_rhymes_for_word(self, word: str, limit: int = 20, 
                             include_family: bool = True, 
                             include_slant: bool = True) -> List[Dict]:
        """Find rhyming words for a given word."""
        combos = self.get_word_pinyin(word)
        if not combos:
            return []
        
        # Use the most common pronunciation
        target_finals = [p.final for p in combos[0]]
        target_len = len(target_finals)
        
        candidates = []
        # Search through dictionary for candidates
        for char, pinyins in self.char_to_pinyin.items():
            for p in pinyins:
                final = extract_final(remove_tone(p))
                sim = final_similarity(final, target_finals[-1]) if target_finals else 0
                if sim >= SLANT_THRESHOLD:
                    candidates.append((char, final, sim))
        
        # Deduplicate and sort
        seen = set()
        results = []
        for char, final, sim in sorted(candidates, key=lambda x: x[2], reverse=True):
            if char in seen or char == word:
                continue
            seen.add(char)
            rtype = rhyme_type(sim)
            if rtype == "exact" or (rtype == "family" and include_family) or (rtype == "slant" and include_slant):
                results.append({
                    "char": char,
                    "final": final,
                    "similarity": round(sim, 2),
                    "type": rtype
                })
            if len(results) >= limit:
                break
        
        return results

    def analyze_line_rhymes(self, line: str, window: int = 2) -> List[Dict]:
        """Analyze a line of lyrics for rhyme patterns.
        
        Args:
            line: A line of Chinese lyrics
            window: How many preceding lines/bars to check for rhymes
        
        Returns:
            List of rhyme group findings
        """
        # Simple word segmentation: split by non-CJK chars and extract last 1-2 chars of each phrase
        phrases = re.findall(r'[\u4e00-\u9fff]+', line)
        if not phrases:
            return []
        
        # Extract tail words (potential rhyme words)
        tail_words = []
        for phrase in phrases:
            # Try last 2 chars first, then last 1 char
            if len(phrase) >= 2:
                tail_words.append(phrase[-2:])
            tail_words.append(phrase[-1:])
        
        # Remove duplicates while preserving order
        seen = set()
        unique_tails = []
        for w in tail_words:
            if w not in seen:
                seen.add(w)
                unique_tails.append(w)
        
        # Find rhyme groups
        groups = []
        used = set()
        for i, word_a in enumerate(unique_tails):
            if word_a in used:
                continue
            group = [word_a]
            used.add(word_a)
            for word_b in unique_tails[i+1:]:
                if word_b in used:
                    continue
                matches = self.match_words(word_a, word_b)
                if matches and matches[0].match_type in ("exact", "family", "slant"):
                    group.append(word_b)
                    used.add(word_b)
            if len(group) >= 2:
                # Determine group rhyme type
                best_type = "exact"
                for a in group:
                    for b in group:
                        if a != b:
                            matches = self.match_words(a, b)
                            if matches:
                                mt = matches[0].match_type
                                if mt == "slant":
                                    best_type = "slant"
                                elif mt == "family" and best_type != "slant":
                                    best_type = "family"
                groups.append({
                    "words": group,
                    "type": best_type,
                    "count": len(group)
                })
        
        return groups

    def check_rhyme_scheme(self, lines: List[str]) -> Dict:
        """Analyze rhyme scheme across multiple lines."""
        if not lines:
            return {"scheme": "", "groups": [], "score": 0}
        
        # Extract last meaningful word from each line
        tail_words = []
        for line in lines:
            phrases = re.findall(r'[\u4e00-\u9fff]+', line)
            if phrases:
                last_phrase = phrases[-1]
                tail_words.append(last_phrase[-1] if len(last_phrase) >= 1 else last_phrase)
            else:
                tail_words.append("")
        
        # Group lines by rhyme
        rhyme_groups = []
        line_to_group = [-1] * len(tail_words)
        
        for i, word_a in enumerate(tail_words):
            if not word_a or line_to_group[i] >= 0:
                continue
            group = [i]
            line_to_group[i] = len(rhyme_groups)
            for j, word_b in enumerate(tail_words[i+1:], start=i+1):
                if not word_b or line_to_group[j] >= 0:
                    continue
                matches = self.match_words(word_a, word_b)
                if matches and matches[0].match_type in ("exact", "family"):
                    group.append(j)
                    line_to_group[j] = len(rhyme_groups)
            rhyme_groups.append(group)
        
        # Build scheme string (AABB, ABAB, etc.)
        scheme_chars = []
        char_idx = 0
        group_chars = {}
        for g_idx, group in enumerate(rhyme_groups):
            if len(group) >= 2:
                ch = chr(ord('A') + char_idx)
                char_idx += 1
                group_chars[g_idx] = ch
        
        for i in range(len(tail_words)):
            g = line_to_group[i]
            if g >= 0 and g in group_chars and len(rhyme_groups[g]) >= 2:
                scheme_chars.append(group_chars[g])
            else:
                scheme_chars.append('X')
        
        scheme = ''.join(scheme_chars)
        
        # Calculate rhyme density score
        rhymed_lines = sum(1 for g in rhyme_groups if len(g) >= 2)
        score = round((rhymed_lines / len(tail_words)) * 10, 1) if tail_words else 0
        
        return {
            "scheme": scheme,
            "groups": [
                {
                    "lines": g,
                    "words": [tail_words[i] for i in g],
                    "type": self._group_rhyme_type([tail_words[i] for i in g])
                }
                for g in rhyme_groups if len(g) >= 2
            ],
            "score": score,
            "tail_words": tail_words
        }
    
    def _group_rhyme_type(self, words: List[str]) -> str:
        """Determine the dominant rhyme type in a group."""
        types = []
        for i, a in enumerate(words):
            for b in words[i+1:]:
                matches = self.match_words(a, b)
                if matches:
                    types.append(matches[0].match_type)
        if not types:
            return "none"
        if all(t == "exact" for t in types):
            return "exact"
        if all(t in ("exact", "family") for t in types):
            return "family"
        return "slant"


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Enhanced Rhyme Engine")
    parser.add_argument("word", help="Word to analyze")
    parser.add_argument("--match-with", help="Another word to match against")
    parser.add_argument("--lines", nargs="+", help="Lines to analyze rhyme scheme")
    parser.add_argument("--find-rhymes", action="store_true", help="Find rhyming words")
    args = parser.parse_args()
    
    engine = RhymeEngine()
    
    if args.match_with:
        matches = engine.match_words(args.word, args.match_with)
        for m in matches[:3]:
            print(f"Match: {m.word_a} vs {m.word_b}")
            print(f"  Finals: {m.finals_a} vs {m.finals_b}")
            print(f"  Similarity: {m.similarity:.2f} ({m.match_type})")
            print(f"  Multi-syllable: {m.is_multisyllable}")
    elif args.find_rhymes:
        rhymes = engine.find_rhymes_for_word(args.word, limit=20)
        print(f"Rhymes for '{args.word}':")
        for r in rhymes:
            print(f"  {r['char']} ({r['final']}) - {r['type']} [{r['similarity']}]")
    elif args.lines:
        result = engine.check_rhyme_scheme(args.lines)
        print(f"Rhyme Scheme: {result['scheme']}")
        print(f"Score: {result['score']}/10")
        for g in result['groups']:
            print(f"  Group ({g['type']}): lines {g['lines']} -> {g['words']}")
    else:
        groups = engine.analyze_line_rhymes(args.word)
        for g in groups:
            print(f"Rhyme group ({g['type']}): {g['words']}")


if __name__ == "__main__":
    main()
