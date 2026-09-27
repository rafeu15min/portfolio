# Converte um STL em GLB pronto pra web (rodado pelo build-models.ts):
#   blender -b -P stl2glb.py -- entrada.stl saida.glb <frente: -y|+y|-x|+x|+z> <triângulos> [regra-dourada]
#   (+z = relevo deitado na mesa de impressão, frente para cima, topo da peça em +Y)
# Gira a peça pra frente ficar em -Y (vira +Z no glTF), apoia a base em z=0,
# centraliza, normaliza a altura para 1.0, funde vértices duplicados do STL,
# reduz a malha e exporta com normais suaves. Materiais só como rótulo
# ("ivory"/"gold"): a cor de verdade é aplicada na cena.
#
# regra-dourada: expressão em x, z (coordenadas ORIGINAIS do STL, antes de
# girar) e i (índice do triângulo no arquivo) que marca as faces douradas —
# ex.: raios atrás das figuras, ou uma peça inteira de um STL combinado.
import bpy, sys, math, mathutils

args = sys.argv[sys.argv.index("--") + 1:]
src, dst, front, target = args[0], args[1], args[2], int(args[3])
gold_rule = args[4] if len(args) > 4 and args[4] else None

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.stl_import(filepath=src)
obj = bpy.context.selected_objects[0]
bpy.context.view_layer.objects.active = obj

# rótulos de material; a regra roda nas coordenadas originais, antes de girar
for name in ("ivory", "gold") if gold_rule else ("ivory",):
    obj.data.materials.append(bpy.data.materials.new(name))
gold_faces = 0
if gold_rule:
    rule = compile(gold_rule, "regra-dourada", "eval")
    for p in obj.data.polygons:
        x, z = p.center.x, p.center.z
        if eval(rule, {}, {"x": x, "z": z, "i": p.index}):
            p.material_index = 1
            gold_faces += 1

# frente → -Y
if front == "+z":
    # relevo deitado: gira em X para a frente (+Z) virar -Y e o topo (+Y) virar +Z
    obj.rotation_euler = (math.pi / 2, 0, 0)
else:
    obj.rotation_euler = (0, 0, {"-y": 0, "+y": math.pi, "+x": -math.pi / 2, "-x": math.pi / 2}[front])
bpy.ops.object.transform_apply(rotation=True)

# STL guarda cada triângulo solto: funde antes de reduzir
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.remove_doubles(threshold=1e-6 * max(obj.dimensions))
bpy.ops.object.mode_set(mode="OBJECT")

before = len(obj.data.polygons)
if before > target:
    mod = obj.modifiers.new("decimate", "DECIMATE")
    mod.ratio = target / before
    bpy.ops.object.modifier_apply(modifier=mod.name)

# base em z=0, centro em x=y=0, altura 1.0
bb = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
lo = mathutils.Vector([min(v[i] for v in bb) for i in range(3)])
hi = mathutils.Vector([max(v[i] for v in bb) for i in range(3)])
obj.location -= mathutils.Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
bpy.ops.object.transform_apply(location=True)
s = 1.0 / (hi.z - lo.z)
obj.scale = (s, s, s)
bpy.ops.object.transform_apply(scale=True)

# suave nas curvas, vinco nas quinas (base, bordas dos raios)
bpy.ops.object.shade_auto_smooth(angle=math.radians(40))

bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=True,
                          export_normals=True, export_materials="EXPORT", export_apply=True)
parts = len(obj.data.polygons)
gold = f", {gold_faces * 100 // max(before, 1)}% dourado" if gold_rule else ""
print(f"STL2GLB {src} -> {dst}: {before} -> {parts} triângulos{gold}")
