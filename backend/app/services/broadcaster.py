import json
import logging
from typing import Dict, Set, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages active WebSocket connections for live vendor radar streaming."""

    def __init__(self):
        # Connected clients listening to general radar map updates
        self.radar_clients: Set[WebSocket] = set()
        # Connected clients listening to a specific vendor's updates {vendor_id: {websocket, ...}}
        self.vendor_subscribers: Dict[str, Set[WebSocket]] = {}

    async def connect_radar(self, websocket: WebSocket):
        await websocket.accept()
        self.radar_clients.add(websocket)
        logger.info(f"Radar client connected. Total clients: {len(self.radar_clients)}")

    def disconnect_radar(self, websocket: WebSocket):
        self.radar_clients.discard(websocket)
        logger.info(f"Radar client disconnected. Remaining: {len(self.radar_clients)}")

    async def connect_vendor(self, vendor_id: str, websocket: WebSocket):
        await websocket.accept()
        if vendor_id not in self.vendor_subscribers:
            self.vendor_subscribers[vendor_id] = set()
        self.vendor_subscribers[vendor_id].add(websocket)

    def disconnect_vendor(self, vendor_id: str, websocket: WebSocket):
        if vendor_id in self.vendor_subscribers:
            self.vendor_subscribers[vendor_id].discard(websocket)
            if not self.vendor_subscribers[vendor_id]:
                del self.vendor_subscribers[vendor_id]

    async def broadcast_vendor_update(self, vendor_data: Dict[str, Any]):
        """Broadcast live vendor GPS update to all radar map clients and vendor subscribers."""
        payload = json.dumps({
            "type": "VENDOR_LOCATION_UPDATE",
            "data": vendor_data
        })

        # Broadcast to general radar listeners
        dead_clients = set()
        for client in self.radar_clients:
            try:
                await client.send_text(payload)
            except Exception:
                dead_clients.add(client)
        self.radar_clients.difference_update(dead_clients)

        # Broadcast to specific vendor subscribers
        vendor_id = vendor_data.get("id")
        if vendor_id and vendor_id in self.vendor_subscribers:
            dead_vendor_clients = set()
            for client in self.vendor_subscribers[vendor_id]:
                try:
                    await client.send_text(payload)
                except Exception:
                    dead_vendor_clients.add(client)
            self.vendor_subscribers[vendor_id].difference_update(dead_vendor_clients)

manager = ConnectionManager()
