def scale_to_mm(units_hint: str | None) -> float:
    """Return scale factor to convert input units to millimeters."""
    if not units_hint or units_hint == "mm":
        return 1.0
    if units_hint == "inch" or units_hint == "in":
        return 25.4
    return 1.0

