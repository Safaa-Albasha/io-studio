#!/usr/bin/env python3
# I/O Studio — يبني غرفة كاملة داخل Blender من room.json.
#
# الطريقة المعتادة (عن طريق Node، يحوّل room.json + الستايل + الكتالوج لمشهد):
#   node engine/interior.js build room.json --blend room.blend
# مباشرة من Blender:
#   blender -b -P engine/blender/build_room.py -- --room room.json --blend room.blend
#   blender -b -P engine/blender/build_room.py -- --scene scene.json --blend room.blend
# فحص بدون Blender (يطبع شجرة المشهد):
#   python3 engine/blender/build_room.py --dry-run --room room.json
#
# كل شي مبني من أشكال بسيطة (مكعب/أسطوانة/كرة/مخروط/حلقة) مع حواف مدوّرة،
# مواد Principled BSDF، وعقد إجرائية للخشب والقماش والرخام والبلاط والطابوق.
# بدون HDRI: لون السماء من وقت اليوم.
import argparse
import json
import math
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.dirname(os.path.dirname(HERE))


def log(msg):
    print('IO ' + msg, flush=True)


def parse_args(argv=None):
    argv = sys.argv if argv is None else argv
    argv = argv[argv.index('--') + 1:] if '--' in argv else argv[1:]
    p = argparse.ArgumentParser(description='I/O Studio room builder')
    p.add_argument('--scene', help='scene.json (resolved by engine/interior.js)')
    p.add_argument('--room', help='room.json (will be resolved through node)')
    p.add_argument('--format', default=None)
    p.add_argument('--variant', default=None, help='styled | before')
    p.add_argument('--blend', help='save .blend here')
    p.add_argument('--engine', default='eevee')
    p.add_argument('--samples', type=int, default=32)
    p.add_argument('--dry-run', action='store_true')
    args, _ = p.parse_known_args(argv)
    return args


def load_scene(path=None, room=None, fmt=None, variant=None):
    if path:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    if room:
        cmd = ['node', os.path.join(PLUGIN, 'engine', 'interior.js'), 'scene', room]
        if fmt:
            cmd += ['--format', fmt]
        if variant:
            cmd += ['--variant', variant]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        if r.returncode != 0:
            raise SystemExit('IO ERROR resolving room: ' + r.stdout + r.stderr)
        txt = r.stdout[r.stdout.index('{'):]
        return json.loads(txt)
    raise SystemExit('IO ERROR: --scene or --room is required')


# ───────── فحص بدون Blender ─────────
def dry_run(scene):
    R = scene['room']
    log('dry-run: %s  style=%s  variant=%s  format=%s' % (scene['name'], scene.get('style'), scene.get('variant'), scene.get('format')))
    log('room %.2f x %.2f x %.2f m' % (R['width'], R['depth'], R['height']))
    parts = 0
    bad = []
    for o in scene['objects']:
        parts += len(o['parts'])
        for p in o['parts']:
            if p['shape'] not in ('box', 'cyl', 'sphere', 'cone', 'torus'):
                bad.append('%s: unknown shape %s' % (o['id'], p['shape']))
            if p['mat'] not in scene['materials']:
                bad.append('%s: missing material %s' % (o['id'], p['mat']))
            if any(v <= 0 for v in p['s']):
                bad.append('%s: non-positive size %s' % (o['id'], p['s']))
        pos = o['position']
        log('  [%s] %-20s %-24s @ (%.2f, %.2f, %.2f) rot %5.1f  parts=%d' % (
            o['role'], o['id'][:20], (o.get('type') or '')[:24], pos[0], pos[1], pos[2], o.get('rotation', 0), len(o['parts'])))
    for name, m in scene['materials'].items():
        log('  material %-14s %-9s %s' % (name, m.get('kind'), m.get('color')))
    L = scene['lighting']
    log('  sun: %s' % (json.dumps(L['sun']) if L['sun'] else 'off (%s)' % L['time_of_day']))
    log('  world: %s' % json.dumps(L['world']))
    if L.get('fill'):
        log('  fill area light: %.0f W' % L['fill']['power'])
    for l in L['lamps']:
        log('  lamp %-5s %6.0f W at %s from %s' % (l['type'], l['power'], l['position'], l.get('from')))
    for c in scene['cameras']['stills']:
        log('  camera %-14s %s -> %s lens %s' % (c['name'], c['position'], c['target'], c['lens']))
    wt = scene['cameras']['walkthrough']
    log('  walkthrough: %d keys, %ss @ %sfps' % (len(wt['keys']), wt['seconds'], wt['fps']))
    log('totals: objects=%d parts=%d materials=%d lamps=%d' % (len(scene['objects']), parts, len(scene['materials']), len(L['lamps'])))
    if bad:
        for b in bad:
            log('ERROR ' + b)
        return 1
    log('dry-run OK')
    return 0


# ───────── Blender ─────────
def hex_rgba(h, mul=1.0):
    h = h.lstrip('#')
    rgb = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    # sRGB → linear
    lin = [((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92 for c in rgb]
    return (min(1.0, lin[0] * mul), min(1.0, lin[1] * mul), min(1.0, lin[2] * mul), 1.0)


def set_input(node, names, value):
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return True
    return False


class Builder:
    def __init__(self, scene, engine='eevee', samples=32):
        import bpy  # noqa
        self.bpy = bpy
        self.scene_data = scene
        self.engine = engine
        self.samples = samples
        self.mats = {}
        self.unit_meshes = {}
        self.cams = {}

    # ---- عام ----
    def reset(self):
        bpy = self.bpy
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.scn = bpy.context.scene
        self.scn.name = 'Room'
        self.cols = {}
        for name in ('Room', 'Furniture', 'Decor', 'Lights', 'Cameras'):
            c = bpy.data.collections.new(name)
            self.scn.collection.children.link(c)
            self.cols[name] = c

    def link(self, obj, col):
        self.cols[col].objects.link(obj)

    # ---- المواد ----
    def planar_vector(self, nt, scale=1.0):
        """متجه إسقاط: (x, y) للأرضية و (x+y, z) للجدران — حتى البلاط والخشب يطلعون صح بكل الاتجاهات."""
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(geo.outputs['Position'], sep.inputs[0])
        nsep = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(geo.outputs['Normal'], nsep.inputs[0])
        absn = nt.nodes.new('ShaderNodeMath'); absn.operation = 'ABSOLUTE'
        nt.links.new(nsep.outputs['Z'], absn.inputs[0])
        stp = nt.nodes.new('ShaderNodeMath'); stp.operation = 'GREATER_THAN'; stp.inputs[1].default_value = 0.5
        nt.links.new(absn.outputs[0], stp.inputs[0])
        add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
        nt.links.new(sep.outputs['X'], add.inputs[0]); nt.links.new(sep.outputs['Y'], add.inputs[1])
        floor_v = nt.nodes.new('ShaderNodeCombineXYZ')
        nt.links.new(sep.outputs['X'], floor_v.inputs[0]); nt.links.new(sep.outputs['Y'], floor_v.inputs[1])
        wall_v = nt.nodes.new('ShaderNodeCombineXYZ')
        nt.links.new(add.outputs[0], wall_v.inputs[0]); nt.links.new(sep.outputs['Z'], wall_v.inputs[1])
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'VECTOR'
        nt.links.new(stp.outputs[0], mix.inputs['Factor'])
        nt.links.new(wall_v.outputs[0], mix.inputs[4])
        nt.links.new(floor_v.outputs[0], mix.inputs[5])
        if scale != 1.0:
            sc = nt.nodes.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'
            sc.inputs['Scale'].default_value = scale
            nt.links.new(mix.outputs[1], sc.inputs[0])
            return sc.outputs[0]
        return mix.outputs[1]

    def ramp(self, nt, fac_socket, c1, c2, p1=0.0, p2=1.0):
        cr = nt.nodes.new('ShaderNodeValToRGB')
        cr.color_ramp.elements[0].position = p1
        cr.color_ramp.elements[0].color = c1
        cr.color_ramp.elements[1].position = p2
        cr.color_ramp.elements[1].color = c2
        nt.links.new(fac_socket, cr.inputs[0])
        return cr.outputs[0]

    def bump(self, nt, bsdf, height_socket, strength=0.1, distance=0.01):
        b = nt.nodes.new('ShaderNodeBump')
        b.inputs['Strength'].default_value = strength
        if 'Distance' in b.inputs:
            b.inputs['Distance'].default_value = distance
        nt.links.new(height_socket, b.inputs['Height'])
        nt.links.new(b.outputs['Normal'], bsdf.inputs['Normal'])

    def make_material(self, name, d, shade_emit=None):
        bpy = self.bpy
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes.get('Principled BSDF')
        kind = d.get('kind', 'plain')
        col = hex_rgba(d.get('color', '#999999'))
        col2 = hex_rgba(d['color2']) if d.get('color2') else hex_rgba(d.get('color', '#999999'), 0.7)
        rough = float(d.get('roughness', 0.6))
        bsdf.inputs['Base Color'].default_value = col
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Metallic'].default_value = 0.0
        m.diffuse_color = col
        base = bsdf.inputs['Base Color']
        if kind == 'metal':
            bsdf.inputs['Metallic'].default_value = 1.0
        elif kind == 'mirror':
            bsdf.inputs['Metallic'].default_value = 1.0
            bsdf.inputs['Roughness'].default_value = 0.02
        elif kind in ('glass', 'water'):
            bsdf.inputs['Roughness'].default_value = 0.02
            set_input(bsdf, ['Alpha'], 0.12 if kind == 'glass' else 0.45)
            set_input(bsdf, ['Specular IOR Level', 'Specular'], 0.6)
            self.transparent(m)
        elif kind == 'emission':
            set_input(bsdf, ['Emission Color', 'Emission'], col)
            set_input(bsdf, ['Emission Strength'], float(d.get('strength', 5)))
        elif kind == 'wood':
            v = self.planar_vector(nt)
            mp = nt.nodes.new('ShaderNodeMapping')
            mp.inputs['Scale'].default_value = (1.0, 7.0, 7.0)
            nt.links.new(v, mp.inputs['Vector'])
            wave = nt.nodes.new('ShaderNodeTexWave')
            wave.wave_type = 'BANDS'; wave.bands_direction = 'Y'
            wave.inputs['Scale'].default_value = 2.5
            wave.inputs['Distortion'].default_value = 5.0
            wave.inputs['Detail'].default_value = 3.0
            nt.links.new(mp.outputs[0], wave.inputs['Vector'])
            grain = self.ramp(nt, wave.outputs['Fac'], col2, col, 0.2, 0.8)
            if name.split('.')[0] == 'floor':
                # ألواح باركيه: كل لوح بدرجة مختلفة شوية + فاصل رفيع
                br = nt.nodes.new('ShaderNodeTexBrick')
                br.inputs['Scale'].default_value = 1.0
                br.inputs['Brick Width'].default_value = 1.2
                br.inputs['Row Height'].default_value = 0.19
                br.inputs['Mortar Size'].default_value = 0.003
                br.inputs['Bias'].default_value = 0.0
                br.inputs['Color1'].default_value = (1, 1, 1, 1)
                br.inputs['Color2'].default_value = (0.8, 0.8, 0.8, 1)
                br.inputs['Mortar'].default_value = (0.35, 0.35, 0.35, 1)
                nt.links.new(self.planar_vector(nt), br.inputs['Vector'])
                mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'
                mul.inputs['Factor'].default_value = 1.0
                nt.links.new(grain, mul.inputs[6]); nt.links.new(br.outputs['Color'], mul.inputs[7])
                grain = mul.outputs[2]
                self.bump(nt, bsdf, br.outputs['Fac'], -0.2)
            else:
                self.bump(nt, bsdf, wave.outputs['Fac'], 0.06)
            nt.links.new(grain, base)
        elif kind == 'fabric' or kind == 'rattan':
            noise = nt.nodes.new('ShaderNodeTexNoise')
            noise.inputs['Scale'].default_value = 6.0
            nt.links.new(self.ramp(nt, noise.outputs['Fac'], hex_rgba(d['color'], 0.88), hex_rgba(d['color'], 1.08), 0.3, 0.7), base)
            if kind == 'rattan':
                br = nt.nodes.new('ShaderNodeTexBrick')
                br.inputs['Scale'].default_value = 40.0
                nt.links.new(self.planar_vector(nt), br.inputs['Vector'])
                br.inputs['Color1'].default_value = col; br.inputs['Color2'].default_value = col2
                br.inputs['Mortar'].default_value = hex_rgba(d['color'], 0.4)
                nt.links.new(br.outputs['Color'], base)
                self.bump(nt, bsdf, br.outputs['Fac'], 0.3)
            else:
                fine = nt.nodes.new('ShaderNodeTexNoise')
                fine.inputs['Scale'].default_value = 450.0
                self.bump(nt, bsdf, fine.outputs['Fac'], 0.12)
                set_input(bsdf, ['Sheen Weight', 'Sheen'], 0.4)
            if d.get('alpha') is not None:
                set_input(bsdf, ['Alpha'], float(d['alpha']))
                self.transparent(m)
        elif kind == 'marble':
            noise = nt.nodes.new('ShaderNodeTexNoise')
            noise.inputs['Scale'].default_value = 2.0
            noise.inputs['Detail'].default_value = 8.0
            wave = nt.nodes.new('ShaderNodeTexWave')
            wave.inputs['Scale'].default_value = 1.5
            wave.inputs['Distortion'].default_value = 12.0
            wave.inputs['Detail'].default_value = 6.0
            nt.links.new(noise.outputs['Color'], wave.inputs['Vector'])
            nt.links.new(self.ramp(nt, wave.outputs['Fac'], col2, col, 0.0, 0.12), base)
        elif kind in ('tile', 'brick'):
            br = nt.nodes.new('ShaderNodeTexBrick')
            if kind == 'tile':
                size = float(d.get('scale', 0.3))
                br.inputs['Scale'].default_value = 1.0 / size
                br.inputs['Brick Width'].default_value = 1.0
                br.inputs['Row Height'].default_value = 1.0
                br.offset = 0.0
                br.inputs['Mortar Size'].default_value = 0.012
                br.inputs['Color1'].default_value = col
                br.inputs['Color2'].default_value = hex_rgba(d['color'], 0.92)
            else:
                k = float(d.get('scale', 1.0))
                br.inputs['Scale'].default_value = 1.0
                br.inputs['Brick Width'].default_value = 0.24 * k
                br.inputs['Row Height'].default_value = 0.075 * k
                br.inputs['Mortar Size'].default_value = 0.01 * k
                br.inputs['Color1'].default_value = col
                br.inputs['Color2'].default_value = hex_rgba(d['color'], 0.8)
            br.inputs['Mortar'].default_value = col2
            nt.links.new(self.planar_vector(nt), br.inputs['Vector'])
            nt.links.new(br.outputs['Color'], base)
            self.bump(nt, bsdf, br.outputs['Fac'], -0.25)
        elif kind == 'terrazzo':
            vor = nt.nodes.new('ShaderNodeTexVoronoi')
            vor.inputs['Scale'].default_value = 35.0
            nt.links.new(self.planar_vector(nt), vor.inputs['Vector'])
            nt.links.new(self.ramp(nt, vor.outputs['Distance'], col2, col, 0.18, 0.2), base)
        elif kind in ('concrete', 'plaster'):
            noise = nt.nodes.new('ShaderNodeTexNoise')
            noise.inputs['Scale'].default_value = 3.0 if kind == 'concrete' else 1.5
            noise.inputs['Detail'].default_value = 10.0
            amt = 0.12 if kind == 'concrete' else 0.04
            nt.links.new(self.ramp(nt, noise.outputs['Fac'], hex_rgba(d['color'], 1 - amt), hex_rgba(d['color'], 1 + amt * 0.5), 0.35, 0.65), base)
            fine = nt.nodes.new('ShaderNodeTexNoise')
            fine.inputs['Scale'].default_value = 120.0
            self.bump(nt, bsdf, fine.outputs['Fac'], 0.05 if kind == 'plaster' else 0.15)
        if shade_emit:
            set_input(bsdf, ['Emission Color', 'Emission'], hex_rgba(shade_emit))
            set_input(bsdf, ['Emission Strength'], 2.5)
        return m

    def transparent(self, m):
        if hasattr(m, 'surface_render_method'):
            m.surface_render_method = 'BLENDED'
        if hasattr(m, 'blend_method'):
            try:
                m.blend_method = 'BLEND'
            except Exception:
                pass
        if hasattr(m, 'shadow_method'):
            try:
                m.shadow_method = 'NONE'
            except Exception:
                pass

    def material(self, name, shade_emit=None):
        key = (name, shade_emit)
        if key not in self.mats:
            d = self.scene_data['materials'][name]
            self.mats[key] = self.make_material(name + ('.shade' if shade_emit else ''), d, shade_emit)
        return self.mats[key]

    # ---- الأشكال ----
    def unit_mesh(self, shape):
        if shape in self.unit_meshes:
            return self.unit_meshes[shape]
        import bmesh
        bm = bmesh.new()
        if shape == 'box':
            bmesh.ops.create_cube(bm, size=1.0)
        elif shape == 'cyl':
            bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=40, radius1=0.5, radius2=0.5, depth=1.0)
        elif shape == 'cone':
            bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=40, radius1=0.5, radius2=0.0, depth=1.0)
        elif shape == 'sphere':
            bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=0.5)
        me = self.bpy.data.meshes.new('unit_' + shape)
        bm.to_mesh(me)
        bm.free()
        for poly in me.polygons:
            poly.use_smooth = shape != 'box'
        self.unit_meshes[shape] = me
        return me

    def real_mesh(self, p):
        """شبكة بالحجم الحقيقي (للحواف المدوّرة والحلقات)."""
        import bmesh
        bm = bmesh.new()
        sx, sy, sz = p['s']
        shape = p['shape']
        if shape == 'torus':
            major_r = max(0.001, (sx - sz) / 2.0)
            minor_r = max(0.0005, sz / 2.0)
            seg, ring = 48, 16
            verts = []
            for i in range(seg):
                a = 2 * math.pi * i / seg
                row = []
                for j in range(ring):
                    b = 2 * math.pi * j / ring
                    r = major_r + minor_r * math.cos(b)
                    row.append(bm.verts.new((r * math.cos(a), r * math.sin(a) * (sy / sx if sx else 1), minor_r * math.sin(b))))
                verts.append(row)
            for i in range(seg):
                for j in range(ring):
                    bm.faces.new((verts[i][j], verts[(i + 1) % seg][j], verts[(i + 1) % seg][(j + 1) % ring], verts[i][(j + 1) % ring]))
            smooth = True
        else:
            if shape == 'box':
                bmesh.ops.create_cube(bm, size=1.0)
            elif shape == 'cyl':
                bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=40, radius1=0.5, radius2=0.5, depth=1.0)
            elif shape == 'cone':
                bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=40, radius1=0.5, radius2=0.0, depth=1.0)
            else:
                bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=0.5)
            bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
            smooth = shape != 'box'
        me = self.bpy.data.meshes.new(shape)
        bm.to_mesh(me)
        bm.free()
        for poly in me.polygons:
            poly.use_smooth = smooth
        return me

    def add_part(self, parent, p, idx, col, shade_emit=None, no_shadow=False):
        bpy = self.bpy
        needs_real = p['shape'] == 'torus' or p.get('b')
        me = self.real_mesh(p) if needs_real else self.unit_mesh(p['shape'])
        ob = bpy.data.objects.new('%s.%02d' % (parent.name, idx), me)
        self.link(ob, col)
        ob.parent = parent
        ob.location = p['c']
        if p.get('r'):
            ob.rotation_euler = [math.radians(a) for a in p['r']]
        if not needs_real:
            ob.scale = p['s']
        mat = self.material(p['mat'], shade_emit)
        if needs_real:
            me.materials.append(mat)
        else:
            # الشبكة مشتركة، فالمادة تنحط على الأوبجكت مو على الشبكة
            if len(me.materials) == 0:
                me.materials.append(None)
            ob.material_slots[0].link = 'OBJECT'
            ob.material_slots[0].material = mat
        if p.get('b'):
            mod = ob.modifiers.new('bevel', 'BEVEL')
            mod.width = float(p['b'])
            mod.segments = 3
            mod.limit_method = 'ANGLE'
            if hasattr(mod, 'harden_normals'):
                mod.harden_normals = False
        if no_shadow or p['mat'].split('.')[0] in ('glass', 'water'):
            if hasattr(ob, 'visible_shadow'):
                ob.visible_shadow = False
        return ob

    def build_objects(self):
        bpy = self.bpy
        lamp_from = set(l.get('from') for l in self.scene_data['lighting']['lamps'])
        lamp_color = {}
        for l in self.scene_data['lighting']['lamps']:
            lamp_color.setdefault(l.get('from'), l['color'])
        for o in self.scene_data['objects']:
            col = {'furniture': 'Furniture', 'decor': 'Decor'}.get(o['role'], 'Room')
            root = bpy.data.objects.new(o['id'], None)
            root.empty_display_type = 'PLAIN_AXES'
            root.empty_display_size = 0.15
            self.link(root, col)
            root.location = o['position']
            root.rotation_euler = (0, 0, math.radians(o.get('rotation', 0)))
            root['sky_type'] = o.get('type') or o['role']
            lit = o['id'] in lamp_from
            for i, p in enumerate(o['parts']):
                base = p['mat'].split('.')[0]
                shade = lamp_color.get(o['id']) if lit and base == 'paper' else None
                no_shadow = lit and base in ('paper', 'light', 'glass', 'neon')
                self.add_part(root, p, i, col, shade, no_shadow)

    # ---- الإضاءة ----
    def aim(self, ob, direction):
        from mathutils import Vector
        ob.rotation_euler = Vector(direction).to_track_quat('-Z', 'Y').to_euler()

    def build_lights(self):
        bpy = self.bpy
        L = self.scene_data['lighting']
        world = bpy.data.worlds.new('I/O Studio world')
        world.use_nodes = True
        bg = world.node_tree.nodes.get('Background')
        bg.inputs['Color'].default_value = hex_rgba(L['world']['color'])
        bg.inputs['Strength'].default_value = float(L['world']['strength'])
        self.scn.world = world
        if L.get('sun'):
            s = L['sun']
            ld = bpy.data.lights.new('sun', 'SUN')
            ld.energy = float(s['strength'])
            ld.color = hex_rgba(s['color'])[:3]
            ld.angle = math.radians(s.get('angle', 2.5))
            ob = bpy.data.objects.new('sun', ld)
            self.link(ob, 'Lights')
            R = self.scene_data['room']
            ob.location = (R['width'] / 2, R['depth'] / 2, R['height'] + 3)
            self.aim(ob, s['direction'])
        if L.get('fill'):
            f = L['fill']
            ld = bpy.data.lights.new('ceiling-fill', 'AREA')
            ld.shape = 'RECTANGLE'
            ld.size, ld.size_y = f['size']
            ld.energy = float(f['power'])
            ld.color = hex_rgba(f['color'])[:3]
            ob = bpy.data.objects.new('ceiling-fill', ld)
            self.link(ob, 'Lights')
            ob.location = f['position']
            if hasattr(ob, 'visible_camera'):
                ob.visible_camera = False
        for i, l in enumerate(L['lamps']):
            t = {'point': 'POINT', 'area': 'AREA', 'spot': 'SPOT'}.get(l['type'], 'POINT')
            ld = bpy.data.lights.new('lamp-%d-%s' % (i, l.get('from', '')), t)
            ld.energy = float(l['power'])
            ld.color = hex_rgba(l['color'])[:3]
            if t == 'AREA':
                ld.shape = 'DISK'
                ld.size = float(l.get('size') or 0.3)
            else:
                ld.shadow_soft_size = float(l.get('size') or 0.1)
            ob = bpy.data.objects.new(ld.name, ld)
            self.link(ob, 'Lights')
            ob.location = l['position']
            if l.get('direction'):
                self.aim(ob, l['direction'])
            if hasattr(ob, 'visible_camera'):
                ob.visible_camera = False

    # ---- الكاميرات ----
    def look_at(self, ob, pos, target):
        from mathutils import Vector
        d = Vector(target) - Vector(pos)
        ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

    def build_cameras(self):
        bpy = self.bpy
        C = self.scene_data['cameras']
        for c in C['stills']:
            cd = bpy.data.cameras.new(c['name'])
            cd.lens = float(c['lens'])
            cd.sensor_fit = 'AUTO'
            cd.clip_start = 0.03
            ob = bpy.data.objects.new('cam-' + c['name'], cd)
            self.link(ob, 'Cameras')
            ob.location = c['position']
            self.look_at(ob, c['position'], c['target'])
            self.cams[c['name']] = ob
        wt = C['walkthrough']
        fps = int(wt['fps'])
        cd = bpy.data.cameras.new('walkthrough')
        cd.lens = float(wt['lens'])
        cd.clip_start = 0.03
        cam = bpy.data.objects.new('cam-walkthrough', cd)
        self.link(cam, 'Cameras')
        tgt = bpy.data.objects.new('walkthrough-target', None)
        tgt.empty_display_type = 'SPHERE'
        tgt.empty_display_size = 0.1
        self.link(tgt, 'Cameras')
        con = cam.constraints.new('TRACK_TO')
        con.target = tgt
        con.track_axis = 'TRACK_NEGATIVE_Z'
        con.up_axis = 'UP_Y'
        for k in wt['keys']:
            fr = 1 + int(round(k['t'] * fps))
            cam.location = k['position']
            cam.keyframe_insert('location', frame=fr)
            tgt.location = k['target']
            tgt.keyframe_insert('location', frame=fr)
        # مسار ظاهر بالـ viewport بس
        cu = bpy.data.curves.new('walkthrough-path', 'CURVE')
        cu.dimensions = '3D'
        sp = cu.splines.new('POLY')
        sp.points.add(len(wt['keys']) - 1)
        for i, k in enumerate(wt['keys']):
            sp.points[i].co = (k['position'][0], k['position'][1], k['position'][2], 1.0)
        path_ob = bpy.data.objects.new('walkthrough-path', cu)
        path_ob.hide_render = True
        self.link(path_ob, 'Cameras')
        self.scn.frame_start = 1
        self.scn.frame_end = max(2, int(round(wt['seconds'] * fps)))
        self.scn.render.fps = fps
        self.cams['walkthrough'] = cam
        first = C['stills'][0]['name'] if C['stills'] else 'walkthrough'
        self.scn.camera = self.cams[first]

    # ---- الرندر ----
    def setup_render(self):
        scn = self.scn
        eng = self.engine
        if eng == 'cycles':
            scn.render.engine = 'CYCLES'
            scn.cycles.samples = self.samples
            scn.cycles.device = 'CPU'
            scn.cycles.use_denoising = True
            if hasattr(scn.cycles, 'use_adaptive_sampling'):
                scn.cycles.use_adaptive_sampling = True
            scn.cycles.max_bounces = 6
            scn.cycles.transparent_max_bounces = 8
        else:
            items = [e.identifier for e in scn.render.bl_rna.properties['engine'].enum_items]
            for cand in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
                if cand in items:
                    scn.render.engine = cand
                    break
            ee = scn.eevee
            ee.taa_render_samples = self.samples
            for attr, val in (('use_gtao', True), ('use_soft_shadows', True), ('use_ssr', True), ('use_shadows', True)):
                if hasattr(ee, attr):
                    setattr(ee, attr, val)
        vs = scn.view_settings
        try:
            vs.view_transform = 'AgX'
        except TypeError:
            vs.view_transform = 'Filmic'
        try:
            vs.look = 'AgX - Medium High Contrast' if vs.view_transform == 'AgX' else 'Medium High Contrast'
        except TypeError:
            pass
        vs.exposure = -0.3
        scn.render.image_settings.file_format = 'PNG'
        scn.render.image_settings.color_mode = 'RGB'
        scn.render.film_transparent = False

    def build(self):
        self.reset()
        self.build_objects()
        self.build_lights()
        self.build_cameras()
        self.setup_render()
        R = self.scene_data['room']
        log('built %s: %d objects, %d materials' % (self.scene_data['name'], len(self.bpy.data.objects), len(self.bpy.data.materials)))
        log('room %.2fx%.2fx%.2f style=%s variant=%s' % (R['width'], R['depth'], R['height'], self.scene_data.get('style'), self.scene_data.get('variant')))
        return self


FORMATS = {'9:16': (1080, 1920), '16:9': (1920, 1080), '3:4': (1080, 1440)}


def apply_format(scn, fmt, scale=100):
    w, h = FORMATS.get(fmt or '9:16', FORMATS['9:16'])
    scn.render.resolution_x = w
    scn.render.resolution_y = h
    scn.render.resolution_percentage = int(scale)


def save_blend(path):
    import bpy
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(path))
    log('saved ' + os.path.abspath(path))


def main():
    args = parse_args()
    scene = load_scene(args.scene, args.room, args.format, args.variant)
    if args.dry_run:
        sys.exit(dry_run(scene))
    try:
        import bpy  # noqa
    except ImportError:
        print('IO ERROR: هذا السكربت يشتغل داخل Blender: blender -b -P build_room.py -- --room room.json  (أو استخدم --dry-run)')
        sys.exit(2)
    b = Builder(scene, args.engine, args.samples).build()
    apply_format(b.scn, args.format or scene.get('format'))
    if args.blend:
        save_blend(args.blend)


if __name__ == '__main__':
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:  # يطلع سطر واضح لـ Node
        import traceback
        traceback.print_exc()
        print('IO ERROR: %s' % e)
        sys.exit(1)
