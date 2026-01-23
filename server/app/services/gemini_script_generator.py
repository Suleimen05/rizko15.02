"""
AI Script Generator using Google Gemini Flash
Fast and cost-effective script generation for TikTok videos
"""
import os
from google import genai
from typing import Dict, Any, Optional

class GeminiScriptGenerator:
    """Генератор вирусных скриптов для TikTok с помощью Google Gemini Flash"""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            print("⚠️  GEMINI API KEY не настроен!")
            self.client = None
        else:
            self.client = genai.Client(api_key=api_key)
            print("✅ Gemini Flash initialized")

    def generate_script(
        self,
        video_description: str,
        video_stats: Dict[str, int],
        tone: str = "engaging",
        niche: str = "general",
        duration_seconds: int = 30
    ) -> Optional[Dict[str, Any]]:
        """
        Генерирует вирусный скрипт для TikTok видео

        Args:
            video_description: Описание оригинального видео
            video_stats: Статистика видео (views, likes, comments, shares)
            tone: Тон скрипта (engaging, educational, humorous, inspirational)
            niche: Ниша (general, business, lifestyle, education, etc.)
            duration_seconds: Длительность видео в секундах

        Returns:
            Dict с структурированным скриптом или None при ошибке
        """
        if not self.client:
            return self._fallback_script(video_description)

        try:
            # Создаем промпт для Gemini
            prompt = self._create_prompt(
                video_description,
                video_stats,
                tone,
                niche,
                duration_seconds
            )

            # Генерируем скрипт с использованием google-genai SDK
            response = self.client.models.generate_content(
                model='gemini-2.0-flash-exp',
                contents=prompt
            )

            # Парсим ответ
            script = self._parse_response(response.text, duration_seconds)

            return script

        except Exception as e:
            print(f"❌ Gemini generation error: {e}")
            return self._fallback_script(video_description)

    def _create_prompt(
        self,
        description: str,
        stats: Dict[str, int],
        tone: str,
        niche: str,
        duration: int
    ) -> str:
        """Создает промпт для Gemini"""

        engagement_rate = ((stats.get('diggCount', 0) + stats.get('commentCount', 0) + stats.get('shareCount', 0))
                          / max(stats.get('playCount', 1), 1) * 100)

        return f"""You are an expert TikTok content creator and viral video script writer. Analyze this viral video and create a similar engaging script.

ORIGINAL VIRAL VIDEO:
Description: {description}
Performance: {stats.get('playCount', 0):,} views, {stats.get('diggCount', 0):,} likes
Engagement Rate: {engagement_rate:.2f}%
Duration: {duration} seconds

YOUR TASK:
Create a viral TikTok script inspired by this video's success. The script should be:
- Tone: {tone}
- Niche: {niche}
- Duration: ~{duration} seconds
- Hook within first 3 seconds
- Clear structure with momentum

OUTPUT FORMAT (strict JSON):
{{
  "hook": "Opening line that grabs attention in 1-2 seconds",
  "body": [
    "Main point 1",
    "Main point 2",
    "Main point 3"
  ],
  "cta": "Strong call-to-action at the end",
  "viralElements": ["element1", "element2", "element3"],
  "tips": ["filming tip 1", "filming tip 2"]
}}

Generate the script now as valid JSON only, no additional text:"""

    def _parse_response(self, response_text: str, duration: int) -> Dict[str, Any]:
        """Парсит ответ от Gemini"""
        import json
        import re

        try:
            # Пытаемся извлечь JSON из ответа
            # Ищем JSON между ```json и ``` или просто { }
            json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Ищем просто JSON объект
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    raise ValueError("No JSON found in response")

            data = json.loads(json_str)

            # Добавляем метаданные
            data["duration"] = duration
            data["generatedAt"] = __import__('datetime').datetime.utcnow().isoformat()

            return data

        except Exception as e:
            print(f"⚠️  Failed to parse Gemini response: {e}")
            print(f"Response was: {response_text[:500]}")

            # Возвращаем базовую структуру с текстом ответа
            return {
                "hook": "Check out this amazing content!",
                "body": response_text.split('\n')[:3] if response_text else ["Great content idea", "Engage your audience", "Create viral moments"],
                "cta": "Follow for more!",
                "viralElements": ["trending sound", "quick cuts", "engaging visuals"],
                "tips": ["Keep it short", "Hook in first 3 seconds"],
                "duration": duration,
                "generatedAt": __import__('datetime').datetime.utcnow().isoformat()
            }

    def _fallback_script(self, description: str) -> Dict[str, Any]:
        """Fallback скрипт если Gemini недоступен"""
        return {
            "hook": "Want to create viral content like this?",
            "body": [
                "This video got thousands of views",
                "Here's what made it work",
                "You can recreate this success"
            ],
            "cta": "Try it yourself and tag me!",
            "viralElements": [
                "Trending topic",
                "Engaging hook",
                "Clear message"
            ],
            "tips": [
                "Film in good lighting",
                "Keep it under 60 seconds",
                "Add trending music"
            ],
            "duration": 30,
            "generatedAt": __import__('datetime').datetime.utcnow().isoformat(),
            "fallback": True
        }
