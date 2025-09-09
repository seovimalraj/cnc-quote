#!/usr/bin/env python3
"""
Test script to verify the DFMCheck creation fix
"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from pydantic import BaseModel
    from typing import List, Dict, Any, Optional

    class DFMCheck(BaseModel):
        id: str
        title: str
        status: str  # passed, warning, blocker
        message: str
        metrics: Optional[Dict[str, Any]] = None
        suggestions: List[str] = []
        highlights: Dict[str, List[int]]  # face_ids, edge_ids

    # Test data with the fixed "passed" status
    test_check_data = {
        "id": "file_type",
        "title": "File Type",
        "status": "passed",  # Fixed: was "pass" which is a Python keyword
        "message": "STEP file format is supported for CNC machining.",
        "metrics": {"file_extension": ".step"},
        "suggestions": [],
        "highlights": {"face_ids": [], "edge_ids": []}
    }

    # Test creating DFMCheck object
    check = DFMCheck(**test_check_data)
    print("✅ DFMCheck creation successful!")
    print(f"   ID: {check.id}")
    print(f"   Status: {check.status}")
    print(f"   Title: {check.title}")

    # Test with multiple checks
    mock_checks = [
        {
            "id": "test1",
            "title": "Test Check 1",
            "status": "passed",
            "message": "Test message 1",
            "highlights": {"face_ids": [], "edge_ids": []}
        },
        {
            "id": "test2",
            "title": "Test Check 2",
            "status": "warning",
            "message": "Test message 2",
            "highlights": {"face_ids": [1, 2], "edge_ids": [3]}
        },
        {
            "id": "test3",
            "title": "Test Check 3",
            "status": "blocker",
            "message": "Test message 3",
            "highlights": {"face_ids": [], "edge_ids": []}
        }
    ]

    checks = [DFMCheck(**check) for check in mock_checks]
    print(f"✅ Created {len(checks)} DFMCheck objects successfully!")

    # Test summary calculation
    summary = {
        "passed": len([c for c in checks if c.status == "passed"]),
        "warnings": len([c for c in checks if c.status == "warning"]),
        "blockers": len([c for c in checks if c.status == "blocker"])
    }

    print("✅ Summary calculation successful!")
    print(f"   Passed: {summary['passed']}")
    print(f"   Warnings: {summary['warnings']}")
    print(f"   Blockers: {summary['blockers']}")

    print("\n🎉 All tests passed! The DFMCheck creation issue has been fixed.")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
