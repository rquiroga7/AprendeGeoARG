#!/usr/bin/env python3
"""
Convert GeoJSON province data from mgaitan/departamentos_argentina
to the SVG-path based format used by the AprendeGeoAR app.
"""

import json
import os
import math
import urllib.request
import sys

GEO_BASE = 'https://raw.githubusercontent.com/mgaitan/departamentos_argentina/master'

# Departments in these provinces that are distant offshore territories
# Their paths are kept but rendered in a picture-in-picture inset
OFFSHORE_DEPARTMENTS = {
    'tierra_del_fuego': ['Islas Malvinas', 'Islas del Atlantico Sur'],
}

# Provinces needing southern latitude clipping (removes Antarctic claims)
SOUTH_CLIP = {
    'tierra_del_fuego': -56.0,
}

PROVINCES = [
    ('buenos_aires', 'Buenos Aires'),
    ('catamarca', 'Catamarca'),
    ('chaco', 'Chaco'),
    ('chubut', 'Chubut'),
    ('ciudad_autonoma_de_buenos_aires', 'CABA'),
    ('cordoba', 'Córdoba'),
    ('corrientes', 'Corrientes'),
    ('entre_rios', 'Entre Ríos'),
    ('formosa', 'Formosa'),
    ('jujuy', 'Jujuy'),
    ('la_pampa', 'La Pampa'),
    ('la_rioja', 'La Rioja'),
    ('mendoza', 'Mendoza'),
    ('misiones', 'Misiones'),
    ('neuquen', 'Neuquén'),
    ('rio_negro', 'Río Negro'),
    ('salta', 'Salta'),
    ('san_juan', 'San Juan'),
    ('san_luis', 'San Luis'),
    ('santa_cruz', 'Santa Cruz'),
    ('santa_fe', 'Santa Fe'),
    ('santiago_del_estero', 'Santiago del Estero'),
    ('tierra_del_fuego', 'Tierra del Fuego'),
    ('tucuman', 'Tucumán'),
]

def download_json(filename):
    url = f'{GEO_BASE}/{filename}'
    print(f'Downloading {url}...')
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f'  ERROR: {e}')
        return None

def smart_title(s):
    """Convert uppercase Spanish name to proper title case."""
    lowercase_words = {'del', 'de', 'la', 'las', 'los', 'y', 'e', 'el', 'en'}
    parts = s.lower().split()
    result = []
    for i, p in enumerate(parts):
        if i == 0 or p not in lowercase_words:
            result.append(p[0].upper() + p[1:] if p else p)
        else:
            result.append(p)
    return ' '.join(result)

def project_coords(coords, bounds, padding=40):
    """Project lat/lng to SVG coordinates with aspect-ratio preserved."""
    min_lng, min_lat, max_lng, max_lat = bounds
    svg_w = 500
    lng_range = max_lng - min_lng
    lat_range = max_lat - min_lat
    if lng_range == 0:
        lng_range = 0.01
    if lat_range == 0:
        lat_range = 0.01

    aspect = lat_range / lng_range
    svg_h = svg_w * aspect + 2 * padding

    scale_x = (svg_w - 2 * padding) / lng_range
    scale_y = (svg_h - 2 * padding) / lat_range

    def project(coord):
        lng, lat = coord
        x = (lng - min_lng) * scale_x + padding
        y = (max_lat - lat) * scale_y + padding
        return x, y

    result = []
    for ring in coords:
        projected = [project(c) for c in ring]
        result.append(projected)
    return result, svg_w, svg_h

def ring_to_path(ring):
    parts = []
    for i, (x, y) in enumerate(ring):
        cmd = 'M' if i == 0 else 'L'
        parts.append(f'{cmd}{x:.3f},{y:.3f}')
    if ring:
        parts.append('Z')
    return ''.join(parts)

def polygon_centroid(rings):
    """Compute centroid of a polygon from its rings (first ring = exterior)."""
    if not rings:
        return 0, 0
    ring = rings[0]
    if len(ring) < 3:
        return ring[0] if ring else (0, 0)
    cx = sum(p[0] for p in ring) / len(ring)
    cy = sum(p[1] for p in ring) / len(ring)
    return cx, cy

def compute_viewbox(xs, ys, padding=60, min_size=500):
    min_x = min(xs) - padding
    max_x = max(xs) + padding
    min_y = min(ys) - padding
    max_y = max(ys) + padding
    svg_w = max(min_size, math.ceil(max_x - min_x))
    svg_h = max(min_size, math.ceil(max_y - min_y))
    return f'{min_x:.1f} {min_y:.1f} {svg_w:.1f} {svg_h:.1f}'

def process_province(prov_key, prov_name):
    filename = f'departamentos-{prov_key}.json'
    data = download_json(filename)
    if data is None:
        return None

    features = data.get('features', [])
    print(f'  Found {len(features)} features')

    # Collect all coordinates to compute bounding box,
    # and store original geometry by department name for post-processing
    all_coords = []
    orig_rings_by_name = {}
    for feat in features:
        geo = feat.get('geometry', {})
        dep_name = smart_title(feat.get('properties', {}).get('departamento', ''))
        rings_list = []
        if geo.get('type') == 'Polygon':
            ring_group = geo['coordinates']
            rings_list.append(ring_group)
            for ring in ring_group:
                all_coords.extend(ring)
        elif geo.get('type') == 'MultiPolygon':
            for polygon in geo['coordinates']:
                rings_list.append(polygon)
                for ring in polygon:
                    all_coords.extend(ring)
        orig_rings_by_name[dep_name] = rings_list

    if not all_coords:
        print('  No coordinates found!')
        return None

    # Clip southern latitudes to remove Antarctic claims from bounds
    clip_south = SOUTH_CLIP.get(prov_key)
    if clip_south is not None:
        all_coords = [c for c in all_coords if c[1] >= clip_south]
        if not all_coords:
            print('  All coordinates filtered by south clip!')
            return None

    lngs = [c[0] for c in all_coords]
    lats = [c[1] for c in all_coords]
    bounds = (min(lngs), min(lats), max(lngs), max(lats))
    print(f'  Bounds: lng=[{bounds[0]:.4f}, {bounds[2]:.4f}], lat=[{bounds[1]:.4f}, {bounds[3]:.4f}]')

    offshore_names = OFFSHORE_DEPARTMENTS.get(prov_key, [])

    # Pre-compute projection dimensions for coordinate clipping
    clip_svg_h = None
    clip_scale_y = None
    clip_padding = 40
    lng_range = bounds[2] - bounds[0]
    lat_range = bounds[3] - bounds[1]
    if lng_range > 0 and lat_range > 0:
        clip_aspect = lat_range / lng_range
        clip_svg_h = 500 * clip_aspect + 2 * clip_padding
        clip_scale_y = (clip_svg_h - 2 * clip_padding) / lat_range

    # Project and create departments
    departments = []
    all_path_x = []
    all_path_y = []
    main_path_x = []
    main_path_y = []
    inset_path_x = []
    inset_path_y = []

    for feat in features:
        props = feat.get('properties', {})
        dep_name = smart_title(props.get('departamento', ''))
        capital = smart_title(props.get('cabecera', ''))
        is_offshore = dep_name in offshore_names
        geo = feat.get('geometry', {})

        all_rings = []
        if geo.get('type') == 'Polygon':
            all_rings.append(geo['coordinates'])
        elif geo.get('type') == 'MultiPolygon':
            for polygon in geo['coordinates']:
                all_rings.append(polygon)

        projected_rings = []
        for rings in all_rings:
            projected, _, _ = project_coords(rings, bounds)
            projected_rings.extend(projected)

        # For offshore departments, clip projected coordinates south of the clip latitude
        if is_offshore and clip_south is not None and clip_scale_y is not None:
            y_limit = (bounds[3] - clip_south) * clip_scale_y + clip_padding + 20
            clipped = []
            for ring in projected_rings:
                pts = [(x, y) for x, y in ring if y <= y_limit]
                if len(pts) > 2:
                    clipped.append(pts)
            if clipped:
                projected_rings = clipped
            else:
                projected_rings = []

        for ring in projected_rings:
            for x, y in ring:
                all_path_x.append(x)
                all_path_y.append(y)
                if is_offshore:
                    inset_path_x.append(x)
                    inset_path_y.append(y)
                else:
                    main_path_x.append(x)
                    main_path_y.append(y)

        path = ''.join(ring_to_path(r) for r in projected_rings) if projected_rings else ''
        if not path:
            continue

        cx, cy = polygon_centroid(projected_rings)

        dept_entry = {
            'name': dep_name,
            'capital': capital,
            'path': path,
            'cx': round(cx, 1),
            'cy': round(cy, 1),
            'offshore': is_offshore,
        }

        # Compute tight viewBox for offshore departments (individual PIP)
        if is_offshore and projected_rings:
            dept_xs = [p[0] for ring in projected_rings for p in ring]
            dept_ys = [p[1] for ring in projected_rings for p in ring]
            if dept_xs and dept_ys:
                d_min_x = min(dept_xs) - 2
                d_max_x = max(dept_xs) + 2
                d_min_y = min(dept_ys) - 2
                d_max_y = max(dept_ys) + 2
                d_w = max(5, math.ceil(d_max_x - d_min_x))
                d_h = max(5, math.ceil(d_max_y - d_min_y))
                dept_entry['insetViewBox'] = f'{d_min_x:.1f} {d_min_y:.1f} {d_w:.1f} {d_h:.1f}'

        departments.append(dept_entry)

    # Post-processing: if Islas Malvinas was entirely clipped (all Antarctica),
    # extract Malvinas islands from Islas del Atlantico Sur's rings
    dept_names = [d['name'] for d in departments]
    if 'Islas Malvinas' not in dept_names and 'Islas del Atlantico Sur' in dept_names:
        atl_idx = dept_names.index('Islas del Atlantico Sur')
        atl_orig_rings = orig_rings_by_name.get('Islas del Atlantico Sur', [])

        # Decompose into individual flat rings (each ring is a list of [lng, lat])
        all_rings_flat = []
        for group in atl_orig_rings:
            for ring in group:
                all_rings_flat.append(ring)

        # Bounding box for Malvinas islands (in unprojected lat/lng)
        MALVINAS_BBOX = {'lng': (-62.0, -57.0), 'lat': (-53.0, -50.5)}

        def ring_centroid_lnglat(ring):
            xs = [p[0] for p in ring]
            ys = [p[1] for p in ring]
            return sum(xs) / len(xs), sum(ys) / len(ys)

        malvinas_rings = []
        remaining_rings = []
        for ring in all_rings_flat:
            clng, clat = ring_centroid_lnglat(ring)
            if (MALVINAS_BBOX['lng'][0] <= clng <= MALVINAS_BBOX['lng'][1] and
                MALVINAS_BBOX['lat'][0] <= clat <= MALVINAS_BBOX['lat'][1]):
                malvinas_rings.append(ring)
            else:
                remaining_rings.append(ring)

        if malvinas_rings:
            # Project Malvinas rings
            malv_projected, _, _ = project_coords(malvinas_rings, bounds)
            # Build path (use all rings)
            malv_path = ''.join(ring_to_path(r) for r in malv_projected)
            if malv_path:
                malv_cx, malv_cy = polygon_centroid(malv_projected)
                malv_dept = {
                    'name': 'Islas Malvinas',
                    'capital': '',
                    'path': malv_path,
                    'cx': round(malv_cx, 1),
                    'cy': round(malv_cy, 1),
                    'offshore': True,
                }
                # Compute insetViewBox for Malvinas
                malv_xs = [p[0] for r in malv_projected for p in r]
                malv_ys = [p[1] for r in malv_projected for p in r]
                if malv_xs and malv_ys:
                    d_min_x = min(malv_xs) - 2
                    d_max_x = max(malv_xs) + 2
                    d_min_y = min(malv_ys) - 2
                    d_max_y = max(malv_ys) + 2
                    d_w = max(5, math.ceil(d_max_x - d_min_x))
                    d_h = max(5, math.ceil(d_max_y - d_min_y))
                    malv_dept['insetViewBox'] = f'{d_min_x:.1f} {d_min_y:.1f} {d_w:.1f} {d_h:.1f}'
                departments.append(malv_dept)
                # Also update offshore name list so it gets proper PIP treatment
                if 'Islas Malvinas' not in offshore_names:
                    offshore_names.append('Islas Malvinas')

            # Update Islas del Atlantico Sur to exclude the Malvinas rings
            if remaining_rings:
                atl_projected, _, _ = project_coords(remaining_rings, bounds)
                atl_path = ''.join(ring_to_path(r) for r in atl_projected)
                if atl_path:
                    departments[atl_idx]['path'] = atl_path
                    atl_cx, atl_cy = polygon_centroid(atl_projected)
                    departments[atl_idx]['cx'] = round(atl_cx, 1)
                    departments[atl_idx]['cy'] = round(atl_cy, 1)
                    # Recompute insetViewBox for Atlantico Sur
                    # Filter to core cluster (rings near the largest remaining ring)
                    atl_ring_sizes = [(len(r), r) for r in atl_projected]
                    atl_ring_sizes.sort(reverse=True)
                    if atl_ring_sizes:
                        lr = atl_ring_sizes[0][1]
                        lcx = sum(p[0] for p in lr) / len(lr)
                        lcy = sum(p[1] for p in lr) / len(lr)
                        core = [r for r in atl_projected if
                            abs(sum(p[0] for p in r) / len(r) - lcx) <= 50 and
                            abs(sum(p[1] for p in r) / len(r) - lcy) <= 50]
                        if not core:
                            core = atl_projected
                    else:
                        core = atl_projected
                    atl_xs = [p[0] for r in core for p in r]
                    atl_ys = [p[1] for r in core for p in r]
                    if atl_xs and atl_ys:
                        d_min_x = min(atl_xs) - 2
                        d_max_x = max(atl_xs) + 2
                        d_min_y = min(atl_ys) - 2
                        d_max_y = max(atl_ys) + 2
                        d_w = max(5, math.ceil(d_max_x - d_min_x))
                        d_h = max(5, math.ceil(d_max_y - d_min_y))
                        departments[atl_idx]['insetViewBox'] = f'{d_min_x:.1f} {d_min_y:.1f} {d_w:.1f} {d_h:.1f}'

    if not departments:
        return None

    # Sort departments north-to-south by cy (lower cy = more north)
    departments.sort(key=lambda d: d['cy'])

    if not all_path_x or not all_path_y:
        return None

    print(f'  Path coords: {len(all_path_x)} points')
    print(f'  Path x range: {min(all_path_x):.1f} to {max(all_path_x):.1f}')
    print(f'  Path y range: {min(all_path_y):.1f} to {max(all_path_y):.1f}')

    viewbox = compute_viewbox(all_path_x, all_path_y)
    print(f'  ViewBox: {viewbox}')

    result = {
        'key': prov_key,
        'name': prov_name,
        'departments': departments,
        'viewBox': viewbox,
    }

    # If there are offshore departments, compute separate viewBoxes
    if offshore_names:
        # Main viewBox: tight around mainland departments, zoomed in 2x
        main_min_x = min(main_path_x) - 60
        main_max_x = max(main_path_x) + 60
        main_min_y = min(main_path_y) - 60
        main_max_y = max(main_path_y) + 60
        main_cx = (main_min_x + main_max_x) / 2
        main_cy = (main_min_y + main_max_y) / 2
        main_w = (main_max_x - main_min_x) / 2
        main_h = (main_max_y - main_min_y) / 2
        result['mainViewBox'] = f'{main_cx - main_w/2:.1f} {main_cy - main_h/2:.1f} {main_w:.1f} {main_h:.1f}'
        # Tighter padding for the PIP inset
        min_x = min(inset_path_x) - 2
        max_x = max(inset_path_x) + 2
        min_y = min(inset_path_y) - 2
        max_y = max(inset_path_y) + 2
        ins_w = max(5, math.ceil(max_x - min_x))
        ins_h = max(5, math.ceil(max_y - min_y))
        result['insetViewBox'] = f'{min_x:.1f} {min_y:.1f} {ins_w:.1f} {ins_h:.1f}'
        print(f'  Main ViewBox: {result["mainViewBox"]}')
        print(f'  Inset ViewBox: {result["insetViewBox"]}')

    return result

def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'provinces')
    os.makedirs(out_dir, exist_ok=True)

    province_index = []

    for prov_key, prov_name in PROVINCES:
        print(f'\nProcessing {prov_name}...')
        result = process_province(prov_key, prov_name)
        if result:
            dept_count = len(result['departments'])
            print(f'  {dept_count} departments processed')

            # Write individual province file
            out_file = os.path.join(out_dir, f'{prov_key}.json')
            with open(out_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False)

            province_index.append({
                'key': prov_key,
                'name': prov_name,
                'count': dept_count,
            })
        else:
            print(f'  FAILED')

    # Write province index
    index_file = os.path.join(os.path.dirname(out_dir), 'provinces.json')
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(province_index, f, ensure_ascii=False)

    print(f'\nDone! Processed {len(province_index)} provinces.')
    print(f'Index: {index_file}')

if __name__ == '__main__':
    main()
