#!/usr/bin/env python3
"""
Flow Analyzer for Rapper Coach.
Analyzes cadence, rhythm, stress patterns, and suggests flow improvements.
"""

import re
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional
from enum import Enum


class FlowType(Enum):
    ON_BEAT = "on_beat"           # 重音落在正拍
    OFF_BEAT = "off_beat"         # 反拍/弱拍
    DOUBLE_TIME = "double_time"   # 双倍速
    HALF_TIME = "half_time"       # 半速
    TRIPLET = "triplet"           # 三连音
    SYNCOPATED = "syncopated"     # 切分
    LAZY = "lazy"                 # 慵懒/拖拍


@dataclass
class Syllable:
    text: str
    is_stressed: bool = False
    is_filler: bool = False       # 语气词、虚词
    duration_weight: float = 1.0  # 相对时长权重


@dataclass
class Bar:
    index: int
    syllables: List[Syllable]
    beat_pattern: List[str] = None  # e.g., ["x", ".", "x", ".", "x", ".", "x", "."]
    flow_type: FlowType = FlowType.ON_BEAT
    breath_point: bool = False


@dataclass
class FlowAnalysis:
    bars: List[Bar]
    avg_syllables_per_bar: float
    flow_switches: List[Dict]
    breath_suggestions: List[Dict]
    pocket_score: float  # 0-10, how well it rides the beat
    variation_score: float  # 0-10, flow variety
    overall_score: float
    suggestions: List[str]


class FlowAnalyzer:
    # 中文虚词/轻读词列表
    FILLERS = {
        "的", "了", "着", "过", "在", "是", "就", "都", "也", "还", "又",
        "把", "被", "让", "给", "对", "向", "从", "和", "跟", "与", "同",
        "而", "但", "却", "因为", "所以", "虽然", "如果", "那么", "而且",
        "我", "你", "他", "她", "它", "们", "这", "那", "个", "些"
    }
    
    # 重读暗示词（通常需要强调）
    STRESS_WORDS = {
        "不", "没", "无", "非", "别", "未", "否", "莫",
        "最", "很", "太", "极", "非常", "特别", "超级",
        "杀", "炸", "爆", "冲", "干", "打", "砍", "烧", "轰",
        "死", "疯", "狂", "狠", "硬", "强", "猛", "绝"
    }

    def __init__(self):
        pass

    def segment_syllables(self, text: str) -> List[Syllable]:
        """Segment Chinese text into syllables with stress hints."""
        syllables = []
        # Extract Chinese characters and some punctuation
        tokens = re.findall(r'[\u4e00-\u9fff]+|[^\u4e00-\u9fff\s]+', text)
        
        for token in tokens:
            if re.match(r'[\u4e00-\u9fff]+', token):
                for char in token:
                    is_filler = char in self.FILLERS
                    is_stressed = char in self.STRESS_WORDS
                    weight = 0.6 if is_filler else (1.3 if is_stressed else 1.0)
                    syllables.append(Syllable(
                        text=char,
                        is_stressed=is_stressed,
                        is_filler=is_filler,
                        duration_weight=weight
                    ))
            else:
                # Non-Chinese token (English, numbers, etc.)
                # Simple syllable estimation
                parts = self._estimate_english_syllables(token)
                for part in parts:
                    syllables.append(Syllable(text=part, is_stressed=False, duration_weight=1.0))
        
        return syllables

    def _estimate_english_syllables(self, word: str) -> List[str]:
        """Very simple English syllable estimation."""
        word = word.lower()
        # Count vowel groups as syllables
        import re as re_mod
        vowel_groups = re_mod.findall(r'[aeiouy]+', word)
        if not vowel_groups:
            return [word]
        # Split roughly by syllable count
        count = len(vowel_groups)
        if count <= 1:
            return [word]
        # Rough split
        chunk_size = max(1, len(word) // count)
        return [word[i:i+chunk_size] for i in range(0, len(word), chunk_size)]

    def split_into_bars(self, syllables: List[Syllable], 
                        beats_per_bar: int = 4, 
                        subdivisions: int = 2) -> List[Bar]:
        """Split syllables into bars based on estimated timing."""
        slots_per_bar = beats_per_bar * subdivisions  # 8 slots for 4/4 with 8th notes
        bars = []
        current_bar_syllables = []
        current_slots = 0.0
        bar_idx = 0
        
        for syl in syllables:
            needed = syl.duration_weight
            if current_slots + needed > slots_per_bar and current_bar_syllables:
                bars.append(self._make_bar(bar_idx, current_bar_syllables, slots_per_bar))
                bar_idx += 1
                current_bar_syllables = [syl]
                current_slots = needed
            else:
                current_bar_syllables.append(syl)
                current_slots += needed
        
        if current_bar_syllables:
            bars.append(self._make_bar(bar_idx, current_bar_syllables, slots_per_bar))
        
        return bars

    def _make_bar(self, index: int, syllables: List[Syllable], slots_per_bar: int) -> Bar:
        """Create a Bar with beat pattern."""
        total_weight = sum(s.duration_weight for s in syllables) or 1.0
        pattern = ["."] * slots_per_bar
        
        pos = 0.0
        for syl in syllables:
            slot = int((pos / total_weight) * slots_per_bar)
            slot = min(slot, slots_per_bar - 1)
            mark = "X" if syl.is_stressed else "x"
            if pattern[slot] == ".":
                pattern[slot] = mark
            pos += syl.duration_weight
        
        # Detect flow type
        flow_type = self._detect_flow_type(syllables, pattern)
        
        return Bar(
            index=index,
            syllables=syllables,
            beat_pattern=pattern,
            flow_type=flow_type,
            breath_point=False
        )

    def _detect_flow_type(self, syllables: List[Syllable], pattern: List[str]) -> FlowType:
        """Heuristic flow type detection."""
        count = len(syllables)
        stressed = sum(1 for s in syllables if s.is_stressed)
        
        if count >= 10:
            return FlowType.DOUBLE_TIME
        if count <= 2:
            return FlowType.HALF_TIME
        if stressed == 0 and count >= 5:
            return FlowType.LAZY
        
        # Check syncopation
        x_positions = [i for i, p in enumerate(pattern) if p in ("x", "X")]
        if x_positions:
            odd_positions = sum(1 for p in x_positions if p % 2 == 1)
            if odd_positions / len(x_positions) > 0.6:
                return FlowType.SYNCOPATED
        
        return FlowType.ON_BEAT

    def suggest_breath_points(self, bars: List[Bar]) -> List[Dict]:
        """Suggest natural breath points between bars."""
        suggestions = []
        for i, bar in enumerate(bars):
            syl_count = len(bar.syllables)
            if syl_count >= 9:
                suggestions.append({
                    "after_bar": i,
                    "reason": f"Bar {i+1} has {syl_count} syllables — too dense, need breath",
                    "urgency": "high"
                })
            elif syl_count >= 7:
                suggestions.append({
                    "after_bar": i,
                    "reason": f"Bar {i+1} has {syl_count} syllables — consider a quick breath",
                    "urgency": "medium"
                })
            elif i > 0 and bars[i-1].flow_type != bar.flow_type:
                suggestions.append({
                    "after_bar": i - 1,
                    "reason": f"Flow switch between bar {i} and {i+1} — breathe before transition",
                    "urgency": "medium"
                })
        return suggestions

    def detect_flow_switches(self, bars: List[Bar]) -> List[Dict]:
        """Detect and suggest impactful flow switches."""
        switches = []
        for i in range(1, len(bars)):
            prev_type = bars[i-1].flow_type
            curr_type = bars[i].flow_type
            if prev_type != curr_type:
                switches.append({
                    "between_bars": (i, i+1),
                    "from": prev_type.value,
                    "to": curr_type.value,
                    "impact": self._switch_impact(prev_type, curr_type)
                })
        
        # Suggest switches if none found (too monotonous)
        if len(switches) == 0 and len(bars) >= 4:
            mid = len(bars) // 2
            switches.append({
                "between_bars": (mid, mid+1),
                "from": bars[mid-1].flow_type.value,
                "to": "suggested_double_time",
                "impact": "high",
                "note": "Flow is too uniform. Suggest switching to double time or syncopation here for impact."
            })
        
        return switches

    def _switch_impact(self, from_type: FlowType, to_type: FlowType) -> str:
        """Estimate impact of a flow switch."""
        high_impact_pairs = {
            (FlowType.HALF_TIME, FlowType.DOUBLE_TIME),
            (FlowType.DOUBLE_TIME, FlowType.HALF_TIME),
            (FlowType.LAZY, FlowType.DOUBLE_TIME),
            (FlowType.ON_BEAT, FlowType.SYNCOPATED),
        }
        if (from_type, to_type) in high_impact_pairs:
            return "high"
        if from_type == FlowType.ON_BEAT and to_type == FlowType.ON_BEAT:
            return "low"
        return "medium"

    def calculate_pocket_score(self, bars: List[Bar]) -> float:
        """Calculate how well the lyrics ride the beat (0-10)."""
        if not bars:
            return 0.0
        scores = []
        for bar in bars:
            pattern = bar.beat_pattern
            if not pattern:
                continue
            # Count stressed syllables on strong beats (0, 2, 4, 6 in 8-slot)
            strong_beats = [i for i in range(0, len(pattern), 2)]
            stressed_on_strong = sum(1 for i in strong_beats if i < len(pattern) and pattern[i] == "X")
            total_stressed = sum(1 for p in pattern if p == "X")
            if total_stressed > 0:
                scores.append(stressed_on_strong / total_stressed)
            else:
                scores.append(0.5)
        
        avg = sum(scores) / len(scores) if scores else 0
        # Penalize overcrowded bars
        overcrowded = sum(1 for b in bars if len(b.syllables) > 10)
        penalty = min(overcrowded * 0.5, 3.0)
        return round(min(10, max(0, avg * 10 - penalty)), 1)

    def calculate_variation_score(self, bars: List[Bar]) -> float:
        """Calculate flow variety score (0-10)."""
        if len(bars) < 2:
            return 5.0
        
        types = [b.flow_type for b in bars]
        unique_types = len(set(types))
        density_variance = self._density_variance(bars)
        
        score = unique_types * 2 + density_variance * 2
        return round(min(10, score), 1)

    def _density_variance(self, bars: List[Bar]) -> float:
        """Calculate variance in syllable count across bars."""
        counts = [len(b.syllables) for b in bars]
        if not counts:
            return 0.0
        avg = sum(counts) / len(counts)
        variance = sum((c - avg) ** 2 for c in counts) / len(counts)
        return min(variance ** 0.5, 5.0)  # Cap at 5

    def generate_suggestions(self, bars: List[Bar], breath_suggestions: List[Dict],
                             flow_switches: List[Dict]) -> List[str]:
        """Generate human-readable flow improvement suggestions."""
        suggestions = []
        
        # Check for overcrowding
        overcrowded = [b for b in bars if len(b.syllables) > 10]
        if overcrowded:
            suggestions.append(
                f"发现 {len(overcrowded)} 个小节过于拥挤（>10 字），建议拆分或加快语速。"
            )
        
        # Check for monotony
        types = [b.flow_type for b in bars]
        if len(set(types)) == 1 and len(bars) >= 4:
            suggestions.append(
                f"Flow 过于单一（全是 {types[0].value}），建议在中间加入变速或切分来增加层次感。"
            )
        
        # Breath suggestions
        high_urgency = [b for b in breath_suggestions if b.get("urgency") == "high"]
        if high_urgency:
            suggestions.append(
                f"有 {len(high_urgency)} 处急需换气，否则会导致吃字或气息不稳。"
            )
        
        # Flow switch suggestions
        suggested = [s for s in flow_switches if "suggested" in s.get("to", "")]
        for s in suggested:
            suggestions.append(s.get("note", ""))
        
        # Check for weak starts
        for bar in bars:
            if bar.beat_pattern and bar.beat_pattern[0] == ".":
                suggestions.append(
                    f"第 {bar.index+1} 小节以弱拍开始，尝试把重音前置到第一拍增强冲击力。"
                )
                break  # Only mention once
        
        if not suggestions:
            suggestions.append("Flow 整体不错，韵脚和节奏分布比较均衡。")
        
        return suggestions

    def analyze(self, text: str, beats_per_bar: int = 4) -> FlowAnalysis:
        """Main analysis entry point."""
        syllables = self.segment_syllables(text)
        bars = self.split_into_bars(syllables, beats_per_bar=beats_per_bar)
        
        breath_suggestions = self.suggest_breath_points(bars)
        flow_switches = self.detect_flow_switches(bars)
        pocket = self.calculate_pocket_score(bars)
        variation = self.calculate_variation_score(bars)
        overall = round((pocket + variation) / 2, 1)
        suggestions = self.generate_suggestions(bars, breath_suggestions, flow_switches)
        
        avg_syl = round(sum(len(b.syllables) for b in bars) / len(bars), 1) if bars else 0
        
        return FlowAnalysis(
            bars=bars,
            avg_syllables_per_bar=avg_syl,
            flow_switches=flow_switches,
            breath_suggestions=breath_suggestions,
            pocket_score=pocket,
            variation_score=variation,
            overall_score=overall,
            suggestions=suggestions
        )

    def format_beat_visualization(self, analysis: FlowAnalysis) -> str:
        """Generate a visual beat pattern representation."""
        lines = []
        for bar in analysis.bars:
            pattern = bar.beat_pattern or ["."] * 8
            pat_str = " ".join(pattern)
            text = "".join(s.text for s in bar.syllables)
            flow_label = bar.flow_type.value
            lines.append(f"[Bar {bar.index+1:2d}] {pat_str}  ({flow_label})")
            lines.append(f"         {text}")
        return "\n".join(lines)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Flow Analyzer")
    parser.add_argument("text", help="Lyrics to analyze")
    parser.add_argument("--beats", type=int, default=4, help="Beats per bar")
    args = parser.parse_args()
    
    analyzer = FlowAnalyzer()
    result = analyzer.analyze(args.text, beats_per_bar=args.beats)
    
    print(analyzer.format_beat_visualization(result))
    print(f"\nAvg syllables/bar: {result.avg_syllables_per_bar}")
    print(f"Pocket score: {result.pocket_score}/10")
    print(f"Variation score: {result.variation_score}/10")
    print(f"Overall: {result.overall_score}/10")
    print(f"\nBreath points:")
    for b in result.breath_suggestions:
        print(f"  [{b['urgency']}] {b['reason']}")
    print(f"\nFlow switches:")
    for s in result.flow_switches:
        print(f"  Bar {s['between_bars']}: {s['from']} -> {s['to']} ({s['impact']})")
    print(f"\nSuggestions:")
    for sug in result.suggestions:
        print(f"  - {sug}")


if __name__ == "__main__":
    main()
