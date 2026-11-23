"""Read-only range extraction: python3 extract-motion-ranges.py /path/to/Ainekio > ranges.csv.

Summarizes explicit V1 targets and sampled V2 CAD angles. These are NOT physical
travel limits, continuous extrema, or an all-settings gait qualification.
Only the declared V2 gestures and current locomotion/run recordings are used;
retired fixed-angle turns and the older variable-walk recording are excluded.
"""
import csv
import hashlib
import json
import math
from pathlib import Path
import sys

root = Path(sys.argv[1])
writer = csv.writer(sys.stdout, lineterminator='\n')
writer.writerow(['model', 'recording', 'joint', 'units', 'minimum', 'maximum', 'source', 'source_sha256'])

def read(path):
    data = path.read_bytes()
    return json.loads(data), hashlib.sha256(data).hexdigest()

path = root / 'Slave/software/assets/seed/motions-v1.json'
v1, digest = read(path)
for motion in v1['assets']:
    targets = [[] for _ in range(8)]
    for frame in motion['frames']:
        for joint, angle in frame['targets']:
            targets[joint].append(angle)
    for joint, values in enumerate(targets):
        if values:
            writer.writerow(['V1', motion['name'], joint, 'logical degrees', min(values), max(values), path.relative_to(root), digest])

model = root / 'Slave/software/models/v2-12servo'
catalog, _ = read(model / 'motions/gestures/catalog.json')
paths = [model / 'motions/gestures' / item['path'] / 'source.json' for item in catalog['commands']]
paths += sorted((model / 'motions/locomotion').glob('*/source.json'))
paths += [model / 'motions/run/source.json']
for path in paths:
    data, digest = read(path)
    assert data['metadata']['angle_units'] == 'radian', path
    values = [[] for _ in range(12)]
    for sample in data['samples']:
        for leg, triple in enumerate(sample['actuator_angles_rad']):
            for axis, value in enumerate(triple):
                values[leg*3+axis].append(math.degrees(value))
    for joint, angles in enumerate(values):
        leg = data['metadata']['leg_order'][joint//3]
        axis = data['metadata']['joint_order'][joint%3]
        writer.writerow(['V2', path.parent.name, f'{leg}:{axis}', 'signed CAD degrees', f'{min(angles):.6f}', f'{max(angles):.6f}', path.relative_to(root), digest])
