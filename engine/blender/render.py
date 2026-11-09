#!/usr/bin/env python3
# I/O Studio — رندر لقطات الغرفة (PNG) أو فيديو الجولة (MP4) بالمقاس المطلوب.
#   blender -b -P engine/blender/render.py -- --scene scene.json --format 9:16 --out renders/ [--shots wide,detail]
#   blender -b -P engine/blender/render.py -- --room room.json --format 16:9 --animation --out renders/
# المقاسات: 9:16 = 1080×1920 (ريلز/شورتس/تيك توك) · 16:9 = 1920×1080 (يوتيوب) · 3:4 = 1080×1440 (كاروسيل)
# --engine eevee (أسرع، يحتاج OpenGL) أو cycles (يشتغل على أي جهاز) · --samples · --scale 50 (نص الدقة للتجربة)
import argparse
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_room as B  # noqa: E402


def parse(argv=None):
    argv = sys.argv if argv is None else argv
    argv = argv[argv.index('--') + 1:] if '--' in argv else argv[1:]
    p = argparse.ArgumentParser()
    p.add_argument('--scene')
    p.add_argument('--room')
    p.add_argument('--format', default='9:16')
    p.add_argument('--out', default='renders')
    p.add_argument('--engine', default='eevee')
    p.add_argument('--samples', type=int, default=32)
    p.add_argument('--scale', type=int, default=100)
    p.add_argument('--shots', default='')
    p.add_argument('--animation', action='store_true')
    p.add_argument('--frames', type=int, default=0, help='limit animation frames (testing)')
    p.add_argument('--blend', help='also save the built .blend')
    return p.parse_args(argv)


def render_stills(b, out, shots, prefix=''):
    import bpy
    scn = b.scn
    names = [s for s in shots.split(',') if s] if shots else [c['name'] for c in b.scene_data['cameras']['stills']]
    files = []
    for n in names:
        cam = b.cams.get(n)
        if cam is None:
            B.log('ERROR unknown shot "%s" (available: %s)' % (n, ', '.join(k for k in b.cams if k != 'walkthrough')))
            sys.exit(1)
        scn.camera = cam
        scn.render.image_settings.file_format = 'PNG'
        path = os.path.join(out, '%s%s.png' % (prefix, n))
        scn.render.filepath = path
        bpy.ops.render.render(write_still=True)
        B.log('rendered ' + path)
        files.append(path)
    return files


def render_animation(b, out, frames=0):
    import bpy
    scn = b.scn
    scn.camera = b.cams['walkthrough']
    if frames:
        scn.frame_end = min(scn.frame_end, scn.frame_start + frames - 1)
    st = scn.render.image_settings
    st.file_format = 'FFMPEG'
    ff = scn.render.ffmpeg
    ff.format = 'MPEG4'
    ff.codec = 'H264'
    ff.constant_rate_factor = 'HIGH'
    ff.ffmpeg_preset = 'GOOD'
    ff.audio_codec = 'NONE'
    base = os.path.join(out, 'walkthrough_')
    scn.render.filepath = base
    for old in glob.glob(base + '*.mp4'):
        os.remove(old)
    bpy.ops.render.render(animation=True)
    made = sorted(glob.glob(base + '*.mp4'))
    final = os.path.join(out, 'walkthrough.mp4')
    if made:
        os.replace(made[-1], final)
        B.log('rendered ' + final)
    else:
        B.log('ERROR no video written')
        sys.exit(1)
    return final


def main():
    a = parse()
    os.makedirs(a.out, exist_ok=True)
    scene = B.load_scene(a.scene, a.room, a.format)
    b = B.Builder(scene, a.engine, a.samples).build()
    B.apply_format(b.scn, a.format, a.scale)
    if a.blend:
        B.save_blend(a.blend)
    B.log('engine=%s samples=%d format=%s scale=%d%%' % (b.scn.render.engine, a.samples, a.format, a.scale))
    if a.animation:
        render_animation(b, a.out, a.frames)
    else:
        render_stills(b, a.out, a.shots)


if __name__ == '__main__':
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print('IO ERROR: %s' % e)
        sys.exit(1)
