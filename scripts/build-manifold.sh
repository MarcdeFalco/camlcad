#!/bin/sh
# Compile Manifold (même version que manifold-3d côté JS) en bibliothèques
# statiques, avec la liaison C, dans $PREFIX (défaut : _manifold/ à la racine).
# Prérequis : cmake, un compilateur C++17, git. Clipper2 est téléchargé par cmake.
set -eu
VERSION=${MANIFOLD_VERSION:-v3.2.1}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PREFIX=${PREFIX:-$ROOT/_manifold}
SRC=$PREFIX/src
if [ -f "$PREFIX/lib/libmanifoldc.a" ]; then echo "Manifold déjà installé dans $PREFIX"; exit 0; fi
mkdir -p "$PREFIX"
[ -d "$SRC" ] || git clone -q --depth 1 --branch "$VERSION" https://github.com/elalish/manifold.git "$SRC"
cmake -S "$SRC" -B "$SRC/build" \
  -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX="$PREFIX" -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
  -DBUILD_SHARED_LIBS=OFF -DMANIFOLD_CBIND=ON -DMANIFOLD_PAR=OFF -DMANIFOLD_TEST=OFF \
  -DMANIFOLD_PYBIND=OFF -DMANIFOLD_JSBIND=OFF -DMANIFOLD_EXPORT=OFF -DMANIFOLD_CROSS_SECTION=ON
cmake --build "$SRC/build" -j 4
cmake --install "$SRC/build"
cp "$SRC/build/_deps/clipper2-build/libClipper2.a" "$PREFIX/lib/"
echo "Manifold $VERSION installé dans $PREFIX"
