"""Unit tests for geospatial primitives."""

import math

from app.services.geo import (
    bounding_box,
    haversine_meters,
    path_distance_meters,
    point_in_polygon,
)


def test_haversine_one_degree_latitude() -> None:
    distance = haversine_meters(0.0, 0.0, 1.0, 0.0)
    assert math.isclose(distance, 111_194.9, rel_tol=1e-3)


def test_haversine_zero_for_same_point() -> None:
    assert haversine_meters(40.7, -74.0, 40.7, -74.0) == 0.0


def test_path_distance_sums_segments() -> None:
    points = [(0.0, 0.0), (1.0, 0.0), (2.0, 0.0)]
    assert math.isclose(
        path_distance_meters(points),
        2 * haversine_meters(0.0, 0.0, 1.0, 0.0),
        rel_tol=1e-9,
    )


def test_bounding_box_contains_center() -> None:
    lat_min, lat_max, lng_min, lng_max = bounding_box(40.0, -73.0, 1000.0)
    assert lat_min < 40.0 < lat_max
    assert lng_min < -73.0 < lng_max


def test_point_in_polygon_square() -> None:
    square = [(0.0, 0.0), (0.0, 2.0), (2.0, 2.0), (2.0, 0.0)]
    assert point_in_polygon(1.0, 1.0, square)
    assert not point_in_polygon(3.0, 3.0, square)


def test_point_in_polygon_rejects_degenerate() -> None:
    assert not point_in_polygon(0.0, 0.0, [(0.0, 0.0), (1.0, 1.0)])
