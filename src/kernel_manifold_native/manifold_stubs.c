/* Liaison minimale de la C API de Manifold (manifoldc.h) pour camlcad.
   Les objets Manifold vivent dans des blocs custom OCaml libérés par le GC. */
#include <string.h>
#include <caml/mlvalues.h>
#include <caml/memory.h>
#include <caml/alloc.h>
#include <caml/custom.h>
#include <caml/fail.h>
#ifndef CAMLCAD_NO_MANIFOLD
#include <manifold/manifoldc.h>

#define M_val(v) (*((ManifoldManifold **)Data_custom_val(v)))
#define CS_val(v) (*((ManifoldCrossSection **)Data_custom_val(v)))

static void m_finalize(value v) { manifold_delete_manifold(M_val(v)); }
static void cs_finalize(value v) { manifold_delete_cross_section(CS_val(v)); }

static struct custom_operations m_ops = {
  "camlcad.manifold", m_finalize, custom_compare_default, custom_hash_default,
  custom_serialize_default, custom_deserialize_default, custom_compare_ext_default, NULL};
static struct custom_operations cs_ops = {
  "camlcad.cross_section", cs_finalize, custom_compare_default, custom_hash_default,
  custom_serialize_default, custom_deserialize_default, custom_compare_ext_default, NULL};

static value wrap_m(ManifoldManifold *m) {
  value v = caml_alloc_custom_mem(&m_ops, sizeof(ManifoldManifold *), manifold_manifold_size());
  M_val(v) = m;
  return v;
}
static value wrap_cs(ManifoldCrossSection *cs) {
  value v = caml_alloc_custom_mem(&cs_ops, sizeof(ManifoldCrossSection *), manifold_cross_section_size());
  CS_val(v) = cs;
  return v;
}

/* Sections : contours = tableau de float array [x0; y0; x1; y1; ...]. */
CAMLprim value cc_cs_of_contours(value contours) {
  CAMLparam1(contours);
  mlsize_t n = Wosize_val(contours);
  ManifoldSimplePolygon **ps = malloc(sizeof(*ps) * (n ? n : 1));
  for (mlsize_t i = 0; i < n; i++) {
    value c = Field(contours, i);
    mlsize_t k = Wosize_val(c) / Double_wosize / 2;
    ManifoldVec2 *pts = malloc(sizeof(ManifoldVec2) * (k ? k : 1));
    for (mlsize_t j = 0; j < k; j++) {
      pts[j].x = Double_flat_field(c, 2 * j);
      pts[j].y = Double_flat_field(c, 2 * j + 1);
    }
    ps[i] = manifold_simple_polygon(manifold_alloc_simple_polygon(), pts, k);
    free(pts);
  }
  ManifoldPolygons *polys = manifold_polygons(manifold_alloc_polygons(), ps, n);
  ManifoldCrossSection *cs =
      manifold_cross_section_of_polygons(manifold_alloc_cross_section(), polys, MANIFOLD_FILL_RULE_POSITIVE);
  for (mlsize_t i = 0; i < n; i++) manifold_delete_simple_polygon(ps[i]);
  free(ps);
  manifold_delete_polygons(polys);
  CAMLreturn(wrap_cs(cs));
}

#define CS_BINOP(name, fn)                                                            \
  CAMLprim value name(value a, value b) {                                             \
    return wrap_cs(fn(manifold_alloc_cross_section(), CS_val(a), CS_val(b)));          \
  }
CS_BINOP(cc_cs_union, manifold_cross_section_union)
CS_BINOP(cc_cs_difference, manifold_cross_section_difference)
CS_BINOP(cc_cs_intersection, manifold_cross_section_intersection)

CAMLprim value cc_cs_offset(value cs, value delta) {
  return wrap_cs(manifold_cross_section_offset(manifold_alloc_cross_section(), CS_val(cs), Double_val(delta),
                                               MANIFOLD_JOIN_TYPE_ROUND, 2.0, 0));
}
CAMLprim value cc_cs_area(value cs) { return caml_copy_double(manifold_cross_section_area(CS_val(cs))); }

/* Solides */
CAMLprim value cc_cube(value x, value y, value z) {
  return wrap_m(manifold_cube(manifold_alloc_manifold(), Double_val(x), Double_val(y), Double_val(z), 0));
}
CAMLprim value cc_cylinder(value h, value r, value seg) {
  return wrap_m(manifold_cylinder(manifold_alloc_manifold(), Double_val(h), Double_val(r), Double_val(r),
                                  Int_val(seg), 0));
}
CAMLprim value cc_sphere(value r, value seg) {
  return wrap_m(manifold_sphere(manifold_alloc_manifold(), Double_val(r), Int_val(seg)));
}
CAMLprim value cc_extrude(value cs, value h, value div, value twist, value scale) {
  ManifoldPolygons *p = manifold_cross_section_to_polygons(manifold_alloc_polygons(), CS_val(cs));
  ManifoldManifold *m = manifold_extrude(manifold_alloc_manifold(), p, Double_val(h), Int_val(div),
                                         Double_val(twist), Double_val(scale), Double_val(scale));
  manifold_delete_polygons(p);
  return wrap_m(m);
}
CAMLprim value cc_revolve(value cs, value seg, value deg) {
  ManifoldPolygons *p = manifold_cross_section_to_polygons(manifold_alloc_polygons(), CS_val(cs));
  ManifoldManifold *m = manifold_revolve(manifold_alloc_manifold(), p, Int_val(seg), Double_val(deg));
  manifold_delete_polygons(p);
  return wrap_m(m);
}

#define M_BINOP(name, fn) \
  CAMLprim value name(value a, value b) { return wrap_m(fn(manifold_alloc_manifold(), M_val(a), M_val(b))); }
M_BINOP(cc_union, manifold_union)
M_BINOP(cc_difference, manifold_difference)
M_BINOP(cc_intersection, manifold_intersection)

/* m : float array de 16 coefficients, colonne majeure (Frame.to_matrix). */
CAMLprim value cc_transform(value m, value a) {
#define C(i) Double_flat_field(a, i)
  return wrap_m(manifold_transform(manifold_alloc_manifold(), M_val(m), C(0), C(1), C(2), C(4), C(5), C(6), C(8),
                                   C(9), C(10), C(12), C(13), C(14)));
#undef C
}
CAMLprim value cc_mirror(value m, value x, value y, value z) {
  return wrap_m(manifold_mirror(manifold_alloc_manifold(), M_val(m), Double_val(x), Double_val(y), Double_val(z)));
}
CAMLprim value cc_scale(value m, value x, value y, value z) {
  return wrap_m(manifold_scale(manifold_alloc_manifold(), M_val(m), Double_val(x), Double_val(y), Double_val(z)));
}
/* Maillage (sommets x y z à plat, triangles) vers solide ; en cas d'erreur (pas une variété
   close), solide vide. */
CAMLprim value cc_of_mesh(value vs, value ts) {
  size_t nv = Wosize_val(vs) / Double_wosize / 3, nt = Wosize_val(ts) / 3;
  float *props = malloc(sizeof(float) * 3 * (nv ? nv : 1));
  uint32_t *tris = malloc(sizeof(uint32_t) * 3 * (nt ? nt : 1));
  for (size_t i = 0; i < 3 * nv; i++) props[i] = (float)Double_flat_field(vs, i);
  for (size_t i = 0; i < 3 * nt; i++) tris[i] = (uint32_t)Long_val(Field(ts, i));
  ManifoldMeshGL *g = manifold_meshgl(manifold_alloc_meshgl(), props, nv, 3, tris, nt);
  free(props); free(tris);
  ManifoldManifold *m = manifold_of_meshgl(manifold_alloc_manifold(), g);
  manifold_delete_meshgl(g);
  if (manifold_status(m) != MANIFOLD_NO_ERROR) {
    manifold_delete_manifold(m);
    m = manifold_empty(manifold_alloc_manifold());
  }
  return wrap_m(m);
}

CAMLprim value cc_is_empty(value m) { return Val_bool(manifold_is_empty(M_val(m))); }
CAMLprim value cc_volume(value m) { return caml_copy_double(manifold_volume(M_val(m))); }
CAMLprim value cc_genus(value m) { return Val_int(manifold_genus(M_val(m))); }

CAMLprim value cc_bbox(value m) {
  CAMLparam1(m);
  CAMLlocal1(r);
  ManifoldBox *b = manifold_bounding_box(manifold_alloc_box(), M_val(m));
  ManifoldVec3 lo = manifold_box_min(b), hi = manifold_box_max(b);
  manifold_delete_box(b);
  r = caml_alloc_float_array(6);
  Store_double_flat_field(r, 0, lo.x); Store_double_flat_field(r, 1, lo.y); Store_double_flat_field(r, 2, lo.z);
  Store_double_flat_field(r, 3, hi.x); Store_double_flat_field(r, 4, hi.y); Store_double_flat_field(r, 5, hi.z);
  CAMLreturn(r);
}

/* (vertices : float array [x;y;z;...], triangles : int array) */
CAMLprim value cc_mesh(value m) {
  CAMLparam1(m);
  CAMLlocal3(vs, ts, r);
  ManifoldMeshGL *g = manifold_get_meshgl(manifold_alloc_meshgl(), M_val(m));
  int np = manifold_meshgl_num_prop(g), nv = manifold_meshgl_num_vert(g), nt = manifold_meshgl_num_tri(g);
  float *props = malloc(sizeof(float) * (size_t)np * (nv ? nv : 1));
  uint32_t *tris = malloc(sizeof(uint32_t) * 3 * (size_t)(nt ? nt : 1));
  manifold_meshgl_vert_properties(props, g);
  manifold_meshgl_tri_verts(tris, g);
  manifold_delete_meshgl(g);
  vs = caml_alloc_float_array(3 * nv);
  for (int i = 0; i < nv; i++)
    for (int k = 0; k < 3; k++) Store_double_flat_field(vs, 3 * i + k, props[i * np + k]);
  ts = caml_alloc(3 * nt, 0);
  for (int i = 0; i < 3 * nt; i++) Store_field(ts, i, Val_int(tris[i]));
  free(props);
  free(tris);
  r = caml_alloc_tuple(2);
  Store_field(r, 0, vs);
  Store_field(r, 1, ts);
  CAMLreturn(r);
}

CAMLprim value cc_available(value unit) { return Val_true; }

#else /* Manifold absent : la bibliothèque se lie mais chaque appel échoue. */

#define MISSING caml_failwith("Kernel_manifold_native : Manifold absent (scripts/build-manifold.sh)")
CAMLprim value cc_available(value unit) { return Val_false; }
CAMLprim value cc_cs_of_contours(value a0) { MISSING; return Val_unit; }
CAMLprim value cc_cs_union(value a0, value a1) { MISSING; return Val_unit; }
CAMLprim value cc_cs_difference(value a0, value a1) { MISSING; return Val_unit; }
CAMLprim value cc_cs_intersection(value a0, value a1) { MISSING; return Val_unit; }
CAMLprim value cc_cs_offset(value a0, value a1) { MISSING; return Val_unit; }
CAMLprim value cc_cs_area(value a0) { MISSING; return Val_unit; }
CAMLprim value cc_cube(value a0, value a1, value a2) { MISSING; return Val_unit; }
CAMLprim value cc_cylinder(value a0, value a1, value a2) { MISSING; return Val_unit; }
CAMLprim value cc_sphere(value a0, value a1) { MISSING; return Val_unit; }
CAMLprim value cc_extrude(value a0, value a1, value a2, value a3, value a4) { MISSING; return Val_unit; }
CAMLprim value cc_revolve(value a0, value a1, value a2) { MISSING; return Val_unit; }
CAMLprim value cc_union(value a0, value a1) { MISSING; return Val_unit; }
CAMLprim value cc_difference(value a0, value a1) { MISSING; return Val_unit; }
CAMLprim value cc_intersection(value a0, value a1) { MISSING; return Val_unit; }
CAMLprim value cc_transform(value a0, value a1) { MISSING; return Val_unit; }
CAMLprim value cc_mirror(value a0, value a1, value a2, value a3) { MISSING; return Val_unit; }
CAMLprim value cc_scale(value a0, value a1, value a2, value a3) { MISSING; return Val_unit; }
CAMLprim value cc_of_mesh(value a0, value a1) { MISSING; return Val_unit; }
CAMLprim value cc_is_empty(value a0) { MISSING; return Val_unit; }
CAMLprim value cc_volume(value a0) { MISSING; return Val_unit; }
CAMLprim value cc_genus(value a0) { MISSING; return Val_unit; }
CAMLprim value cc_bbox(value a0) { MISSING; return Val_unit; }
CAMLprim value cc_mesh(value a0) { MISSING; return Val_unit; }
#endif
