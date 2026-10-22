import uuid
from sqlalchemy import Column, String, Float
from app.database import Base

class TransitAnchor(Base):
    __tablename__ = "transit_anchors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)
    type = Column(String(50), nullable=False)  # jeepney, train, tricycle, school, footbridge
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    weight = Column(Float, default=1.0)

class CompetitorNode(Base):
    __tablename__ = "competitor_nodes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)  # taho, siomai, balut, general
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
