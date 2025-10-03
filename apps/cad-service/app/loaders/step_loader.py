from __future__ import annotations
from typing import Any


def occ_available() -> bool:
    try:
        import OCC
        return True
    except Exception:
        return False


def load_step_shape(path: str):
    """Return a TopoDS_Shape from a STEP file using pythonOCC.
    Raises RuntimeError if OCC not available or file can't be read.
    """
    if not occ_available():
        raise RuntimeError("pythonocc-core is not available in this environment")

    from OCC.Core.STEPControl import STEPControl_Reader
    from OCC.Core.IFSelect import IFSelect_RetDone

    reader = STEPControl_Reader()
    status = reader.ReadFile(path)
    if status != IFSelect_RetDone:
        raise RuntimeError("STEP read failed")
    reader.TransferRoots()
    shape = reader.OneShape()
    return shape


def shape_mass_props(shape) -> tuple[float, float]:
    """Return (volume_mm3, surface_area_mm2) for a TopoDS_Shape."""
    from OCC.Core.GProp import GProp_GProps
    from OCC.Core.BRepGProp import brepgprop_VolumeProperties, brepgprop_SurfaceProperties

    props = GProp_GProps()
    brepgprop_VolumeProperties(shape, props)
    vol = props.Mass() * 1e9  # m^3 -> mm^3 if kernel returns SI

    props2 = GProp_GProps()
    brepgprop_SurfaceProperties(shape, props2)
    area = props2.Mass() * 1e6  # m^2 -> mm^2
    return float(vol), float(area)

