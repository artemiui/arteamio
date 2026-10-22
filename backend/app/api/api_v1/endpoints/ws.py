from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.broadcaster import manager

router = APIRouter()

@router.websocket("/radar")
async def websocket_radar_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for consumer buyer map.
    Receives real-time streaming updates whenever any nearby vendor moves.
    """
    await manager.connect_radar(websocket)
    try:
        while True:
            # Keep connection alive; buyers can also send heartbeat ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect_radar(websocket)

@router.websocket("/vendors/{vendor_id}")
async def websocket_vendor_endpoint(websocket: WebSocket, vendor_id: str):
    """
    WebSocket endpoint for dedicated vendor tracking / subscription.
    """
    await manager.connect_vendor(vendor_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect_vendor(vendor_id, websocket)
