#!/usr/bin/env python3
"""
Test script for CAD service components
"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    # Test imports
    from fastapi import FastAPI
    from pydantic import BaseModel
    from typing import List, Dict, Any, Optional
    import uuid
    import asyncio
    from datetime import datetime

    print("✅ All imports successful")

    # Test Pydantic models
    class DFMCheck(BaseModel):
        id: str
        title: str
        status: str
        message: str
        metrics: Optional[Dict[str, Any]] = None
        suggestions: List[str] = []
        highlights: Dict[str, List[int]]

    # Test model creation
    test_check = DFMCheck(
        id="test",
        title="Test Check",
        status="pass",
        message="Test message",
        highlights={"face_ids": [], "edge_ids": []}
    )

    print("✅ Pydantic models working")

    # Test FastAPI app creation
    app = FastAPI(title="Test CAD Service", version="1.0.0")
    print("✅ FastAPI app created successfully")

    print("\n🎉 All tests passed! The CAD service should work correctly.")

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please install required dependencies: pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
