from __future__ import annotations
from typing import List, Tuple
import numpy as np

from ..models import MinWallData, MinWallSample


def min_wall_mesh(mesh, *, samples: int = 5000, threshold_mm: float = 1.5) -> MinWallData:
    """Approximate min-wall thickness on a mesh using ray casting along face normals.
    This is a heuristic and depends on mesh quality.
    """
    # Sample points uniformly on surface
    pts, face_index = mesh.sample(samples, return_index=True)
    face_normals = mesh.face_normals[face_index]

    # Build ray intersector (triangle-based, no pyembree dependency)
    try:
        from trimesh.ray.ray_triangle import RayMeshIntersector
        intersector = RayMeshIntersector(mesh)
    except Exception:
        # Fallback: no ray intersector available; return empty result
        return MinWallData(global_min_mm=0.0, samples=[])

    # Cast rays forward and backward and measure first hit distances
    origins = pts
    directions_f = face_normals
    directions_b = -face_normals

    # Add small epsilon to origins to avoid self-hit
    eps = 1e-6
    origins_f = origins + directions_f * eps
    origins_b = origins + directions_b * eps

    dists_f = _first_hit_distance(intersector, origins_f, directions_f)
    dists_b = _first_hit_distance(intersector, origins_b, directions_b)

    total = dists_f + dists_b
    # Filter valid finite values
    valid = np.isfinite(total)
    total = total[valid]
    origins_valid = origins[valid]

    if total.size == 0:
        return MinWallData(global_min_mm=0.0, samples=[])

    global_min = float(np.min(total))
    # Collect sub-threshold samples
    mask = total <= max(threshold_mm, global_min)
    chosen_pts = origins_valid[mask]
    chosen_d = total[mask]

    samples_out: List[MinWallSample] = []
    for i in range(min(50, chosen_pts.shape[0])):
        p = chosen_pts[i]
        t = float(chosen_d[i])
        samples_out.append(MinWallSample(at=(float(p[0]), float(p[1]), float(p[2])), thickness_mm=t, face_ids=[]))

    return MinWallData(global_min_mm=global_min, samples=samples_out)


def _first_hit_distance(intersector, origins: np.ndarray, directions: np.ndarray) -> np.ndarray:
    # Query intersections; returns list per ray
    locations, index_ray, _ = intersector.intersects_location(origins, directions, multiple_hits=False)
    # initialize with inf
    distances = np.full(len(origins), np.inf, dtype=float)
    if len(index_ray) == 0:
        return distances
    # Map hits to first-hit distances
    vec = locations - origins[index_ray]
    d = np.linalg.norm(vec, axis=1)
    distances[index_ray] = d
    return distances

