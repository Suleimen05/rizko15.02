"""
Workflow Templates
Pre-built workflow pipelines that users can create from.
"""

WORKFLOW_TEMPLATES = [
    {
        "id": "video-analysis",
        "name": "Video Analysis Pipeline",
        "description": "Analyze a viral video: extract hooks, elements, and style guidelines",
        "category": "analysis",
        "node_count": 4,
        "estimated_credits": 3,
        "graph_data": {
            "nodes": [
                {"id": 0, "type": "video", "x": 100, "y": 200},
                {"id": 1, "type": "analyze", "x": 350, "y": 100},
                {"id": 2, "type": "extract", "x": 350, "y": 300},
                {"id": 3, "type": "style", "x": 600, "y": 200},
            ],
            "connections": [
                {"from": 0, "to": 1},
                {"from": 0, "to": 2},
                {"from": 1, "to": 3},
                {"from": 2, "to": 3},
            ],
        },
        "canvas_state": {"zoom": 0.9, "panX": 50, "panY": 50},
    },
    {
        "id": "script-generator",
        "name": "Script Generator",
        "description": "Analyze a video and your brand to generate a viral script",
        "category": "creation",
        "node_count": 5,
        "estimated_credits": 5,
        "graph_data": {
            "nodes": [
                {"id": 0, "type": "video", "x": 100, "y": 100},
                {"id": 1, "type": "brand", "x": 100, "y": 300},
                {"id": 2, "type": "analyze", "x": 350, "y": 200},
                {"id": 3, "type": "generate", "x": 600, "y": 200},
                {"id": 4, "type": "script", "x": 850, "y": 200},
            ],
            "connections": [
                {"from": 0, "to": 2},
                {"from": 1, "to": 2},
                {"from": 2, "to": 3},
                {"from": 3, "to": 4},
            ],
        },
        "canvas_state": {"zoom": 0.8, "panX": 30, "panY": 50},
    },
    {
        "id": "full-pipeline",
        "name": "Full Content Pipeline",
        "description": "Complete pipeline: analyze, extract, generate, refine, and produce script + storyboard",
        "category": "production",
        "node_count": 8,
        "estimated_credits": 10,
        "graph_data": {
            "nodes": [
                {"id": 0, "type": "video", "x": 50, "y": 100},
                {"id": 1, "type": "brand", "x": 50, "y": 350},
                {"id": 2, "type": "analyze", "x": 300, "y": 100},
                {"id": 3, "type": "extract", "x": 300, "y": 350},
                {"id": 4, "type": "generate", "x": 550, "y": 225},
                {"id": 5, "type": "refine", "x": 800, "y": 225},
                {"id": 6, "type": "script", "x": 1050, "y": 125},
                {"id": 7, "type": "storyboard", "x": 1050, "y": 325},
            ],
            "connections": [
                {"from": 0, "to": 2},
                {"from": 0, "to": 3},
                {"from": 1, "to": 4},
                {"from": 2, "to": 4},
                {"from": 3, "to": 4},
                {"from": 4, "to": 5},
                {"from": 5, "to": 6},
                {"from": 5, "to": 7},
            ],
        },
        "canvas_state": {"zoom": 0.7, "panX": 20, "panY": 30},
    },
]


def get_templates():
    """Return all available workflow templates."""
    return WORKFLOW_TEMPLATES


def get_template_by_id(template_id: str):
    """Return a specific template by ID."""
    for t in WORKFLOW_TEMPLATES:
        if t["id"] == template_id:
            return t
    return None
