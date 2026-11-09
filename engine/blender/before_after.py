#!/usr/bin/env python3
# I/O Studio — «قبل وبعد» للريلز: نفس الغرفة ونفس الكاميرا مرتين:
#   قبل = غرفة فاضية/قديمة (جدران رمادية، أرضية بلاط عادي، بس القطع المعلّمة before:true)
#   بعد = الغرفة بالستايل الكامل
# ويطلع: before.png و after.png و before_after.mp4 (انتقال مسح wipe من اليسار لليمين).
#   blender -b -P engine/blender/before_after.py -- --before scene-before.json --after scene-after.json --format 9:16 --out out/
# أو مباشرة من room.json:
#   blender -b -P engine/blender/before_after.py -- --room room.json --format 9:16 --out out/
import argparse
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_room as B  # noqa: E402
import render as RD  # noqa: E402


def parse(argv=None):
    argv = sys.argv if argv is None else argv
    argv = argv[argv.index('--') + 1:] if '--' in argv else argv[1:]
    p = argparse.ArgumentParser()
    p.add_argument('--before')
    p.add_argument('--after')
    p.add_argument('--room')
    p.add_argument('--format', default='9:16')
    p.add_argument('--out', default='before-after')
    p.add_argument('--shot', default='')
    p.add_argument('--engine', default='eevee')
    p.add_argument('--samples', type=int, default=32)
    p.add_argument('--scale', type=int, default=100)
    p.add_argument('--seconds', type=float, default=5.0)
    p.add_argument('--no-video', action='store_true')
    return p.parse_args(argv)


def still(scene, a, name):
    b = B.Builder(scene, a.engine, a.samples).build()
    B.apply_format(b.scn, a.format, a.scale)
    shot = a.shot or scene['cameras']['stills'][0]['name']
    files = RD.render_stills(b, a.out, shot, prefix='tmp_')
    final = os.path.join(a.out, name + '.png')
    os.replace(files[0], final)
    B.log('rendered ' + final)
    return final


def wipe_video(before_png, after_png, a):
    """فيديو: ثانية «قبل» ← مسح ← «بعد». بمحرر الفيديو الداخلي لـ Blender، بدون ffmpeg خارجي."""
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    fps = 30
    total = max(3, int(round(a.seconds * fps)))
    hold = int(total * 0.3)
    wipe = int(total * 0.3)
    B.apply_format(scn, a.format, a.scale)
    scn.render.fps = fps
    scn.frame_start = 1
    scn.frame_end = total
    se = scn.sequence_editor_create()
    strips = getattr(se, 'strips', None) or se.sequences
    s1 = strips.new_image('before', before_png, channel=1, frame_start=1)
    s1.frame_final_duration = hold + wipe
    s2 = strips.new_image('after', after_png, channel=2, frame_start=1 + hold)
    s2.frame_final_duration = total - hold
    fx = strips.new_effect('wipe', 'WIPE', channel=3, frame_start=1 + hold, frame_end=1 + hold + wipe, seq1=s1, seq2=s2)
    fx.transition_type = 'SINGLE'
    fx.direction = 'IN'
    fx.angle = 0.0
    fx.blur_width = 0.03
    st = scn.render.image_settings
    st.file_format = 'FFMPEG'
    ff = scn.render.ffmpeg
    ff.format = 'MPEG4'
    ff.codec = 'H264'
    ff.constant_rate_factor = 'HIGH'
    ff.audio_codec = 'NONE'
    base = os.path.join(a.out, 'before_after_')
    for old in glob.glob(base + '*.mp4'):
        os.remove(old)
    scn.render.filepath = base
    scn.render.use_sequencer = True
    bpy.ops.render.render(animation=True)
    made = sorted(glob.glob(base + '*.mp4'))
    final = os.path.join(a.out, 'before_after.mp4')
    if not made:
        B.log('ERROR no before/after video written')
        sys.exit(1)
    os.replace(made[-1], final)
    B.log('rendered ' + final)
    return final


def main():
    a = parse()
    os.makedirs(a.out, exist_ok=True)
    before = B.load_scene(a.before, a.room, a.format, 'before')
    after = B.load_scene(a.after, a.room, a.format, None)
    bp = still(before, a, 'before')
    ap = still(after, a, 'after')
    if not a.no_video:
        wipe_video(os.path.abspath(bp), os.path.abspath(ap), a)


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
