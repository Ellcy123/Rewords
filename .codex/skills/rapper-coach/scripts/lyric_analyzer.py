#!/usr/bin/env python3
"""
Lyric Analyzer for Rapper Coach.
Comprehensive analysis combining rhyme engine, flow analyzer, and punchline detection.
"""

import sys
import json
import re
import argparse
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import asdict

from rhyme_engine import RhymeEngine
from flow_analyzer import FlowAnalyzer


class LyricAnalyzer:
    def __init__(self):
        self.rhyme_engine = RhymeEngine()
        self.flow_analyzer = FlowAnalyzer()

    def split_verses(self, text: str) -> Dict[str, List[str]]:
        """Split lyrics into sections (Verse, Hook, Bridge, etc.)."""
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        
        sections = {
            "intro": [],
            "verses": [],
            "hooks": [],
            "bridges": [],
            "outro": [],
            "unknown": []
        }
        
        current_section = "unknown"
        current_lines = []
        
        for line in lines:
            lower = line.lower().replace(" ", "")
            if any(tag in lower for tag in ["[verse", "(verse", "verse1", "verse2", "verse:", "主歌"]):
                if current_lines:
                    sections[current_section].extend(current_lines)
                current_section = "verses"
                current_lines = []
            elif any(tag in lower for tag in ["[hook", "(hook", "[chorus", "(chorus", "hook:", "副歌", "hook"]):
                if current_lines:
                    sections[current_section].extend(current_lines)
                current_section = "hooks"
                current_lines = []
            elif any(tag in lower for tag in ["[bridge", "(bridge", "bridge:", "桥段"]):
                if current_lines:
                    sections[current_section].extend(current_lines)
                current_section = "bridges"
                current_lines = []
            elif any(tag in lower for tag in ["[intro", "(intro", "intro:", "前奏"]):
                if current_lines:
                    sections[current_section].extend(current_lines)
                current_section = "intro"
                current_lines = []
            elif any(tag in lower for tag in ["[outro", "(outro", "outro:", "尾奏"]):
                if current_lines:
                    sections[current_section].extend(current_lines)
                current_section = "outro"
                current_lines = []
            else:
                current_lines.append(line)
        
        if current_lines:
            sections[current_section].extend(current_lines)
        
        # If no sections detected, treat all as verses
        if all(len(v) == 0 for k, v in sections.items() if k != "unknown"):
            sections["verses"] = lines
            sections["unknown"] = []
        
        return sections

    def analyze_rhyme_density(self, lines: List[str]) -> Dict:
        """Calculate rhyme density metrics."""
        if not lines:
            return {"score": 0, "scheme": "", "details": []}
        
        result = self.rhyme_engine.check_rhyme_scheme(lines)
        total_lines = len(lines)
        rhymed = len(result.get("groups", []))
        
        # Internal rhyme analysis
        internal_rhymes = 0
        for line in lines:
            groups = self.rhyme_engine.analyze_line_rhymes(line)
            for g in groups:
                if g["type"] in ("exact", "family"):
                    internal_rhymes += g["count"]
        
        return {
            "score": result["score"],
            "scheme": result["scheme"],
            "tail_rhyme_groups": result["groups"],
            "internal_rhyme_count": internal_rhymes,
            "rhymed_line_ratio": round(len([g for g in result.get("groups", []) if g["lines"]]) / total_lines, 2) if total_lines else 0
        }

    def detect_punchlines(self, lines: List[str]) -> List[Dict]:
        """Detect potential punchlines in lyrics."""
        punchlines = []
        
        for i, line in enumerate(lines):
            score = 0
            reasons = []
            
            # Wordplay indicators: quotes, word repetition with twist
            if "'" in line or '"' in line or "「" in line or "『" in line:
                score += 1
                reasons.append("contains quotes/wordplay")
            
            # Strong ending punctuation
            if line.endswith(("!", "！", "?", "？")):
                score += 1
                reasons.append("strong punctuation ending")
            
            # Contrast words
            contrast_words = ["但是", "可是", "却", "反而", "不过", "然而", "不是", "而是"]
            if any(w in line for w in contrast_words):
                score += 2
                reasons.append("contrast/twist structure")
            
            # Metaphor indicators
            metaphor_words = ["像", "仿佛", "如同", "是", "就是", "好比"]
            if any(w in line for w in metaphor_words):
                score += 1
                reasons.append("metaphor/simile")
            
            # Self-reference or boast
            boast_words = ["我", "老子", "爷", "哥", "最", "第一", "无敌", "王者"]
            if sum(1 for w in boast_words if w in line) >= 2:
                score += 1
                reasons.append("self-reference/boast")
            
            # Setup-punchline pattern: previous line sets up, this line delivers
            if i > 0:
                prev = lines[i-1]
                # If previous line ends with a pause/connector and this line is short
                if len(prev) > len(line) * 1.5 and len(line) < 15:
                    score += 2
                    reasons.append("setup-punchline length contrast")
            
            if score >= 3:
                punchlines.append({
                    "line_index": i,
                    "line": line,
                    "score": score,
                    "reasons": reasons
                })
        
        return sorted(punchlines, key=lambda x: x["score"], reverse=True)

    def analyze_vocabulary(self, lines: List[str]) -> Dict:
        """Analyze vocabulary richness and repetition."""
        all_chars = []
        for line in lines:
            chars = re.findall(r'[\u4e00-\u9fff]', line)
            all_chars.extend(chars)
        
        total = len(all_chars)
        unique = len(set(all_chars))
        
        # Count repetitions
        char_counts = {}
        for c in all_chars:
            char_counts[c] = char_counts.get(c, 0) + 1
        
        most_repeated = sorted(char_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_chars": total,
            "unique_chars": unique,
            "richness_ratio": round(unique / total, 2) if total else 0,
            "most_repeated": [{"char": c, "count": n} for c, n in most_repeated],
            "repetition_warning": any(n > total * 0.1 for _, n in most_repeated) if total else False
        }

    def analyze_section(self, lines: List[str], section_name: str) -> Dict:
        """Analyze a single section of lyrics."""
        if not lines:
            return {"section": section_name, "empty": True}
        
        text = "\n".join(lines)
        
        # Rhyme analysis
        rhyme_analysis = self.analyze_rhyme_density(lines)
        
        # Flow analysis
        flow_analysis = self.flow_analyzer.analyze(text)
        
        # Punchline detection
        punchlines = self.detect_punchlines(lines)
        
        # Vocabulary analysis
        vocab = self.analyze_vocabulary(lines)
        
        return {
            "section": section_name,
            "line_count": len(lines),
            "rhyme": rhyme_analysis,
            "flow": {
                "pocket_score": flow_analysis.pocket_score,
                "variation_score": flow_analysis.variation_score,
                "overall_score": flow_analysis.overall_score,
                "avg_syllables_per_bar": flow_analysis.avg_syllables_per_bar,
                "breath_points": flow_analysis.breath_suggestions,
                "flow_switches": flow_analysis.flow_switches,
                "beat_visualization": self.flow_analyzer.format_beat_visualization(flow_analysis)
            },
            "punchlines": punchlines,
            "vocabulary": vocab
        }

    def analyze(self, text: str) -> Dict:
        """Main entry point: comprehensive lyric analysis."""
        sections = self.split_verses(text)
        
        section_results = []
        overall_scores = []
        
        for name, lines in sections.items():
            if not lines:
                continue
            result = self.analyze_section(lines, name)
            section_results.append(result)
            if "flow" in result:
                overall_scores.append(result["flow"]["overall_score"])
            if "rhyme" in result:
                overall_scores.append(result["rhyme"]["score"])
        
        overall = round(sum(overall_scores) / len(overall_scores), 1) if overall_scores else 0
        
        # Generate overall suggestions
        suggestions = self._generate_overall_suggestions(section_results)
        
        return {
            "overall_score": overall,
            "sections": section_results,
            "suggestions": suggestions
        }
    
    def _generate_overall_suggestions(self, section_results: List[Dict]) -> List[str]:
        """Generate overall improvement suggestions."""
        suggestions = []
        
        rhyme_scores = []
        flow_scores = []
        all_punchlines = []
        
        for sec in section_results:
            if "rhyme" in sec:
                rhyme_scores.append(sec["rhyme"].get("score", 0))
            if "flow" in sec:
                flow_scores.append(sec["flow"].get("overall_score", 0))
            if "punchlines" in sec:
                all_punchlines.extend(sec["punchlines"])
        
        avg_rhyme = sum(rhyme_scores) / len(rhyme_scores) if rhyme_scores else 0
        avg_flow = sum(flow_scores) / len(flow_scores) if flow_scores else 0
        
        if avg_rhyme < 5:
            suggestions.append("韵脚密度偏低，尝试增加尾韵的规律性，或使用更多的多音节押韵。")
        elif avg_rhyme > 8:
            suggestions.append("韵脚密度很高！注意不要让押韵牺牲掉内容表达的自然度。")
        
        if avg_flow < 5:
            suggestions.append("Flow 节奏感不足，建议调整音节分布，让重音更贴合拍子。")
        
        if len(all_punchlines) < 2:
            suggestions.append("Punchline 数量偏少，尝试加入更多转折、比喻或自我指涉来增强冲击力。")
        
        # Check for repetition across sections
        vocab_warnings = []
        for sec in section_results:
            if sec.get("vocabulary", {}).get("repetition_warning"):
                vocab_warnings.append(sec["section"])
        if vocab_warnings:
            suggestions.append(f"{'、'.join(vocab_warnings)} 部分存在高频重复用词，建议丰富词汇多样性。")
        
        if not suggestions:
            suggestions.append("整体水平不错！韵脚、Flow 和 Punchline 都比较均衡。")
        
        return suggestions

    def format_report(self, analysis: Dict) -> str:
        """Format analysis result as human-readable report."""
        lines = []
        lines.append("=" * 50)
        lines.append(f"🎤 Rapper Coach 分析报告")
        lines.append(f"综合评分: {analysis['overall_score']}/10")
        lines.append("=" * 50)
        
        for sec in analysis["sections"]:
            if sec.get("empty"):
                continue
            lines.append(f"\n📌 [{sec['section'].upper()}] ({sec['line_count']} 行)")
            
            if "rhyme" in sec:
                r = sec["rhyme"]
                lines.append(f"  韵脚评分: {r['score']}/10 | 韵脚模式: {r['scheme']}")
                lines.append(f"  内部韵: {r['internal_rhyme_count']} 处")
            
            if "flow" in sec:
                f = sec["flow"]
                lines.append(f"  Flow评分: {f['overall_score']}/10 (贴合度:{f['pocket_score']} 变化度:{f['variation_score']})")
                lines.append(f"  平均音节/小节: {f['avg_syllables_per_bar']}")
                
                if f["breath_points"]:
                    urgent = [b for b in f["breath_points"] if b["urgency"] == "high"]
                    if urgent:
                        lines.append(f"  ⚠️ 急需换气: {len(urgent)} 处")
                
                if f["flow_switches"]:
                    lines.append(f"  Flow切换: {len(f['flow_switches'])} 处")
                
                lines.append(f"  拍子图:\n{f['beat_visualization']}")
            
            if sec.get("punchlines"):
                lines.append(f"  💥 Punchlines:")
                for p in sec["punchlines"][:3]:
                    lines.append(f"    L{p['line_index']+1}: {p['line']} (score:{p['score']})")
            
            if "vocabulary" in sec:
                v = sec["vocabulary"]
                lines.append(f"  词汇丰富度: {v['richness_ratio']} ({v['unique_chars']}/{v['total_chars']})")
        
        lines.append(f"\n💡 改进建议:")
        for sug in analysis["suggestions"]:
            lines.append(f"  • {sug}")
        
        lines.append("=" * 50)
        return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Lyric Analyzer")
    parser.add_argument("input", help="Lyrics text or file path")
    parser.add_argument("--file", action="store_true", help="Treat input as file path")
    parser.add_argument("-j", "--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()
    
    if args.file:
        with open(args.input, "r", encoding="utf-8") as f:
            text = f.read()
    else:
        text = args.input
    
    analyzer = LyricAnalyzer()
    result = analyzer.analyze(text)
    
    if args.json:
        # Convert dataclasses to dicts recursively
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(analyzer.format_report(result))


if __name__ == "__main__":
    main()
