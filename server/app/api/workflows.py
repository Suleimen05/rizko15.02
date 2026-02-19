"""
Workflow Execution API
Executes node-based AI workflows for script generation.
Includes CRUD for workflow persistence and execution engine.
Supports per-node model selection (Gemini, Claude, GPT-4).
"""
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
import logging
import uuid
import shutil

from ..core.database import get_db
from ..services.gemini_script_generator import GeminiScriptGenerator
from .dependencies import get_current_user, CreditManager
from ..db.models import User, Workflow, WorkflowStatus, WorkflowRun, WorkflowRunStatus, Project
from ..services.workflow_templates import get_templates, get_template_by_id

# Reuse AI clients from chat_sessions
from ..api.chat_sessions import get_gemini_client, get_anthropic_client, get_openai_client

router = APIRouter()
logger = logging.getLogger(__name__)

# Lazy init Gemini (avoid import-time crash if GEMINI_API_KEY missing)
_script_generator = None

def get_script_generator() -> GeminiScriptGenerator:
    global _script_generator
    if _script_generator is None:
        _script_generator = GeminiScriptGenerator()
    return _script_generator


def _lang_instruction(language: str) -> str:
    """Return a language instruction to prepend to prompts."""
    if language and language.lower() != "english":
        return f"IMPORTANT: You MUST write your ENTIRE response in {language}. All headings, labels, descriptions, and content must be in {language}.\n\n"
    return ""


def generate_with_model(model: str, prompt: str) -> str:
    """
    Generate AI content using the specified model.
    Supports: gemini (default), claude, gpt4
    """
    try:
        if model == "claude":
            client = get_anthropic_client()
            if not client:
                logger.warning("[WORKFLOW] Claude not available, falling back to Gemini")
                return generate_with_model("gemini", prompt)
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text.strip() if response.content else "No response generated"

        elif model == "gpt4":
            client = get_openai_client()
            if not client:
                logger.warning("[WORKFLOW] GPT-4 not available, falling back to Gemini")
                return generate_with_model("gemini", prompt)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4096,
            )
            return response.choices[0].message.content.strip() if response.choices else "No response generated"

        else:
            # Default: Gemini
            client = get_gemini_client()
            if not client:
                raise Exception("Gemini API not configured - add GEMINI_API_KEY to .env")
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )
            return response.text.strip() if response.text else "No response generated"

    except Exception as e:
        logger.error(f"[WORKFLOW] generate_with_model({model}) error: {e}")
        raise


# ============================================================================
# SCHEMAS
# ============================================================================

class VideoData(BaseModel):
    """Video data attached to a node"""
    id: int
    platform: str = "TikTok"
    author: str = ""
    desc: str = ""
    views: str = "0"
    uts: float = 0
    thumb: str = ""
    url: Optional[str] = None
    localPath: Optional[str] = None  # Path to uploaded video file


class NodeConfig(BaseModel):
    """Per-node configuration"""
    customPrompt: Optional[str] = None
    model: Optional[str] = None
    brandContext: Optional[str] = None
    outputFormat: Optional[str] = None


class WorkflowNode(BaseModel):
    """A node in the workflow"""
    id: int
    type: str
    x: float = 0
    y: float = 0
    videoData: Optional[VideoData] = None
    outputContent: Optional[str] = None
    brandData: Optional[Dict[str, Any]] = None
    config: Optional[NodeConfig] = None


class Connection(BaseModel):
    """Connection between nodes"""
    from_node: int = Field(alias="from")
    to_node: int = Field(alias="to")

    class Config:
        populate_by_name = True


class WorkflowExecuteRequest(BaseModel):
    """Request to execute a workflow"""
    nodes: List[WorkflowNode]
    connections: List[Connection]
    brand_context: Optional[str] = None


class NodeResult(BaseModel):
    """Result for a single node"""
    node_id: int
    node_type: str
    content: str
    success: bool = True
    error: Optional[str] = None


class WorkflowExecuteResponse(BaseModel):
    """Response from workflow execution"""
    success: bool
    results: List[NodeResult]
    final_script: Optional[str] = None
    storyboard: Optional[str] = None
    error: Optional[str] = None
    credits_used: Optional[int] = None
    credits_remaining: Optional[int] = None


# ============================================================================
# CRUD SCHEMAS
# ============================================================================

class WorkflowCreate(BaseModel):
    """Request to create a new workflow"""
    name: str = "Untitled Workflow"
    description: Optional[str] = None
    graph_data: Dict[str, Any] = {"nodes": [], "connections": []}
    node_configs: Dict[str, Any] = {}
    canvas_state: Dict[str, Any] = {"zoom": 1, "panX": 0, "panY": 0}
    tags: List[str] = []


class WorkflowUpdate(BaseModel):
    """Request to update a workflow (partial)"""
    name: Optional[str] = None
    description: Optional[str] = None
    graph_data: Optional[Dict[str, Any]] = None
    node_configs: Optional[Dict[str, Any]] = None
    canvas_state: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None


class WorkflowResponse(BaseModel):
    """Full workflow response"""
    id: int
    name: str
    description: Optional[str] = None
    graph_data: Dict[str, Any]
    node_configs: Dict[str, Any]
    status: str
    canvas_state: Dict[str, Any]
    tags: List[str]
    is_favorite: bool
    last_run_at: Optional[str] = None
    last_run_results: Dict[str, Any]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class WorkflowListItem(BaseModel):
    """Workflow list item (lightweight)"""
    id: int
    name: str
    description: Optional[str] = None
    status: str
    node_count: int
    is_favorite: bool
    tags: List[str]
    last_run_at: Optional[str] = None
    updated_at: str


# ============================================================================
# WORKFLOW RUN HISTORY SCHEMAS
# ============================================================================

class WorkflowRunListItem(BaseModel):
    """Workflow run history item"""
    id: int
    workflow_id: Optional[int] = None
    workflow_name: str
    run_number: int
    status: str
    node_count: int
    credits_used: int
    execution_time_ms: Optional[int] = None
    has_script: bool
    has_storyboard: bool
    is_pinned: bool = False
    started_at: str
    completed_at: Optional[str] = None


class WorkflowRunDetail(BaseModel):
    """Full workflow run details"""
    id: int
    workflow_id: Optional[int] = None
    workflow_name: str
    run_number: int
    status: str
    input_graph: Dict[str, Any]
    node_count: int
    results: List[Dict[str, Any]]
    final_script: Optional[str] = None
    storyboard: Optional[str] = None
    credits_used: int
    execution_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None


class WorkflowRunUpdate(BaseModel):
    """Update workflow run (rename / pin)"""
    workflow_name: Optional[str] = None
    is_pinned: Optional[bool] = None


def _run_to_list_item(run: WorkflowRun) -> dict:
    """Convert WorkflowRun ORM to list item dict"""
    return {
        "id": run.id,
        "workflow_id": run.workflow_id,
        "workflow_name": run.workflow_name,
        "run_number": run.run_number,
        "status": run.status.value if hasattr(run.status, 'value') else str(run.status),
        "node_count": run.node_count,
        "credits_used": run.credits_used,
        "execution_time_ms": run.execution_time_ms,
        "has_script": run.final_script is not None and len(run.final_script) > 0,
        "has_storyboard": run.storyboard is not None and len(run.storyboard) > 0,
        "is_pinned": getattr(run, 'is_pinned', False),
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
    }


def _run_to_detail(run: WorkflowRun) -> dict:
    """Convert WorkflowRun ORM to full detail dict"""
    return {
        "id": run.id,
        "workflow_id": run.workflow_id,
        "workflow_name": run.workflow_name,
        "run_number": run.run_number,
        "status": run.status.value if hasattr(run.status, 'value') else str(run.status),
        "input_graph": run.input_graph or {},
        "node_count": run.node_count,
        "results": run.results or [],
        "final_script": run.final_script,
        "storyboard": run.storyboard,
        "credits_used": run.credits_used,
        "execution_time_ms": run.execution_time_ms,
        "error_message": run.error_message,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
    }


def _workflow_to_response(wf: Workflow) -> dict:
    """Convert Workflow ORM object to response dict"""
    return {
        "id": wf.id,
        "name": wf.name,
        "description": wf.description,
        "graph_data": wf.graph_data or {"nodes": [], "connections": []},
        "node_configs": wf.node_configs or {},
        "status": wf.status.value if hasattr(wf.status, 'value') else str(wf.status),
        "canvas_state": wf.canvas_state or {"zoom": 1, "panX": 0, "panY": 0},
        "tags": wf.tags or [],
        "is_favorite": wf.is_favorite,
        "last_run_at": wf.last_run_at.isoformat() if wf.last_run_at else None,
        "last_run_results": wf.last_run_results or {},
        "created_at": wf.created_at.isoformat() if wf.created_at else None,
        "updated_at": wf.updated_at.isoformat() if wf.updated_at else None,
    }


def _workflow_to_list_item(wf: Workflow) -> dict:
    """Convert Workflow ORM object to list item dict"""
    graph = wf.graph_data or {"nodes": [], "connections": []}
    node_count = len(graph.get("nodes", []))
    return {
        "id": wf.id,
        "name": wf.name,
        "description": wf.description,
        "status": wf.status.value if hasattr(wf.status, 'value') else str(wf.status),
        "node_count": node_count,
        "is_favorite": wf.is_favorite,
        "tags": wf.tags or [],
        "last_run_at": wf.last_run_at.isoformat() if wf.last_run_at else None,
        "updated_at": wf.updated_at.isoformat() if wf.updated_at else None,
    }


# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[WorkflowListItem])
async def list_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all workflows for the current user"""
    workflows = (
        db.query(Workflow)
        .filter(Workflow.user_id == current_user.id, Workflow.is_template == False)
        .order_by(Workflow.updated_at.desc())
        .all()
    )
    return [_workflow_to_list_item(wf) for wf in workflows]


@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new workflow"""
    wf = Workflow(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        graph_data=data.graph_data,
        node_configs=data.node_configs,
        canvas_state=data.canvas_state,
        tags=data.tags,
        status=WorkflowStatus.DRAFT,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    logger.info(f"[WORKFLOW] User {current_user.id} created workflow {wf.id}: {wf.name}")
    return _workflow_to_response(wf)


# ============================================================================
# TEMPLATE ENDPOINTS (must be before /{workflow_id} routes)
# ============================================================================

class TemplateItem(BaseModel):
    """Template list item"""
    id: str
    name: str
    description: str
    category: str
    node_count: int
    estimated_credits: int


@router.get("/templates/list", response_model=List[TemplateItem])
async def list_templates():
    """List all available workflow templates"""
    return get_templates()


@router.post("/templates/{template_id}/create", response_model=WorkflowResponse)
async def create_from_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new workflow from a template"""
    template = get_template_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    wf = Workflow(
        user_id=current_user.id,
        name=template["name"],
        description=template["description"],
        graph_data=template["graph_data"],
        node_configs={},
        canvas_state=template["canvas_state"],
        tags=[template["category"]],
        status=WorkflowStatus.DRAFT,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    logger.info(f"[WORKFLOW] User {current_user.id} created workflow from template '{template_id}'")
    return _workflow_to_response(wf)


@router.get("/health")
def health_check():
    """Check workflow service health"""
    return {
        "status": "ok",
        "service": "Workflow Execution",
        "ai_available": get_script_generator().client is not None
    }


# ============================================================================
# VIDEO ANALYSIS ENDPOINT
# ============================================================================

class VideoAnalyzeRequest(BaseModel):
    url: str = Field(..., description="Video URL (TikTok, Instagram, YouTube, etc.)")
    platform: Optional[str] = None
    author: Optional[str] = None
    views: Optional[str] = None
    uts: Optional[float] = None
    desc: Optional[str] = None
    custom_prompt: Optional[str] = None

@router.post("/analyze-video")
async def analyze_video(
    request: VideoAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze a video using Gemini's native video understanding.
    Downloads the video, uploads to Gemini, and returns detailed AI analysis.
    Costs 3 credits.
    """
    CREDIT_COST = 3

    # Check credits
    CreditManager.check_and_reset_monthly(current_user, db)
    if current_user.credits < CREDIT_COST:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. Need {CREDIT_COST}, have {current_user.credits}"
        )

    try:
        from ..services.video_analyzer import analyze_video_with_gemini

        metadata = {
            'platform': request.platform or 'Unknown',
            'author': request.author or 'unknown',
            'views': request.views or 'N/A',
            'uts': request.uts or 0,
            'desc': request.desc or '',
            'url': request.url,
        }

        result = analyze_video_with_gemini(
            video_url=request.url,
            video_metadata=metadata,
            custom_prompt=request.custom_prompt,
        )

        # Deduct credits
        current_user.credits -= CREDIT_COST
        db.commit()

        return {
            "success": True,
            "analysis": result,
            "credits_used": CREDIT_COST,
            "credits_remaining": current_user.credits,
        }

    except Exception as e:
        logger.error(f"[VIDEO-API] Analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Video analysis failed: {str(e)}"
        )


# ============================================================================
# VIDEO UPLOAD ENDPOINT
# ============================================================================

VIDEOS_UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads" / "videos"
VIDEOS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4v"}
MAX_VIDEO_SIZE_MB = 100


@router.post("/upload-video-file")
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a video file from the user's device.
    Returns a URL that can be used in workflow video nodes.
    """
    # Validate file extension
    ext = Path(file.filename or "video.mp4").suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {ext}. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"
        )

    # Read file and check size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_VIDEO_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {size_mb:.1f}MB (max {MAX_VIDEO_SIZE_MB}MB)"
        )

    # Save with unique name
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = VIDEOS_UPLOAD_DIR / unique_name
    file_path.write_bytes(content)

    logger.info(f"[UPLOAD] Video saved: {file_path} ({size_mb:.1f}MB) by user {current_user.id}")

    return {
        "success": True,
        "filename": unique_name,
        "url": f"/uploads/videos/{unique_name}",
        "local_path": str(file_path),
        "size_mb": round(size_mb, 1),
    }


# ============================================================================
# WORKFLOW RUN HISTORY ENDPOINTS
# ============================================================================

@router.get("/history/list", response_model=List[WorkflowRunListItem])
async def list_workflow_runs(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all workflow runs for the current user (pinned first, then most recent)"""
    runs = (
        db.query(WorkflowRun)
        .filter(WorkflowRun.user_id == current_user.id)
        .order_by(WorkflowRun.is_pinned.desc(), WorkflowRun.started_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_run_to_list_item(run) for run in runs]


@router.get("/history/{run_id}", response_model=WorkflowRunDetail)
async def get_workflow_run(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific workflow run"""
    run = db.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Workflow run not found")
    if run.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return _run_to_detail(run)


@router.delete("/history/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow_run(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workflow run from history"""
    run = db.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Workflow run not found")
    if run.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(run)
    db.commit()
    logger.info(f"[WORKFLOW] User {current_user.id} deleted run {run_id}")


@router.patch("/history/{run_id}", response_model=WorkflowRunListItem)
async def update_workflow_run(
    run_id: int,
    data: WorkflowRunUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a workflow run (rename / pin)"""
    run = db.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Workflow run not found")
    if run.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if data.workflow_name is not None:
        run.workflow_name = data.workflow_name
    if data.is_pinned is not None:
        run.is_pinned = data.is_pinned

    db.commit()
    db.refresh(run)
    return _run_to_list_item(run)


@router.delete("/history/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_workflow_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all workflow run history for the current user"""
    deleted = db.query(WorkflowRun).filter(WorkflowRun.user_id == current_user.id).delete()
    db.commit()
    logger.info(f"[WORKFLOW] User {current_user.id} cleared {deleted} runs from history")


# ============================================================================
# CRUD ENDPOINTS (continued - parameterized routes)
# ============================================================================

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single workflow by ID"""
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if wf.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return _workflow_to_response(wf)


@router.patch("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    data: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a workflow (partial update)"""
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if wf.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(wf, field, value)

    wf.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(wf)
    return _workflow_to_response(wf)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workflow"""
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if wf.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(wf)
    db.commit()
    logger.info(f"[WORKFLOW] User {current_user.id} deleted workflow {workflow_id}")


@router.post("/{workflow_id}/duplicate", response_model=WorkflowResponse)
async def duplicate_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Duplicate a workflow"""
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if wf.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    new_wf = Workflow(
        user_id=current_user.id,
        name=f"{wf.name} (copy)",
        description=wf.description,
        graph_data=wf.graph_data,
        node_configs=wf.node_configs,
        canvas_state=wf.canvas_state,
        tags=wf.tags,
        status=WorkflowStatus.DRAFT,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_wf)
    db.commit()
    db.refresh(new_wf)
    logger.info(f"[WORKFLOW] User {current_user.id} duplicated workflow {workflow_id} -> {new_wf.id}")
    return _workflow_to_response(new_wf)


# ============================================================================
# NODE PROCESSORS
# ============================================================================

def get_node_dependencies(node_id: int, connections: List[Connection]) -> List[int]:
    """Get all nodes that feed into a given node"""
    return [c.from_node for c in connections if c.to_node == node_id]


def topological_sort(nodes: List[WorkflowNode], connections: List[Connection]) -> List[int]:
    """Sort nodes in execution order (topological sort)"""
    node_ids = {n.id for n in nodes}
    in_degree = {n.id: 0 for n in nodes}
    adj = {n.id: [] for n in nodes}

    for conn in connections:
        if conn.from_node in node_ids and conn.to_node in node_ids:
            adj[conn.from_node].append(conn.to_node)
            in_degree[conn.to_node] += 1

    queue = [nid for nid, deg in in_degree.items() if deg == 0]
    result = []

    while queue:
        node_id = queue.pop(0)
        result.append(node_id)

        for neighbor in adj[node_id]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return result


def analyze_with_video(video_data: 'VideoData', prompt: str, language: str = "English") -> Optional[str]:
    """
    Analyze video with Gemini Vision using a custom prompt.
    Returns result text or None if video analysis is unavailable.
    """
    try:
        from ..services.video_analyzer import analyze_video_with_gemini

        lang_instr = _lang_instruction(language)
        full_prompt = lang_instr + prompt

        metadata = {
            'platform': video_data.platform,
            'author': video_data.author,
            'views': video_data.views,
            'uts': video_data.uts,
            'desc': video_data.desc,
            'url': video_data.url or 'Local upload',
        }

        if video_data.url or video_data.localPath:
            result = analyze_video_with_gemini(
                video_url=video_data.url or "",
                video_metadata=metadata,
                custom_prompt=full_prompt,
                local_path=video_data.localPath,
            )
            return result
    except Exception as e:
        logger.error(f"[WORKFLOW] Video analysis failed in AI node: {e}")

    return None


def process_video_node(node: WorkflowNode, language: str = "English") -> str:
    """Process video input node - downloads actual video and analyzes it with Gemini Vision."""
    if not node.videoData:
        return "No video attached. Drag a saved video onto this node."

    video = node.videoData
    custom_prompt = None
    if node.config and node.config.customPrompt:
        custom_prompt = node.config.customPrompt

    # Prepend language instruction to custom prompt (or create one)
    lang_instr = _lang_instruction(language)
    if custom_prompt:
        custom_prompt = lang_instr + custom_prompt
    elif lang_instr:
        custom_prompt = lang_instr + "Analyze this video in detail."

    if video.url or video.localPath:
        try:
            from ..services.video_analyzer import analyze_video_with_gemini

            metadata = {
                'platform': video.platform,
                'author': video.author,
                'views': video.views,
                'uts': video.uts,
                'desc': video.desc,
                'url': video.url or 'Local upload',
            }

            logger.info(f"[WORKFLOW] Analyzing video with Gemini: {video.localPath or video.url}")
            result = analyze_video_with_gemini(
                video_url=video.url or "",
                video_metadata=metadata,
                custom_prompt=custom_prompt,
                local_path=video.localPath,
            )
            return result

        except Exception as e:
            logger.error(f"[WORKFLOW] Video analysis failed, using fallback: {e}")

    uts_label = "HIGH" if video.uts >= 70 else ("MEDIUM" if video.uts >= 40 else "LOW")

    return f"""# SOURCE VIDEO ANALYSIS (Metadata Only)

## Basic Info
- **Platform:** {video.platform}
- **Creator:** @{video.author}
- **Views:** {video.views}
- **Viral Score (UTS):** {video.uts} ({uts_label} viral potential)

## Content Description
{video.desc}

## Reference URL
{video.url or 'Not available'}

*Video file could not be downloaded for visual analysis. Analysis is based on metadata only.*

---
**Instructions for downstream nodes:** Use this video as reference for style, tone, format and content structure."""


def process_brand_node(node: WorkflowNode, brand_context: str = "", config: Optional[NodeConfig] = None) -> str:
    """Process brand brief node."""
    context = ""
    if config and config.brandContext:
        context = config.brandContext
    elif node.brandData and node.brandData.get('description'):
        context = node.brandData.get('description', '')
    elif brand_context:
        context = brand_context

    if not context or context.strip() == "":
        return """# BRAND BRIEF

**No brand context provided.**

To get better results, double-click this node and add:
- Brand name and description
- Target audience
- Brand voice (casual, professional, humorous, etc.)
- Key messages or values
- What makes you unique
- Any content restrictions"""

    return f"""# BRAND BRIEF

## Brand Context
{context}

---
**Instructions for downstream nodes:** All generated content MUST align with this brand identity."""


def process_analyze_node(input_content: str, config: Optional[NodeConfig] = None, language: str = "English", video_data: Optional['VideoData'] = None) -> str:
    """Deep content analysis. Uses Gemini Vision when video is available upstream."""
    if not input_content or input_content.strip() == "":
        return "No input content to analyze. Connect a Video Input or Brand Brief node."

    # If video data is available, use Gemini Vision for direct video analysis
    if video_data:
        custom_prompt = config.customPrompt if config and config.customPrompt else None
        if custom_prompt:
            vision_prompt = f"""You are an expert content strategist analyzing viral content.

{custom_prompt}

Also consider this context from the pipeline:
{input_content[:500]}"""
        else:
            vision_prompt = f"""You are an expert viral content strategist. Analyze this video deeply.

Provide a concise analysis:
## HOOK ANALYSIS (First 3 Seconds)
## CONTENT STRUCTURE
## AUDIO ANALYSIS (music, sound, voice)
## PSYCHOLOGICAL TRIGGERS
## VIRAL MECHANICS
## REPLICABLE ELEMENTS (5 actionable items)

Be specific about what you actually see and hear in the video."""

        result = analyze_with_video(video_data, vision_prompt, language)
        if result:
            return result
        logger.warning("[WORKFLOW] Video vision failed for analyze node, falling back to text")

    model = (config.model if config and config.model else "gemini")
    lang = _lang_instruction(language)

    if config and config.customPrompt:
        prompt = f"""{lang}You are an expert content strategist analyzing viral content.

{config.customPrompt}

---
CONTENT TO ANALYZE:
{input_content}"""
    else:
        prompt = f"""{lang}You are an expert viral content strategist. Analyze this content deeply.

---
CONTENT TO ANALYZE:
{input_content}

---
Provide a concise analysis:

## HOOK ANALYSIS (First 3 Seconds)
- What grabs attention?
- Pattern interrupt technique
- Curiosity/emotion trigger

## CONTENT STRUCTURE
- Format, flow, pacing

## PSYCHOLOGICAL TRIGGERS
- Primary emotions, social proof, urgency

## VIRAL MECHANICS
- Shareability, comment bait, save value

## REPLICABLE ELEMENTS
List 5 specific, actionable elements:
1.
2.
3.
4.
5.

Be specific and actionable."""

    try:
        return generate_with_model(model, prompt)
    except Exception as e:
        logger.error(f"Analyze node error: {e}")
        return f"Analysis error: {str(e)}"


def process_extract_node(input_content: str, config: Optional[NodeConfig] = None, language: str = "English", video_data: Optional['VideoData'] = None) -> str:
    """Extract key elements. Uses Gemini Vision when video is available upstream."""
    if not input_content or input_content.strip() == "":
        return "No input content to extract from. Connect upstream nodes first."

    # If video data is available, use Gemini Vision
    if video_data:
        custom_prompt = config.customPrompt if config and config.customPrompt else None
        vision_prompt = custom_prompt or """Extract all reusable elements from this video:
## HOOKS (Copy-Paste Ready)
## KEY PHRASES & LANGUAGE
## VISUAL FRAMEWORK (shots, transitions, text overlays)
## HASHTAG STRATEGY
## CTA TEMPLATES
## SUCCESS FORMULA
Be specific about what you see and hear."""

        result = analyze_with_video(video_data, vision_prompt, language)
        if result:
            return result

    model = (config.model if config and config.model else "gemini")
    lang = _lang_instruction(language)

    if config and config.customPrompt:
        prompt = f"""{lang}You are extracting reusable content elements.

{config.customPrompt}

---
SOURCE CONTENT:
{input_content}"""
    else:
        prompt = f"""{lang}Extract all reusable elements from this content analysis. Create a toolkit for similar content.

---
SOURCE CONTENT:
{input_content}

---
Extract and organize concisely:

## HOOKS (Copy-Paste Ready)
1-3 hook templates

## KEY PHRASES & LANGUAGE
Power words, sentence patterns, tone markers

## VISUAL FRAMEWORK
Shot types, text overlay style, transitions

## HASHTAG STRATEGY
Primary, niche, trending hashtags

## CTA TEMPLATES
2-3 options

## SUCCESS FORMULA
Summarize in one sentence.

Keep it brief and immediately usable."""

    try:
        return generate_with_model(model, prompt)
    except Exception as e:
        logger.error(f"Extract node error: {e}")
        return f"Extraction error: {str(e)}"


def process_style_node(input_content: str, config: Optional[NodeConfig] = None, language: str = "English", video_data: Optional['VideoData'] = None) -> str:
    """Style matching. Uses Gemini Vision when video is available upstream."""
    if not input_content or input_content.strip() == "":
        return "No input content for style matching. Connect upstream nodes first."

    # If video data is available, use Gemini Vision
    if video_data:
        custom_prompt = config.customPrompt if config and config.customPrompt else None
        vision_prompt = custom_prompt or """Create a detailed style guide from this video:
## VOICE & TONE
## VIDEO FORMAT (aspect ratio, length)
## EDITING STYLE (cuts, transitions, text animations)
## VISUAL AESTHETIC (colors, lighting, framing)
## AUDIO GUIDELINES (music genre, tempo, voiceover)
Be specific about what you see and hear."""

        result = analyze_with_video(video_data, vision_prompt, language)
        if result:
            return result

    model = (config.model if config and config.model else "gemini")
    lang = _lang_instruction(language)

    if config and config.customPrompt:
        prompt = f"""{lang}You are creating a style guide for content replication.

{config.customPrompt}

---
REFERENCE CONTENT:
{input_content}"""
    else:
        prompt = f"""{lang}Create a concise style guide based on this content.

---
REFERENCE CONTENT:
{input_content}

---
## VOICE & TONE
Primary tone, language level, personality

## VIDEO FORMAT
Format, aspect ratio, optimal length

## EDITING STYLE
Cut pacing, transitions, text animations

## VISUAL AESTHETIC
Color palette, lighting, on-screen text style

## AUDIO GUIDELINES
Music, voiceover style, sound effects

Keep this concise and actionable."""

    try:
        return generate_with_model(model, prompt)
    except Exception as e:
        logger.error(f"Style node error: {e}")
        return f"Style matching error: {str(e)}"


def process_generate_node(input_content: str, config: Optional[NodeConfig] = None, language: str = "English") -> str:
    """AI Script Generation."""
    if not input_content or input_content.strip() == "":
        return "No input context for script generation. Connect upstream nodes."

    model = (config.model if config and config.model else "gemini")
    lang = _lang_instruction(language)

    if config and config.customPrompt:
        prompt = f"""{lang}You are a viral content scriptwriter creating a TikTok script.

{config.customPrompt}

---
CONTEXT & GUIDELINES:
{input_content}"""
    else:
        prompt = f"""{lang}Write a complete, production-ready TikTok script. Be concise.

---
CONTEXT & GUIDELINES:
{input_content}

---
# TIKTOK SCRIPT

## TIMING: [X seconds total]

## HOOK (0-3 seconds)
**[SPOKEN/TEXT]:** "[Exact words]"
**[VISUAL]:** [What appears on screen]

## BODY (3-X seconds)
### Beat 1
**[SPOKEN]:** "[Script]"
**[VISUAL]:** [Action]

### Beat 2
**[SPOKEN]:** "[Script]"
**[VISUAL]:** [Action]

### Beat 3
**[SPOKEN]:** "[Script]"
**[VISUAL]:** [Action]

## CTA (Final 3-5 seconds)
**[SPOKEN]:** "[Call to action]"
**[TEXT OVERLAY]:** "[On-screen text]"

## AUDIO NOTES
- Music, voiceover style, sound effects

## CAPTION & HASHTAGS
Caption + 8-12 hashtags

## PRO TIPS
1-3 tips

Keep it natural and scroll-stopping."""

    try:
        return generate_with_model(model, prompt)
    except Exception as e:
        logger.error(f"Generate node error: {e}")
        return f"Generation error: {str(e)}"


def process_refine_node(input_content: str, config: Optional[NodeConfig] = None, language: str = "English") -> str:
    """Polish & Improve."""
    if not input_content or input_content.strip() == "":
        return "No content to refine. Connect a Generate node."

    model = (config.model if config and config.model else "gemini")
    lang = _lang_instruction(language)

    if config and config.customPrompt:
        prompt = f"""{lang}You are optimizing content for viral performance.

{config.customPrompt}

---
CONTENT TO REFINE:
{input_content}"""
    else:
        prompt = f"""{lang}Refine this script for MAXIMUM impact. Be concise.

---
ORIGINAL CONTENT:
{input_content}

---
## REFINED SCRIPT
[Complete refined version with improvements applied]

## KEY CHANGES
1-5 improvements made

The refined version should feel noticeably more engaging."""

    try:
        return generate_with_model(model, prompt)
    except Exception as e:
        logger.error(f"Refine node error: {e}")
        return f"Refinement error: {str(e)}"


def process_script_output_node(input_content: str, config: Optional[NodeConfig] = None, language: str = "English") -> str:
    """Final Script Output."""
    if not input_content or input_content.strip() == "":
        return "No script content to format. Connect a Generate or Refine node."

    model = (config.model if config and config.model else "gemini")
    lang = _lang_instruction(language)
    output_format = (config.outputFormat if config and config.outputFormat else "markdown")

    if config and config.customPrompt:
        prompt = f"""{lang}Format this script for production use.

{config.customPrompt}

---
RAW SCRIPT:
{input_content}"""
    else:
        format_instruction = ""
        if output_format == "plain":
            format_instruction = "Output as PLAIN TEXT only."
        elif output_format == "json":
            format_instruction = "Output as valid JSON."
        else:
            format_instruction = "Use clean Markdown formatting."

        prompt = f"""{lang}Clean up and format this script for FINAL PRODUCTION USE. Be concise.

---
RAW SCRIPT:
{input_content}

---
FORMAT: {format_instruction}

Include: duration, hook, body beats, CTA, audio guidance, caption and hashtags.
Remove analysis/meta-commentary. Keep ONLY actionable content."""

    try:
        return generate_with_model(model, prompt)
    except Exception as e:
        logger.error(f"Script output node error: {e}")
        return input_content


def process_storyboard_node(input_content: str, config: Optional[NodeConfig] = None, language: str = "English") -> str:
    """Visual Storyboard."""
    if not input_content or input_content.strip() == "":
        return "No script content for storyboard. Connect a Script Output or Generate node."

    model = (config.model if config and config.model else "gemini")
    lang = _lang_instruction(language)

    if config and config.customPrompt:
        prompt = f"""{lang}Create a storyboard for this script.

{config.customPrompt}

---
SCRIPT:
{input_content}"""
    else:
        prompt = f"""{lang}Create a concise VISUAL STORYBOARD for this TikTok script.

---
SCRIPT:
{input_content}

---
# STORYBOARD

## Overview
Total scenes, duration, format

For each scene include:
- Timing, visual description, camera angle
- On-screen text, audio notes
- Transition to next

## SHOT LIST SUMMARY
Table: Scene | Duration | Shot Type | Key Element

## EQUIPMENT/PROPS NEEDED
Checklist

Keep it detailed enough to film from but not verbose."""

    try:
        return generate_with_model(model, prompt)
    except Exception as e:
        logger.error(f"Storyboard node error: {e}")
        return f"Storyboard error: {str(e)}"


# ============================================================================
# MAIN EXECUTION ENDPOINT
# ============================================================================

class WorkflowExecuteRequestV2(BaseModel):
    """Extended request with optional workflow_id for history tracking"""
    nodes: List[WorkflowNode]
    connections: List[Connection]
    brand_context: Optional[str] = None
    workflow_id: Optional[int] = None
    workflow_name: Optional[str] = None
    language: Optional[str] = "English"
    project_id: Optional[int] = None


@router.post("/execute", response_model=WorkflowExecuteResponse)
async def execute_workflow(
    request: WorkflowExecuteRequestV2,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute a node-based workflow.
    Processes nodes in topological order and returns results for each node.
    Saves execution to history for future reference.
    """
    import time
    start_time = time.time()

    # Create workflow run record for history
    workflow_name = request.workflow_name or "Untitled Workflow"
    run_number = 1

    if request.workflow_id:
        wf = db.query(Workflow).filter(
            Workflow.id == request.workflow_id,
            Workflow.user_id == current_user.id
        ).first()
        if wf:
            workflow_name = wf.name
            run_number = db.query(WorkflowRun).filter(
                WorkflowRun.workflow_id == request.workflow_id
            ).count() + 1

    # Create the run record
    workflow_run = WorkflowRun(
        user_id=current_user.id,
        workflow_id=request.workflow_id,
        workflow_name=workflow_name,
        run_number=run_number,
        status=WorkflowRunStatus.RUNNING,
        input_graph={
            "nodes": [n.model_dump() for n in request.nodes],
            "connections": [c.model_dump(by_alias=True) for c in request.connections]
        },
        node_count=len(request.nodes),
        started_at=datetime.utcnow(),
    )
    db.add(workflow_run)
    db.commit()
    db.refresh(workflow_run)

    try:
        logger.info(f"[WORKFLOW] User {current_user.id} executing workflow (run {workflow_run.id}) with {len(request.nodes)} nodes")

        if not request.nodes:
            workflow_run.status = WorkflowRunStatus.FAILED
            workflow_run.error_message = "No nodes in workflow"
            workflow_run.completed_at = datetime.utcnow()
            db.commit()
            return WorkflowExecuteResponse(
                success=False,
                results=[],
                error="No nodes in workflow"
            )

        # Check monthly credit reset
        CreditManager.check_and_reset_monthly(current_user, db)

        # Pre-check: estimate total cost
        estimated_cost = CreditManager.estimate_workflow_cost(request.nodes)
        if current_user.credits < estimated_cost:
            workflow_run.status = WorkflowRunStatus.FAILED
            workflow_run.error_message = f"Insufficient credits: need {estimated_cost}, have {current_user.credits}"
            workflow_run.completed_at = datetime.utcnow()
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "Insufficient credits for workflow",
                    "message": f"This workflow costs ~{estimated_cost} credits, you have {current_user.credits}",
                    "required": estimated_cost,
                    "available": current_user.credits,
                    "upgrade_url": "/pricing"
                }
            )

        # Load project context if project_id provided
        project_context_prefix = ""
        if request.project_id:
            project = db.query(Project).filter(
                Project.id == request.project_id,
                Project.user_id == current_user.id
            ).first()
            if project and project.profile_data:
                p = project.profile_data
                audience = p.get('audience', {})
                if isinstance(audience, dict):
                    audience_parts = []
                    if audience.get('age'): audience_parts.append(f"Age: {audience['age']}")
                    if audience.get('gender'): audience_parts.append(f"Gender: {audience['gender']}")
                    if audience.get('level'): audience_parts.append(f"Level: {audience['level']}")
                    if audience.get('interests'): audience_parts.append(f"Interests: {', '.join(audience['interests'])}")
                    audience_str = ', '.join(audience_parts)
                else:
                    audience_str = str(audience)

                creator_qa = ""
                if project.raw_input and project.raw_input.get('description_text'):
                    creator_qa = project.raw_input['description_text']

                project_context_prefix = f"""===== CREATOR PROFILE =====
NICHE: {p.get('niche', '')} / {p.get('sub_niche', '')}
FORMATS: {', '.join(p.get('format', []))}
PLATFORMS: {', '.join(p.get('platforms', []))}
TONE: {p.get('tone', '')}
AUDIENCE: {audience_str}
KEYWORDS: {', '.join(p.get('keywords', []))}
ANTI-KEYWORDS: {', '.join(p.get('anti_keywords', []))}
EXCLUDE: {', '.join(p.get('exclude', []))}

CREATOR'S OWN WORDS:
{creator_qa if creator_qa else 'N/A'}
===== END PROFILE =====

Tailor ALL workflow outputs for this creator's niche, tone, audience, and style.

"""

        # Get execution order
        execution_order = topological_sort(request.nodes, request.connections)
        logger.info(f"[WORKFLOW] Execution order: {execution_order}")

        # Store results
        node_outputs: Dict[int, str] = {}
        results: List[NodeResult] = []
        final_script = None
        storyboard = None
        total_credits_used = 0

        nodes_by_id = {n.id: n for n in request.nodes}

        # Process each node
        for node_id in execution_order:
            node = nodes_by_id.get(node_id)
            if not node:
                continue

            logger.info(f"[WORKFLOW] Processing node {node_id} type={node.type}")

            dependencies = get_node_dependencies(node_id, request.connections)
            input_content = "\n\n---\n\n".join(
                node_outputs.get(dep_id, "")
                for dep_id in dependencies
                if dep_id in node_outputs
            )

            # Prepend project context for AI processing nodes
            if project_context_prefix and node.type in ("analyze", "extract", "style", "generate", "refine", "script", "storyboard"):
                input_content = project_context_prefix + input_content

            # Find upstream video data (from connected video nodes)
            upstream_video = None
            for dep_id in dependencies:
                dep_node = nodes_by_id.get(dep_id)
                if dep_node and dep_node.videoData:
                    upstream_video = dep_node.videoData
                    break

            try:
                node_config = node.config
                lang = request.language or "English"
                if node.type == "video":
                    output = process_video_node(node, lang)
                elif node.type == "brand":
                    output = process_brand_node(node, request.brand_context or "", node_config)
                elif node.type == "analyze":
                    output = process_analyze_node(input_content, node_config, lang, upstream_video)
                elif node.type == "extract":
                    output = process_extract_node(input_content, node_config, lang, upstream_video)
                elif node.type == "style":
                    output = process_style_node(input_content, node_config, lang, upstream_video)
                elif node.type == "generate":
                    output = process_generate_node(input_content, node_config, lang)
                elif node.type == "refine":
                    output = process_refine_node(input_content, node_config, lang)
                elif node.type == "script":
                    output = process_script_output_node(input_content, node_config, lang)
                    final_script = output
                elif node.type == "storyboard":
                    output = process_storyboard_node(input_content, node_config, lang)
                    storyboard = output
                else:
                    output = f"Unknown node type: {node.type}"

                node_outputs[node_id] = output

                # Deduct credits for AI nodes
                node_model = (node_config.model if node_config and node_config.model else "gemini")
                node_cost = CreditManager.get_workflow_node_cost(node.type, node_model)
                if node_cost > 0:
                    current_user.credits = max(0, current_user.credits - node_cost)
                    total_credits_used += node_cost

                results.append(NodeResult(
                    node_id=node_id,
                    node_type=node.type,
                    content=output,
                    success=True
                ))

            except Exception as e:
                logger.error(f"[WORKFLOW] Error processing node {node_id}: {e}")
                results.append(NodeResult(
                    node_id=node_id,
                    node_type=node.type,
                    content="",
                    success=False,
                    error=str(e)
                ))

        # Calculate execution time
        execution_time_ms = int((time.time() - start_time) * 1000)

        # Update workflow run
        workflow_run.status = WorkflowRunStatus.COMPLETED
        workflow_run.results = [r.model_dump() for r in results]
        workflow_run.final_script = final_script
        workflow_run.storyboard = storyboard
        workflow_run.credits_used = total_credits_used
        workflow_run.execution_time_ms = execution_time_ms
        workflow_run.completed_at = datetime.utcnow()

        # Update parent workflow if linked
        if request.workflow_id:
            wf = db.query(Workflow).filter(Workflow.id == request.workflow_id).first()
            if wf:
                wf.last_run_at = datetime.utcnow()
                wf.last_run_results = {"run_id": workflow_run.id, "credits_used": total_credits_used}
                wf.status = WorkflowStatus.COMPLETED

        db.commit()

        logger.info(f"[WORKFLOW] Completed run {workflow_run.id} with {len(results)} results, {total_credits_used} credits used, {execution_time_ms}ms")

        return WorkflowExecuteResponse(
            success=True,
            results=results,
            final_script=final_script,
            storyboard=storyboard,
            credits_used=total_credits_used,
            credits_remaining=current_user.credits,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[WORKFLOW] Execution error: {e}")
        workflow_run.status = WorkflowRunStatus.FAILED
        workflow_run.error_message = str(e)
        workflow_run.completed_at = datetime.utcnow()
        workflow_run.execution_time_ms = int((time.time() - start_time) * 1000)
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Workflow execution failed: {str(e)}"
        )
