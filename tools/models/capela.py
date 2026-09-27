# Capela do Rafeu — nicho gótico gerado por código (Blender, sem janela):
#   blender -b -P capela.py -- saida.glb
#
# Modelo ORIGINAL, sem geometria de terceiros. Inspirado em arquitetura
# gótica: nicho em arco ogival com colunas e pináculos, arcos em camadas,
# frontão com cruz e um vitral (duas lancetas + quadrifólio) no fundo.
#
# Medidas em "unidades de desenho" (altura total 250) escolhidas para bater
# com as constantes de chapel.ts: piso do nicho 22 (0.088), meia-largura do
# vão 38 (0.152), recuo frente→fundo do nicho 64 (+1 do friso: 0.26), profundidade 72
# (+1: 0.292). No fim tudo é normalizado: altura 1, base em z=0, centrado.
#
# Frente = -Y (vira +Z no glTF). Materiais são só rótulos — a cor vem da cena:
#   stone · gold · tile-a · tile-b (piso em xadrez) · glass-window (vitral, com UV — o mosaico é uma textura
#   gerada na cena) · front-ruby · front-gold (vidro do frontão, sem brilho)

import bpy, bmesh, math, sys
from mathutils import Matrix, Vector

OUT = sys.argv[sys.argv.index("--") + 1:][0]

H = 250.0           # altura total (topo da cruz)
FLOOR = 22.0        # piso do nicho
NICHE_HW = 38.0     # meia-largura do vão
# o resto da largura segue o vão: paredes laterais de 30 unidades
OUTER = NICHE_HW + 30   # meia-largura da moldura
GABLE = NICHE_HW + 16   # base do frontão / face interna dos contrafortes
SPRING = 125.0      # início do arco
RISE = 55.0         # altura do arco (ápice em 180)
FRONT_Y = 4.0       # face da moldura
BACK_Y = 64.0       # fundo do nicho (fundo o bastante para uma fileira atrás do altar)
DEPTH = 72.0        # profundidade total

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
MATS = {}
parts = []


def mat(name):
    if name not in MATS:
        MATS[name] = bpy.data.materials.new(name)
    return MATS[name]


def finish(bm, name, material):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    o.data.materials.append(mat(material))
    parts.append(o)
    return o


def box(name, x0, x1, y0, y1, z0, z1, material="stone"):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector((x0 if v.co.x < 0 else x1, y0 if v.co.y < 0 else y1, z0 if v.co.z < 0 else z1))
    return finish(bm, name, material)


def mirror_box(name, x0, x1, *rest, material="stone"):
    box(name + "_e", -x1, -x0, *rest, material=material)
    box(name + "_d", x0, x1, *rest, material=material)


def prism(name, outline_xz, y0, y1, material="stone"):
    """Contorno no plano XZ extrudado de y0 a y1."""
    bm = bmesh.new()
    face = bm.faces.new([bm.verts.new((x, y0, z)) for x, z in outline_xz])
    res = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, y1 - y0, 0), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(bm, name, material)


# janela do fundo do nicho: retângulo que o mosaico (textura) cobre por inteiro
WIN = (-32.0, 32.0, 96.0, 177.0)  # x0, x1, z0, z1


def pane(name, outline_xz, y, material, uv=False):
    """Vidro: uma face plana virada para a frente (-Y). Com uv=True, recebe
    coordenadas de textura projetadas de frente sobre a janela (WIN)."""
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new((x, y, z)) for x, z in outline_xz])
    bm.normal_update()
    if f.normal.y > 0:
        f.normal_flip()
    if uv:
        layer = bm.loops.layers.uv.new("UVMap")
        x0, x1, z0, z1 = WIN
        for loop in f.loops:
            co = loop.vert.co
            loop[layer].uv = ((co.x - x0) / (x1 - x0), (co.z - z0) / (z1 - z0))
    return finish(bm, name, material)


def molding(name, points_xz, y, radius, material="stone", closed=False):
    """Moldura arredondada no plano XZ (em y fixo)."""
    return molding3d(name, [(x, y, z) for x, z in points_xz], radius, material, closed)


def molding3d(name, points, radius, material="stone", closed=False):
    """Moldura arredondada: curva com bevel, convertida em malha no fim."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 2
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for p, (x, y, z) in zip(sp.points, points):
        p.co = (x, y, z, 1)
    sp.use_cyclic_u = closed
    o = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(o)
    o.data.materials.append(mat(material))
    parts.append(o)
    return o


def cylinder(name, x, y, z0, z1, r, material="stone", seg=16):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=z1 - z0)
    bmesh.ops.translate(bm, vec=(x, y, (z0 + z1) / 2), verts=bm.verts)
    return finish(bm, name, material)


def pyramid(name, x, y, z0, z1, half, material="stone"):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=half * math.sqrt(2), radius2=0, depth=z1 - z0)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, "Z"), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(x, y, (z0 + z1) / 2), verts=bm.verts)
    return finish(bm, name, material)


def sphere(name, x, y, z, r, material="stone"):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=r)
    bmesh.ops.translate(bm, vec=(x, y, z), verts=bm.verts)
    return finish(bm, name, material)


def arch(hw, spring, rise, n=28):
    """Arco ogival de (-hw, spring) ao ápice e a (hw, spring). Cada lado é um
    arco de círculo centrado na linha de nascença, do lado oposto."""
    r = (rise * rise + hw * hw) / (2 * hw)
    c = r - hw
    a0, a1 = math.pi, math.atan2(rise, -c)
    left = [(c + r * math.cos(a0 + (a1 - a0) * i / n), spring + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
    right = [(-x, z) for x, z in reversed(left)]
    return left + right[1:]


def opening(hw, floor, spring, rise, n=28):
    return [(-hw, floor)] + arch(hw, spring, rise, n) + [(hw, floor)]


def quatrefoil(cx, cz, d, a, n=72):
    """Quadrifólio: união de 4 círculos (raio a) a distância d do centro."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        r = max(d * math.cos(t - k * math.pi / 2) + math.sqrt(max(a * a - (d * math.sin(t - k * math.pi / 2)) ** 2, 0)) for k in range(4))
        pts.append((cx + r * math.cos(t), cz + r * math.sin(t)))
    return pts


def circle(cx, cz, r, n=32):
    return [(cx + r * math.cos(2 * math.pi * i / n), cz + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


def cut(target, cutter):
    mod = target.modifiers.new("corte", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    parts.remove(cutter)
    bpy.data.objects.remove(cutter, do_unlink=True)


# ---------------------------------------------------------------- base
box("pedestal", -(OUTER + 4), OUTER + 4, 0, DEPTH, 0, 12)
box("pedestal_friso", -(OUTER + 5), OUTER + 5, -1, DEPTH, 10, 12)          # friso saliente
box("degrau", -(OUTER + 2), OUTER + 2, 2, DEPTH, 12, FLOOR)                 # piso do nicho no topo

# ------------------------------------------------ moldura com frontão
frame = prism("moldura", [(-OUTER, FLOOR), (-OUTER, 150), (-GABLE, 150), (0, 228), (GABLE, 150), (OUTER, 150), (OUTER, FLOOR)], FRONT_Y, DEPTH)
cut(frame, prism("vao", opening(NICHE_HW, FLOOR - 1, SPRING, RISE), FRONT_Y - 1, BACK_Y))
# nicho do quadrifólio no frontão (vidro recuado)
GABLE_Q = (0, 204)
cut(frame, prism("vao_q", quatrefoil(*GABLE_Q, 4.2, 5.4), FRONT_Y - 1, FRONT_Y + 3))
pane("vidro_frontao", quatrefoil(*GABLE_Q, 4.2, 5.4), FRONT_Y + 2.9, "front-ruby")
pane("vidro_frontao_centro", circle(*GABLE_Q, 3.6), FRONT_Y + 2.8, "front-gold")
molding("friso_q", quatrefoil(*GABLE_Q, 4.2, 5.4), FRONT_Y - 0.4, 1.0, closed=True)

# arestas do frontão, com florões (crockets) ao longo delas
molding("frontao_esq", [(-(GABLE + 2), 149), (0, 229.5)], FRONT_Y - 0.6, 2.2)
molding("frontao_dir", [(0, 229.5), (GABLE + 2, 149)], FRONT_Y - 0.6, 2.2)
for i in range(1, 6):
    t = i / 6
    for s in (-1, 1):
        sphere(f"florao_{s}_{i}", s * (GABLE + 2) * (1 - t), FRONT_Y - 1.2, 149 + (229.5 - 149) * t + 2.4, 1.9)

# cruz dourada no topo (228 → 250)
box("cruz_haste", -1.9, 1.9, FRONT_Y - 1.5, FRONT_Y + 3.5, 228, H, material="gold")
box("cruz_braco", -7, 7, FRONT_Y - 1.5, FRONT_Y + 3.5, 239.5, 243.3, material="gold")

# ------------------------------------------ arcos em camadas no vão
molding("arco_1", opening(NICHE_HW + 1.8, FLOOR, SPRING, RISE + 1.8), FRONT_Y - 0.8, 1.9)
molding("arco_2", arch(NICHE_HW + 7.0, SPRING, RISE + 7.0), FRONT_Y - 1.8, 2.4)
molding("arco_3", arch(NICHE_HW + 12.5, SPRING, RISE + 12.5), FRONT_Y - 2.6, 2.1)

# ------------------------------------------- colunetas e capitéis
for s in (-1, 1):
    x = s * (NICHE_HW + 4.5)
    cylinder(f"coluneta_{s}", x, FRONT_Y + 1.5, FLOOR, SPRING - 3, 2.6)
    box(f"capitel_{s}", x - 5, x + 5, FRONT_Y - 3, FRONT_Y + 6, SPRING - 4, SPRING + 1)
    box(f"base_col_{s}", x - 4, x + 4, FRONT_Y - 2, FRONT_Y + 5, FLOOR, FLOOR + 4)

# --------------------------------- contrafortes com pináculos
for s in (-1, 1):
    x0, x1 = (GABLE, OUTER + 1) if s > 0 else (-(OUTER + 1), -GABLE)
    box(f"contraforte_{s}", x0, x1, 0, 14, 12, 150)
    box(f"contraforte_topo_{s}", x0 - 1, x1 + 1, -1, 15, 147, 151)
    cx = (x0 + x1) / 2
    box(f"pinaculo_fuste_{s}", cx - 5, cx + 5, 2, 12, 151, 172)
    box(f"pinaculo_cornija_{s}", cx - 6.5, cx + 6.5, 0.5, 13.5, 170, 173)
    pyramid(f"pinaculo_agulha_{s}", cx, 7, 173, 207, 6)
    for i, z in enumerate((180, 188, 196)):
        k = (207 - z) / 34 * 6
        for dx, dy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            sphere(f"florao_p_{s}_{i}_{dx}{dy}", cx + dx * k * 0.95, 7 + dy * k * 0.95, z, 1.3)
    sphere(f"pinaculo_remate_{s}", cx, 7, 209.5, 2.4, material="gold")

# -------------------------------------- paredes internas do nicho
# arcada cega (três arcos ogivais em relevo com colunetas), uma cornija e
# uma fileira de quadrifólios, nas duas paredes laterais (plano YZ)
ARC_Y0, ARC_Y1 = FRONT_Y + 8, BACK_Y - 3
bays = 3
bay = (ARC_Y1 - ARC_Y0) / bays
for s in (-1, 1):
    wx = s * NICHE_HW                    # superfície da parede
    rx = wx - s * 0.8                    # relevo, um pouco para dentro do nicho
    for k in range(bays):
        yc = ARC_Y0 + bay * (k + 0.5)
        pts = [(yc + u, z) for u, z in opening(bay / 2 - 1.6, FLOOR + 4, 68, 12)]
        molding3d(f"arcada_{s}_{k}", [(rx, y, z) for y, z in pts], 0.9, closed=True)
        # trifólio no alto de cada arco
        molding3d(f"arcada_trevo_{s}_{k}", [(rx, yc + u, z) for u, z in quatrefoil(0, 74.5, 1.6, 2.1, 48)], 0.55, closed=True)
    for k in range(bays + 1):
        y = ARC_Y0 + bay * k
        cylinder(f"arcada_col_{s}_{k}", wx - s * 1.3, y, FLOOR, 69, 1.1)
        box(f"arcada_cap_{s}_{k}", min(wx, wx - s * 3), max(wx, wx - s * 3), y - 1.8, y + 1.8, 68, 70.5)
    # cornija ao longo da parede
    molding3d(f"cornija_{s}", [(wx - s * 1.0, FRONT_Y + 1, 82), (wx - s * 1.0, BACK_Y, 82)], 1.5)
    molding3d(f"cornija_b_{s}", [(wx - s * 0.6, FRONT_Y + 1, 79), (wx - s * 0.6, BACK_Y, 79)], 0.8)
    # quadrifólios em relevo acima da cornija
    for k in range(bays):
        yc = ARC_Y0 + bay * (k + 0.5)
        molding3d(f"parede_q_{s}_{k}", [(rx, yc + u, z) for u, z in quatrefoil(0, 100, 3.6, 4.6, 64)], 0.8, closed=True)
        molding3d(f"parede_qc_{s}_{k}", [(rx, yc + u, z) for u, z in circle(0, 100, 2.0, 28)], 0.6, closed=True)

# ------------------------------------ abóbada nervurada do nicho
# nervuras transversais sobre as colunetas da arcada, nervura de cumeeira e
# florões dourados nos cruzamentos; colunelos sobem da cornija até a nascença
for k in range(bays + 1):
    y = ARC_Y0 + bay * k
    rib = arch(NICHE_HW - 1.4, SPRING, RISE - 1.4, 40)
    molding3d(f"nervura_{k}", [(x, y, z) for x, z in rib], 1.4)
    sphere(f"florao_abobada_{k}", 0, y, SPRING + RISE - 2.6, 2.3, material="gold")
    for s in (-1, 1):
        cylinder(f"colunelo_{s}_{k}", s * (NICHE_HW - 1.4), y, 83, SPRING, 0.9)
        box(f"colunelo_cap_{s}_{k}", min(s * NICHE_HW, s * (NICHE_HW - 3.2)), max(s * NICHE_HW, s * (NICHE_HW - 3.2)), y - 1.6, y + 1.6, SPRING - 1.5, SPRING + 1)
molding3d("cumeeira", [(0, FRONT_Y + 2, SPRING + RISE - 2.4), (0, BACK_Y, SPRING + RISE - 2.4)], 1.1)

# ------------------------------------------------ piso em xadrez
TILE = (2 * NICHE_HW) / 12
rows = int((BACK_Y - FRONT_Y) // TILE)
for i in range(12):
    for j in range(rows):
        x0 = -NICHE_HW + i * TILE
        y0 = FRONT_Y + j * TILE
        box(f"ladrilho_{i}_{j}", x0 + 0.15, x0 + TILE - 0.15, y0 + 0.15, y0 + TILE - 0.15, FLOOR, FLOOR + 0.25,
            material="tile-a" if (i + j) % 2 else "tile-b")

# ------------------------------------------------ fundo do nicho
# friso logo abaixo do vitral
molding3d("friso_fundo", [(-NICHE_HW, BACK_Y - 0.9, 92), (NICHE_HW, BACK_Y - 0.9, 92)], 1.2)
# lambris na parte de baixo (atrás das imagens)
inner = NICHE_HW - 4
for i, (a, b) in enumerate(((-inner, -inner / 3 - 1.5), (-inner / 3 + 1.5, inner / 3 - 1.5), (inner / 3 + 1.5, inner))):
    box(f"lambri_{i}", a, b, BACK_Y - 1.0, BACK_Y, 30, 88)

# vitral: duas lancetas + quadrifólio. O vidro é uma peça só por abertura;
# o mosaico (medalhões, chumbo, cores) vem de uma textura gerada na cena.
GLASS_Y = BACK_Y - 0.2
for cx in (-18.5, 18.5):
    outline = [(cx + x, z) for x, z in opening(13.5, 96, 128, 22)]
    pane(f"lanceta_{cx}", outline, GLASS_Y, "glass-window", uv=True)
    molding(f"tracaria_{cx}", outline, GLASS_Y - 0.9, 1.3, closed=True)

QF = (0, 163.5)
pane("rosacea", quatrefoil(*QF, 6.0, 7.2), GLASS_Y, "glass-window", uv=True)
molding("tracaria_rosacea", quatrefoil(*QF, 6.0, 7.2), GLASS_Y - 0.9, 1.3, closed=True)

# ------------------------------------------ juntar, normalizar, exportar
for o in bpy.data.objects:
    o.select_set(o.type == "CURVE")
if any(o.type == "CURVE" for o in bpy.data.objects):
    bpy.context.view_layer.objects.active = next(o for o in bpy.data.objects if o.type == "CURVE")
    bpy.ops.object.convert(target="MESH")

for o in bpy.data.objects:
    o.select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects[0]
bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active

# materiais repetidos: cada peça trouxe seus slots. Aponta cada face para a
# PRIMEIRA ocorrência do material (limpar a lista zeraria os índices de todas
# as faces); os slots que sobram ficam sem uso e o pipeline os descarta.
me = obj.data
first = {}
for i, m in enumerate(me.materials):
    first.setdefault(m.name, i)
for p in me.polygons:
    p.material_index = first[me.materials[p.material_index].name]
uniq = sorted(first)

bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.remove_doubles(threshold=0.01)
bpy.ops.object.mode_set(mode="OBJECT")

# altura 1, base em z=0, centrado em x e em y (profundidade)
s = 1.0 / H
obj.scale = (s, s, s)
obj.location = (0, -DEPTH / 2 * s, 0)
bpy.ops.object.transform_apply(location=True, scale=True)
bpy.ops.object.shade_auto_smooth(angle=math.radians(35))

bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=False,
                          export_normals=True, export_materials="EXPORT", export_apply=True)
bb = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
dims = [max(v[i] for v in bb) - min(v[i] for v in bb) for i in range(3)]
print(f"GERADO capela: {len(obj.data.polygons)} faces, materiais {uniq}, dimensões {tuple(round(d, 3) for d in dims)}")
