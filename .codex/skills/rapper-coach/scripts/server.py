#!/usr/bin/env python3
"""
Rapper Coach Local Server for OpenLess Integration.
Exposes an OpenAI-compatible API so OpenLess can route voice input to rapper-coach analysis.

Usage:
    python server.py [--host 0.0.0.0] [--port 8765]

Then in OpenLess Settings:
    - LLM Provider: Custom / OpenAI-compatible
    - API Endpoint: http://localhost:8765/v1/chat/completions
    - API Key: (any non-empty string, e.g., "rapper-coach")
    - Model: rapper-coach-v1

When user speaks rap-related content, this server analyzes it and returns
rhyme, flow, and punchline feedback.
"""

import sys
import json
import argparse
import asyncio
from pathlib import Path
from typing import List, Dict, Optional, AsyncGenerator
from datetime import datetime

# Add scripts dir to path for imports
scripts_dir = Path(__file__).parent
if str(scripts_dir) not in sys.path:
    sys.path.insert(0, str(scripts_dir))

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from pathlib import Path

from lyric_analyzer import LyricAnalyzer

app = FastAPI(title="Rapper Coach Server", version="2.0.0")

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = LyricAnalyzer()

# Serve frontend static files
frontend_dir = Path(__file__).parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

# System prompt that defines the rapper-coach behavior
RAPPER_COACH_SYSTEM_PROMPT = """你是 Rapper Coach，一位专业的说唱创作教练。

你的核心能力：
1. 韵脚引擎：检查多音节韵、家族韵、斜韵，标出破韵和近韵
2. Flow 分析：用拍子图分析重音分布，建议换气点和 Flow Switch
3. Punchline 顾问：优化 setup/punchline 结构，挖掘 wordplay 和 callback
4. 风格模仿：分析任意 rapper 的风格特征，给出靠近风格的修改建议
5. Battle Prep：生成 angle ideas、rebuttal 框架和 diss bars

输出规范：
- 所有分析用中文输出
- 韵脚标注使用下划线或高亮标记
- Flow 分析使用简单的拍子图 (x . x .)
- 修改建议要具体，避免空泛评价
- 如果用户贴的是中文说唱，优先分析普通话韵脚

常见陷阱处理：
- 用户只给一句词：先反问想要的场景（Verse/Hook/Battle?）
- 用户要求模仿特定 rapper：先确认是"借鉴风格"还是"直接代写"
- 用户不懂乐理术语：用比喻解释
- 生成的词太"AI 腔"：加入口头禅、方言词汇、不完美的语法来增加人味

你不是一个代笔，而是一个教练。你的目标是帮助用户理解"为什么这么改"，真正提升创作能力。
"""

# Trigger keywords that activate deep analysis mode
RAP_TRIGGERS = [
    "帮我看看这段词", "这段 rap 怎么改", "帮我写一段说唱", "flow 怎么调整",
    "怎么押韵", "battle prep", "rapper coach", "说唱教练", "韵脚检查",
    "韵脚查询", "查韵脚", "和", "同韵", "韵母", "押韵", "说唱", "rap",
    "verse", "hook", "bar", "flow", "punchline", "diss", "freestyle",
    "歌词", "写词", "改词", "点评", "韵脚", "节奏", "拍子", "换气"
]


def is_rap_related(text: str) -> bool:
    """Check if user input is rap-related."""
    text_lower = text.lower()
    return any(trigger in text_lower for trigger in RAP_TRIGGERS)


def extract_lyrics(text: str) -> Optional[str]:
    """Try to extract lyrics portion from mixed text."""
    lines = text.split("\n")
    lyric_lines = []
    in_lyrics = False
    
    # Common instruction prefixes to skip
    instruction_prefixes = (
        "帮我", "这段", "看看", "怎么", "评价", "分析", "建议", "请问",
        "你好", "在吗", "测试", "分析下", "点评", "改一下", "优化",
        "rapper", "coach", "说唱", "教练", "skill", "rap"
    )
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Skip lines that are clearly instructions/questions
        if any(stripped.startswith(p) for p in instruction_prefixes) and len(stripped) < 20:
            continue
        # Lines with many Chinese chars and reasonable length are likely lyrics
        chinese_chars = sum(1 for c in stripped if '\u4e00' <= c <= '\u9fff')
        is_lyric_like = chinese_chars >= len(stripped) * 0.5 and len(stripped) > 5
        # Punctuation patterns common in lyrics
        has_lyric_punc = any(p in stripped for p in "，。、；！？") or len(stripped) > 10
        
        if is_lyric_like and has_lyric_punc:
            lyric_lines.append(stripped)
            in_lyrics = True
        elif in_lyrics and stripped and not stripped.startswith(instruction_prefixes):
            lyric_lines.append(stripped)
    
    if lyric_lines:
        return "\n".join(lyric_lines)
    # Fallback: if text has enough Chinese chars, use the whole text
    total_chinese = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    return text if total_chinese > 8 else None


class Message(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = "rapper-coach-v1"
    messages: List[Message]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048
    stream: Optional[bool] = False


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict]
    usage: Dict


def build_coach_response(user_text: str) -> str:
    """Build the rapper-coach analysis response."""
    lyrics = extract_lyrics(user_text)
    
    # If no clear lyrics but user is asking rap-related questions
    if not lyrics:
        if is_rap_related(user_text):
            return """🎤 Rapper Coach 已上线！

请把你的歌词贴出来，我会帮你分析：
- 韵脚质量（完美韵 / 家族韵 / 斜韵 / 破韵）
- Flow 结构（拍子分布、换气点、Flow Switch 建议）
- Punchline 潜力（setup/punchline、wordplay、callback）
- 具体修改建议和示例

直接发歌词就行，不需要额外说明！"""
        else:
            # Not rap-related, return as-is with a small hint
            return user_text
    
    # Perform full analysis
    try:
        result = analyzer.analyze(lyrics)
        report = analyzer.format_report(result)
        
        # Add actionable coaching tips
        tips = []
        for sec in result.get("sections", []):
            if sec.get("empty"):
                continue
            if "flow" in sec:
                for sug in sec["flow"].get("suggestions", []):
                    if sug and sug not in tips:
                        tips.append(sug)
        
        tip_text = "\n".join(f"• {t}" for t in tips[:5]) if tips else ""
        
        response = f"""{report}

🎯 重点改进:
{tip_text}

需要我针对某一段做更深入的修改建议，或者帮你改成特定 rapper 的风格吗？"""
        
        return response
    except Exception as e:
        return f"🎤 Rapper Coach 分析时遇到一点问题，但歌词已收到！\n\n（技术细节：{str(e)}）\n\n请再试一次，或者分段发送歌词。"


def generate_stream_chunks(response_text: str, model: str) -> AsyncGenerator[str, None]:
    """Generate SSE stream chunks for OpenAI-compatible streaming."""
    import uuid
    import time
    
    id_str = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created = int(time.time())
    
    # Send role chunk
    chunk = {
        "id": id_str,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model,
        "choices": [{
            "index": 0,
            "delta": {"role": "assistant"},
            "finish_reason": None
        }]
    }
    yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
    
    # Send content in chunks
    chunk_size = 20
    for i in range(0, len(response_text), chunk_size):
        text_chunk = response_text[i:i+chunk_size]
        chunk = {
            "id": id_str,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [{
                "index": 0,
                "delta": {"content": text_chunk},
                "finish_reason": None
            }]
        }
        yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
    
    # Send finish chunk
    chunk = {
        "id": id_str,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model,
        "choices": [{
            "index": 0,
            "delta": {},
            "finish_reason": "stop"
        }]
    }
    yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """OpenAI-compatible chat completions endpoint."""
    # Extract user message
    user_messages = [m for m in request.messages if m.role == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="No user message found")
    
    user_text = user_messages[-1].content
    
    # Build response
    response_text = build_coach_response(user_text)
    
    if request.stream:
        return StreamingResponse(
            generate_stream_chunks(response_text, request.model),
            media_type="text/event-stream"
        )
    
    import uuid
    import time
    
    return {
        "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": request.model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": response_text
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": len(user_text),
            "completion_tokens": len(response_text),
            "total_tokens": len(user_text) + len(response_text)
        }
    }


@app.get("/v1/models")
async def list_models():
    """List available models (OpenAI-compatible)."""
    return {
        "object": "list",
        "data": [{
            "id": "rapper-coach-v1",
            "object": "model",
            "created": int(datetime.now().timestamp()),
            "owned_by": "rapper-coach"
        }]
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "rapper-coach", "version": "2.0.0"}

@app.get("/")
async def root():
    """Serve the frontend page."""
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Rapper Coach API is running. Visit /static/index.html for the web UI."}


class AnalyzeRequest(BaseModel):
    text: str

@app.post("/analyze")
async def analyze_direct(request: AnalyzeRequest):
    """Direct analysis endpoint (non-OpenAI format)."""
    result = analyzer.analyze(request.text)
    return result


def main():
    parser = argparse.ArgumentParser(description="Rapper Coach Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8765, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    args = parser.parse_args()
    
    print("="*54)
    print("           Rapper Coach Server v2.0.0")
    print("="*54)
    print(f"  API Endpoint:    http://{args.host}:{args.port}")
    print("  OpenAI-compat:  /v1/chat/completions")
    print("  Health Check:   /health")
    print("  Direct Analyze: /analyze")
    print("-"*54)
    print("  OpenLess Integration:")
    print("    Settings -> LLM Provider -> Custom Endpoint")
    print(f"    URL: http://localhost:{args.port}/v1/chat/completions")
    print("="*54)
    
    uvicorn.run(
        "server:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )


if __name__ == "__main__":
    main()
