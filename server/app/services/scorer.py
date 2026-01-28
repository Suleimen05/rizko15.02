import math
import numpy as np
from datetime import datetime

class TrendScorer:
    def __init__(self):
        # Веса для Universal Transfer Score (UTS)
        self.weights = {
            "l1": 0.30,  # Viral Lift
            "l2": 0.20,  # Velocity (Growth)
            "l3": 0.20,  # Retention (Bookmarks)
            "l4": 0.15,  # Cascade (Sound Network)
            "l5": 0.10,  # Saturation
            "l7": 0.05   # Stability
        }

    def calculate_uts(self, video_data: dict, history_data: dict = None, cascade_count: int = 1) -> float:
        """
        Главная функция расчета 6 слоев анализа.
        Возвращает только финальный score для обратной совместимости.
        """
        breakdown = self.calculate_uts_breakdown(video_data, history_data, cascade_count)
        return breakdown['final_score']
    
    def calculate_uts_breakdown(self, video_data: dict, history_data: dict = None, cascade_count: int = 1) -> dict:
        """
        Расширенная функция расчета с возвратом всех 6 слоев.
        Используется для Deep Analyze.
        """
        # Защита от None - все значения должны быть int
        views = int(video_data.get('views') or 1)
        followers = int(video_data.get('author_followers') or 1)
        bookmarks = int(video_data.get('collect_count') or 0)
        shares = int(video_data.get('share_count') or 0)
        likes = int(video_data.get('likes') or 0)
        comments = int(video_data.get('comments') or 0)
        cascade_count = int(cascade_count or 1)

        # L1: Viral Lift (Отношение просмотров к подписчикам)
        # Видео с высоким reach относительно followers = более вирусное
        viral_ratio = views / max(followers, 1)
        l1_score = min(viral_ratio / 10.0, 1.0)  # Cap at 10x followers = 1.0

        # L2: Velocity (Engagement Rate - насколько люди взаимодействуют)
        # Если нет истории, используем engagement rate как proxy
        total_engagement = likes + comments + shares + bookmarks
        engagement_rate = total_engagement / max(views, 1)
        l2_score = min(engagement_rate * 20, 1.0)  # 5% engagement = 1.0
        if history_data:
            old_views = int(history_data.get('play_count') or views)
            growth_rate = (views - old_views) / max(old_views, 1)
            l2_score = min(growth_rate, 1.0) if growth_rate > 0 else l2_score * 0.5

        # L3: Retention Intensity (Закладки + лайки к просмотрам - показывает "ценность")
        retention_signals = bookmarks + (likes * 0.1)  # Лайки меньше значат чем bookmarks
        l3_score = min((retention_signals / max(views, 1)) * 50, 1.0)

        # L4: Sound Cascade (Кол-во видео под этот звук в текущей выборке)
        l4_score = min(math.log10(cascade_count + 1) / 2, 1.0)

        # L5: Saturation (Свежесть тренда - новые тренды лучше)
        total_in_db = int(history_data.get('total_sound_usage', 0)) if history_data else 0
        l5_score = max(1.0 - (total_in_db / 1000), 0.1)  # Minimum 0.1

        # L7: Stability (Share ratio - показывает что люди хотят распространить)
        share_ratio = shares / max(views, 1)
        comment_ratio = comments / max(views, 1)
        l7_score = min((share_ratio * 100 + comment_ratio * 50), 1.0)

        # Итоговый взвешенный балл
        final_score = (
            l1_score * self.weights['l1'] +
            l2_score * self.weights['l2'] +
            l3_score * self.weights['l3'] +
            l4_score * self.weights['l4'] +
            l5_score * self.weights['l5'] +
            l7_score * self.weights['l7']
        ) * 10 # Приводим к 10-балльной шкале
        
        return {
            'l1_viral_lift': round(l1_score, 3),
            'l2_velocity': round(l2_score, 3),
            'l3_retention': round(l3_score, 3),
            'l4_cascade': round(l4_score, 3),
            'l5_saturation': round(l5_score, 3),
            'l7_stability': round(l7_score, 3),
            'final_score': round(final_score, 2),
            'cascade_count': cascade_count,
            'total_sound_usage': total_in_db
        }

    def analyze_profile_efficiency(self, videos: list) -> dict:
        """
        Новая логика: Анализ эффективности автора.
        """
        if not videos: return {"efficiency": 0, "status": "Unknown"}
        
        lifts = [v.get('views', 0) / (v.get('author_followers', 1) + 1) for v in videos]
        avg_lift = sum(lifts) / len(lifts)
        
        status = "Rising Star" if avg_lift > 2 else "Stable"
        if avg_lift < 0.5: status = "Struggling"
        
        return {
            "avg_viral_lift": round(avg_lift, 2),
            "efficiency_score": round(min(avg_lift * 2, 10), 1),
            "status": status
        }